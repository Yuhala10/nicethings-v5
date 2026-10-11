import type { SupabaseClient } from "@supabase/supabase-js";
import { selectAll } from "../admin-places";
import { SITE_URL } from "../i18n/config";
import { firstPhone } from "../places/display";
import { recheckOnMap } from "./osm";
import { notAName, qualityChecks, type Found } from "./quality";
import { loadPlaces, readSettings, writePlace, type AtlasAction, type AtlasIssue, type AtlasPlace } from "./store";

// One shift of Atlas: compare the catalogue with the live open map, fill
// what the map can prove, propose what needs a person's eye, and go over
// the platform for problems. No paid service is used here.

// The night shift runs once a day; a second call the same day does nothing.
const HOURS_BETWEEN_SHIFTS = 20;

export type Shift = { ran: false; why: "paused" | "recent" } | { ran: true; stats: Record<string, number>; changed: boolean };

// The same problem found again updates its line; a problem that is no
// longer found has been fixed, and is closed.
async function saveIssues(db: SupabaseClient, found: Found[]) {
    const existing = await selectAll<AtlasIssue>((from, to) => db.from("nt_atlas_issues").select("*").range(from, to));
    const known = new Map(existing.map((issue) => [issue.fingerprint, issue]));
    const now = new Date().toISOString();
    const unique = [...new Map(found.map((item) => [item.fingerprint, item])).values()];

    const rows = unique.map((item) => {
        const before = known.get(item.fingerprint);
        return {
            ...item,
            // What the team chose to ignore stays ignored.
            status: before?.status === "dismissed" ? "dismissed" : "open",
            times_seen: (before?.times_seen ?? 0) + 1,
            first_seen_at: before?.first_seen_at ?? now,
            last_seen_at: now,
            resolved_at: null,
        };
    });
    for (let from = 0; from < rows.length; from += 200) {
        const { error } = await db.from("nt_atlas_issues").upsert(rows.slice(from, from + 200), { onConflict: "fingerprint" });
        if (error) throw error;
    }

    const seen = new Set(unique.map((item) => item.fingerprint));
    // What visitors' browsers report (app/api/health) is not among the
    // shift's own checks: it stays open until a person closes it.
    const fixed = existing.filter((issue) => issue.status === "open" && issue.area !== "health" && !seen.has(issue.fingerprint)).map((issue) => issue.id);
    for (let from = 0; from < fixed.length; from += 200) {
        const { error } = await db.from("nt_atlas_issues").update({ status: "fixed", resolved_at: now }).in("id", fixed.slice(from, from + 200));
        if (error) throw error;
    }

    return { open: rows.filter((row) => row.status === "open").length, added: unique.filter((item) => !known.has(item.fingerprint)).length, fixed: fixed.length };
}

// How much a listing holds: of two listings for one place, the fuller one
// stays.
function weight(place: AtlasPlace) {
    const facts = [place.phone, place.website, place.instagram, place.opening_time, place.minimum_price, place.cuisine, place.neighborhood].filter(Boolean).length;
    return facts + (place.verified ? 6 : 0) + (place.source !== "osm" ? 3 : 0);
}

const FIELD_NAMES: Record<string, string> = { phone: "téléphone", whatsapp: "WhatsApp", website: "site web", instagram: "Instagram", cuisine: "cuisine", opening_time: "horaires" };

