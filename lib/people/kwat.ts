import { unstable_cache } from "next/cache";
import { postUrl } from "../posts";
import { getAllPlaces } from "../places/server";
import { getSupabaseAdminClient } from "../supabase/admin";
import { PULSE_HOURS } from "./rules";
import { peopleByIds } from "./server";
import type { KwatItem, KwatPlace, PulseView, TipView } from "./types";

// What members add around a place besides reviews (server only): the live
// news ("ouvert", "ça bouge", "coupure"), the sentence for the taxi driver
// and the way in words; and "Ça bouge au kwat", all of it as it happens.

export const tipsTag = (spotId: string) => `tips:${spotId}`;

// ---------------------------------------------------------------- live news

// The last hours at a place, by kind: how many said it, when, and who. Of
// "open" and "closed", only the latest stands.
export async function loadPulses(spotId: string): Promise<PulseView[]> {
    const since = new Date(Date.now() - PULSE_HOURS * 3_600_000).toISOString();
    const { data, error } = await getSupabaseAdminClient().from("nt_place_pulses").select("kind,profile_id,created_at").eq("spot_id", spotId).gte("created_at", since).order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    const groups = new Map<string, { count: number; last: string; ids: string[] }>();
    for (const row of data ?? []) {
        const group = groups.get(row.kind as string) ?? { count: 0, last: row.created_at as string, ids: [] };
        group.count++;
        if (!group.ids.includes(row.profile_id as string) && group.ids.length < 3) group.ids.push(row.profile_id as string);
        groups.set(row.kind as string, group);
    }
    const open = groups.get("open");
    const closed = groups.get("closed");
    if (open && closed) groups.delete(open.last > closed.last ? "closed" : "open");
    const people = await peopleByIds([...groups.values()].flatMap((group) => group.ids));
    return [...groups.entries()]
        .map(([kind, group]) => ({ kind, count: group.count, last: group.last, people: group.ids.map((id) => people.get(id)).filter((person): person is NonNullable<typeof person> => Boolean(person)) }))
        .sort((a, b) => b.last.localeCompare(a.last));
}

// ---------------------------------------------------------------- ways

type TipRow = { id: string; kind: string; body: string; profile_id: string; helpful: number; status: string; created_at: string };

export async function loadTips(spotId: string, viewer: string | null): Promise<TipView[]> {
    const db = getSupabaseAdminClient();
    const columns = "id,kind,body,profile_id,helpful,status,created_at";
    const [published, own, votes] = await Promise.all([
        db.from("nt_place_tips").select(columns).eq("spot_id", spotId).eq("status", "PUBLISHED").order("helpful", { ascending: false }).order("created_at", { ascending: false }).limit(40),
        viewer ? db.from("nt_place_tips").select(columns).eq("spot_id", spotId).eq("profile_id", viewer).eq("status", "PENDING") : null,
        viewer ? db.from("nt_tip_votes").select("tip_id").eq("profile_id", viewer) : null,
    ]);
    if (published.error) throw published.error;
    const rows = [...((published.data ?? []) as TipRow[]), ...((own?.data ?? []) as TipRow[])];
    const people = await peopleByIds(rows.map((row) => row.profile_id));
    const voted = new Set((votes?.data ?? []).map((vote) => vote.tip_id as string));
    return rows
        .filter((row) => people.has(row.profile_id))
        .map((row) => ({
            id: row.id,
            kind: row.kind === "way" ? "way" : "taxi",
            body: row.body,
            person: people.get(row.profile_id)!,
            helpful: row.helpful ?? 0,
            createdAt: row.created_at,
            mine: row.profile_id === viewer,
            voted: voted.has(row.id),
            pending: row.status !== "PUBLISHED",
        }));
}

// What everyone sees on the place page, until someone adds or votes.
export function getPlaceTips(spotId: string) {
    return unstable_cache(() => loadTips(spotId, null), ["tips:v1", spotId], { revalidate: 900, tags: [tipsTag(spotId)] })();
}

// ---------------------------------------------------------------- the feed

const SHOWN_PULSES = new Set(["open", "lively", "full", "power_cut"]);

