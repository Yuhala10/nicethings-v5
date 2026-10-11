import type { SupabaseClient } from "@supabase/supabase-js";
import { selectAll } from "../admin-places";
import { recheckOnMap } from "./osm";
import { qualityChecks, type Found } from "./quality";
import { loadPlaces, readSettings, writePlace, type AtlasAction, type AtlasIssue } from "./store";

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
    const fixed = existing.filter((issue) => issue.status === "open" && !seen.has(issue.fingerprint)).map((issue) => issue.id);
    for (let from = 0; from < fixed.length; from += 200) {
        const { error } = await db.from("nt_atlas_issues").update({ status: "fixed", resolved_at: now }).in("id", fixed.slice(from, from + 200));
        if (error) throw error;
    }

    return { open: rows.filter((row) => row.status === "open").length, added: unique.filter((item) => !known.has(item.fingerprint)).length, fixed: fixed.length };
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
            db.from("nt_atlas_actions").select("spot_id,kind,status").in("kind", ["place.fill", "place.hide"]).range(from, to)
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
        for (let from = 0; from < actions.length; from += 200) {
            const { error } = await db.from("nt_atlas_actions").insert(actions.slice(from, from + 200));
            if (error) throw error;
        }

        // ---- The platform itself -----------------------------------------
        const issues = await saveIssues(db, await qualityChecks(db, places, map.edited));

        const stats = {
            published: published.length,
            map_asked: map.asked,
            map_answered: map.answered,
            map_suspicious: suspicious ? 1 : 0,
            filled,
            proposed: actions.length - filled,
            issues_open: issues.open,
            issues_new: issues.added,
            issues_fixed: issues.fixed,
        };
        const finished = await db.from("nt_atlas_runs").update({ status: "done", stats, finished_at: new Date().toISOString() }).eq("id", runId);
        if (finished.error) throw finished.error;
        return { ran: true, stats, changed: filled > 0 };
    } catch (error) {
        const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error);
        await db.from("nt_atlas_runs").update({ status: "failed", error: message.slice(0, 500), finished_at: new Date().toISOString() }).eq("id", runId);
        throw error;
    }
}