export async function runAtlas(db: SupabaseClient, { kind, force = false }: { kind: "night" | "manual"; force?: boolean }): Promise<Shift> {
    if (!force) {
        if ((await readSettings(db)).paused) return { ran: false, why: "paused" };
        const { data: last, error } = await db.from("nt_atlas_runs").select("started_at").neq("status", "failed").order("started_at", { ascending: false }).limit(1).maybeSingle();
        if (error) throw error;
        if (last && Date.now() - new Date(last.started_at).getTime() < HOURS_BETWEEN_SHIFTS * 3_600_000) return { ran: false, why: "recent" };
    }

    const started = await db.from("nt_atlas_runs").insert({ kind }).select("id").single();
    if (started.error) throw started.error;
    const runId = started.data.id as string;

    try {
        const places = await loadPlaces(db);
        const published = places.filter((place) => place.status === "APPROVED");

        // ---- The open map ------------------------------------------------
        const map = await recheckOnMap(published);
        const past = await selectAll<Pick<AtlasAction, "spot_id" | "kind" | "status">>((from, to) =>
            db.from("nt_atlas_actions").select("spot_id,kind,status").in("kind", ["place.fill", "place.hide", "place.duplicate", "place.clean", "place.unnamed"]).range(from, to)
        );
        // What a person declined is never proposed again, what a person
        // undid is never redone, and a proposal still waiting is not repeated.
        const settled = new Set(past.filter((action) => action.status !== "applied").map((action) => `${action.kind}:${action.spot_id}`));

        const gone = map.findings.filter((finding) => finding.gone);
        // Many places vanishing at once is the map service failing, not a
        // city closing: nothing is proposed that night.
        const suspicious = gone.length > Math.max(25, map.asked * 0.03);
        const now = new Date().toISOString();
        const actions: Record<string, unknown>[] = [];
        let filled = 0;

        for (const finding of map.findings) {
            const { place } = finding;
            const evidence = [{ url: finding.url, title: "OpenStreetMap" }];
            if (finding.gone) {
                if (suspicious || settled.has(`place.hide:${place.id}`)) continue;
                actions.push({
                    run_id: runId,
                    desk: "inspector",
                    kind: "place.hide",
                    spot_id: place.id,
                    title: `Retirer « ${place.name} » du site ?`,
                    detail:
                        finding.gone.why === "removed"
                            ? "Les contributeurs d'OpenStreetMap ont retiré ce lieu de la carte. Il a peut-être fermé, ou il a été redessiné sous une autre forme."
                            : "Sur OpenStreetMap, ce lieu est maintenant marqué comme fermé ou désaffecté.",
                    evidence,
                    before: { status: place.status },
                    after: { status: "CLOSED" },
                    confidence: finding.gone.why === "retired" ? 0.8 : 0.6,
                    status: "proposed",
                });
            } else if (finding.fill && !settled.has(`place.fill:${place.id}`)) {
                const before = Object.fromEntries(Object.keys(finding.fill).map((key) => [key, (place as Record<string, unknown>)[key] ?? null]));
                await writePlace(db, place.id, finding.fill);
                filled++;
                const fields = Object.keys(finding.fill).map((key) => FIELD_NAMES[key]).filter(Boolean).join(", ");
                actions.push({
                    run_id: runId,
                    desk: "inspector",
                    kind: "place.fill",
                    spot_id: place.id,
                    title: `« ${place.name} » : ${fields} ajouté(s) depuis la carte`,
                    detail: null,
                    evidence,
                    before,
                    after: finding.fill,
                    status: "applied",
                    decided_at: now,
                    decided_by: "atlas",
                });
            }
        }
        // ---- Housekeeping -------------------------------------------------
        // Values that are plainly not what the field is for are put right
        // on the spot; each one is logged and can be undone.
        let cleaned = 0;
        for (const place of published) {
            const logged = { run_id: runId, desk: "inspector", spot_id: place.id, evidence: [], status: "applied", decided_at: now, decided_by: "atlas" };
            if (place.phone && !firstPhone(place.phone) && !settled.has(`place.clean:${place.id}`)) {
                await writePlace(db, place.id, { phone: null });
                actions.push({ ...logged, kind: "place.clean", title: `« ${place.name} » : numéro inutilisable retiré (« ${place.phone} »)`, detail: null, before: { phone: place.phone }, after: { phone: null } });
                place.phone = null;
                cleaned++;
            }
            if (notAName(place.name) && !settled.has(`place.unnamed:${place.id}`)) {
                await writePlace(db, place.id, { status: "DRAFT" });
                actions.push({
                    ...logged,
                    kind: "place.unnamed",
                    title: `« ${place.name} » (${place.city}) repassé en brouillon : ce n'est pas un nom de lieu`,
                    detail: "La carte ouverte donne un type de lieu à la place du nom. La fiche attend son vrai nom dans les brouillons.",
                    before: { status: place.status },
                    after: { status: "DRAFT" },
                });
                place.status = "DRAFT";
                cleaned++;
            }
        }

        // ---- The platform itself -----------------------------------------
        const found = await qualityChecks(db, places, map.edited);
        const issues = await saveIssues(db, found);

        // Two listings for one place: propose taking the thinner one down.
        const byId = new Map(places.map((place) => [place.id, place]));
        const page = (place: AtlasPlace) => ({ url: `${SITE_URL}/fr/p/${place.slug}`, title: place.name });
        const hidden = new Set<string>();
        for (const item of found) {
            if (item.evidence.code !== "duplicate") continue;
            const a = byId.get((item.evidence.a as { id: string }).id);
            const b = byId.get((item.evidence.b as { id: string }).id);
            if (!a || !b) continue;
            const [kept, thinner] = weight(a) >= weight(b) ? [a, b] : [b, a];
            if (hidden.has(thinner.id) || hidden.has(kept.id) || settled.has(`place.duplicate:${thinner.id}`)) continue;
            hidden.add(thinner.id);
            actions.push({
                run_id: runId,
                desk: "inspector",
                kind: "place.duplicate",
                spot_id: thinner.id,
                title: `« ${thinner.name} » fait doublon avec « ${kept.name} » (${thinner.city}) : retirer cette fiche ?`,
                detail: `Même type de lieu, même nom, à ${item.evidence.meters} m l'un de l'autre. La fiche gardée est la plus complète.`,
                evidence: [page(kept), page(thinner)],
                before: { status: thinner.status },
                after: { status: "REJECTED" },
                confidence: 0.7,
                status: "proposed",
            });
        }

        for (let from = 0; from < actions.length; from += 200) {
            const { error } = await db.from("nt_atlas_actions").insert(actions.slice(from, from + 200));
            if (error) throw error;
        }

        const stats = {
            published: published.length,
            map_asked: map.asked,
            map_answered: map.answered,
            map_suspicious: suspicious ? 1 : 0,
            filled,
            cleaned,
            proposed: actions.filter((action) => action.status === "proposed").length,
            issues_open: issues.open,
            issues_new: issues.added,
            issues_fixed: issues.fixed,
        };
        const finished = await db.from("nt_atlas_runs").update({ status: "done", stats, finished_at: new Date().toISOString() }).eq("id", runId);
        if (finished.error) throw finished.error;
        return { ran: true, stats, changed: filled + cleaned > 0 };
    } catch (error) {
        const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error);
        await db.from("nt_atlas_runs").update({ status: "failed", error: message.slice(0, 500), finished_at: new Date().toISOString() }).eq("id", runId);
        throw error;
    }
}