async function loadFeed(city: string | null, area: string | null, limit: number): Promise<KwatItem[]> {
    const db = getSupabaseAdminClient();
    const places = new Map<string, KwatPlace>();
    for (const place of await getAllPlaces()) {
        if (!city || place.city === city) places.set(place.id, { slug: place.slug, name: place.name, neighborhood: place.neighborhood, city: place.city, cover: place.cover });
    }
    const day = new Date(Date.now() - 24 * 3_600_000).toISOString();
    const [reviews, photos, pulses, tips, outings] = await Promise.all([
        db.from("nt_reviews").select("id,spot_id,profile_id,rating,comment,updated_at").eq("status", "PUBLISHED").not("profile_id", "is", null).order("updated_at", { ascending: false }).limit(80),
        db.from("nt_spot_posts").select("id,spot_id,profile_id,kind,media_path,poster_path,caption,decided_at").eq("status", "APPROVED").not("profile_id", "is", null).order("decided_at", { ascending: false }).limit(40),
        db.from("nt_place_pulses").select("id,spot_id,profile_id,kind,created_at").gte("created_at", day).order("created_at", { ascending: false }).limit(80),
        db.from("nt_place_tips").select("id,spot_id,profile_id,body,created_at").eq("status", "PUBLISHED").order("created_at", { ascending: false }).limit(40),
        db.from("nt_outings").select("id,spot_id,profile_id,mood,body,likes,published_at,nt_outing_media(kind,media_path,poster_path,sort)").eq("status", "PUBLISHED").order("published_at", { ascending: false }).limit(40),
    ]);
    const here = (spot: unknown) => places.get(spot as string);
    const items: (KwatItem & { by: string | null })[] = [];

    for (const row of reviews.data ?? []) {
        const place = here(row.spot_id);
        if (place) items.push({ type: "review", id: row.id as string, at: row.updated_at as string, person: null as never, by: row.profile_id as string, place, rating: row.rating as number, body: (row.comment as string | null) ?? null });
    }
    for (const row of photos.data ?? []) {
        const place = here(row.spot_id);
        if (place) items.push({ type: "photo", id: row.id as string, at: row.decided_at as string, person: null, by: row.profile_id as string, place, url: postUrl((row.poster_path as string | null) ?? (row.media_path as string)), kind: row.kind === "video" ? "video" : "photo", caption: (row.caption as string | null) ?? null });
    }
    // One live news per place and kind: the latest.
    const seen = new Set<string>();
    for (const row of pulses.error ? [] : (pulses.data ?? [])) {
        const place = here(row.spot_id);
        const key = `${row.spot_id}:${row.kind}`;
        if (!place || !SHOWN_PULSES.has(row.kind as string) || seen.has(key)) continue;
        seen.add(key);
        items.push({ type: "pulse", id: row.id as string, at: row.created_at as string, person: null as never, by: row.profile_id as string, place, pulse: row.kind as string });
    }
    for (const row of tips.error ? [] : (tips.data ?? [])) {
        const place = here(row.spot_id);
        if (place) items.push({ type: "tip", id: row.id as string, at: row.created_at as string, person: null as never, by: row.profile_id as string, place, body: row.body as string });
    }

    for (const row of outings.error ? [] : ((outings.data ?? []) as Record<string, unknown>[])) {
        const place = here(row.spot_id);
        const files = ((row.nt_outing_media as { kind: string; media_path: string; poster_path: string | null; sort: number }[] | null) ?? []).sort((a, b) => a.sort - b.sort);
        const first = files[0];
        if (!place || !first) continue;
        const cover = postUrl(first.kind === "video" ? (first.poster_path ?? first.media_path) : first.media_path);
        items.push({ type: "outing", id: row.id as string, at: row.published_at as string, person: null as never, by: row.profile_id as string, place, cover, count: files.length, mood: (row.mood as string | null) ?? null, body: (row.body as string | null) ?? null, likes: Number(row.likes ?? 0) });
    }

    // Newest first; what happens in their own neighbourhood comes forward by six hours.
    const near = (item: KwatItem) => (area && item.place.neighborhood && item.place.neighborhood.toLowerCase() === area.toLowerCase() ? 6 * 3_600_000 : 0);
    items.sort((a, b) => new Date(b.at).getTime() + near(b) - (new Date(a.at).getTime() + near(a)));
    const chosen = items.slice(0, limit);
    const people = await peopleByIds(chosen.map((item) => item.by ?? ""));
    return chosen
        .map(({ by, ...item }) => ({ ...item, person: by ? (people.get(by) ?? null) : null }) as KwatItem)
        .filter((item) => item.type === "photo" || item.person !== null);
}

export function getFeed(city: string | null, area: string | null, limit = 24) {
    return unstable_cache(() => loadFeed(city, area, limit), ["kwat:v1", city ?? "all", area ?? "", String(limit)], { revalidate: 60, tags: ["kwat"] })();
}
