import { postUrl } from "../posts";
import { getAllPlaces } from "../places/server";
import { getSupabaseAdminClient } from "../supabase/admin";
import { peopleByIds } from "./server";
import type { KwatPlace, OutingMedia, OutingView } from "./types";

// "Ma sortie" (server only): outings with the face of who went, the place
// they were at, their photos or video, and what the person reading did
// with them (liked, going too).

export const OUTING_COLUMNS = "id,profile_id,spot_id,mood,price_paid,company,body,status,likes,comments,goers,created_at,published_at";

type Row = {
    id: string;
    profile_id: string;
    spot_id: string;
    mood: string | null;
    sound?: string | null;
    price_paid: number | null;
    company: string | null;
    body: string | null;
    status: OutingView["status"];
    likes: number;
    comments: number;
    goers: number;
    created_at: string;
    published_at: string | null;
};

type Where = { ids?: string[]; spotId?: string; profileId?: string; profiles?: string[]; limit?: number; viewer?: string | null; withPending?: boolean };

export async function placesById() {
    const places = new Map<string, KwatPlace>();
    for (const place of await getAllPlaces()) places.set(place.id, { slug: place.slug, name: place.name, neighborhood: place.neighborhood, city: place.city, cover: place.cover });
    return places;
}

// With script 015, an outing's soundtrack.
let soundColumn: Promise<boolean> | null = null;
export function hasOutingSound() {
    soundColumn ??= Promise.resolve(getSupabaseAdminClient().from("nt_outings").select("sound").limit(1)).then((read) => !read.error);
    return soundColumn;
}

export async function loadOutings({ ids, spotId, profileId, profiles, limit = 30, viewer = null, withPending = false }: Where): Promise<OutingView[]> {
    const db = getSupabaseAdminClient();
    let query = db.from("nt_outings").select((await hasOutingSound()) ? `${OUTING_COLUMNS},sound` : OUTING_COLUMNS);
    if (ids) query = query.in("id", ids);
    if (spotId) query = query.eq("spot_id", spotId);
    if (profileId) query = query.eq("profile_id", profileId);
    if (profiles) query = query.in("profile_id", profiles.length ? profiles : ["00000000-0000-0000-0000-000000000000"]);
    // The public sees what is out; its author also sees what waits for the team.
    query = withPending ? query.in("status", ["PUBLISHED", "PENDING"]) : query.eq("status", "PUBLISHED");
    const { data, error } = await query.order("published_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    const rows = ((data ?? []) as unknown as Row[]).filter((row) => row.status === "PUBLISHED" || row.profile_id === viewer || ids);
    if (!rows.length) return [];

    const outingIds = rows.map((row) => row.id);
    const [media, people, places, liked, going] = await Promise.all([
        db.from("nt_outing_media").select("outing_id,kind,media_path,poster_path,width,height,sort").in("outing_id", outingIds).order("sort", { ascending: true }),
        peopleByIds(rows.map((row) => row.profile_id)),
        placesById(),
        viewer ? db.from("nt_outing_likes").select("outing_id").eq("profile_id", viewer).in("outing_id", outingIds) : null,
        viewer ? db.from("nt_outing_goers").select("outing_id").eq("profile_id", viewer).in("outing_id", outingIds) : null,
    ]);
    const files = new Map<string, OutingMedia[]>();
    for (const item of media.data ?? []) {
        const list = files.get(item.outing_id as string) ?? [];
        list.push({ kind: item.kind === "video" ? "video" : "photo", url: postUrl(item.media_path as string), poster: item.poster_path ? postUrl(item.poster_path as string) : null, width: (item.width as number | null) ?? null, height: (item.height as number | null) ?? null });
        files.set(item.outing_id as string, list);
    }
    const likedSet = new Set((liked?.data ?? []).map((row) => row.outing_id as string));
    const goingSet = new Set((going?.data ?? []).map((row) => row.outing_id as string));

    return rows
        .filter((row) => people.has(row.profile_id) && places.has(row.spot_id) && files.get(row.id)?.length)
        .map((row) => ({
            id: row.id,
            person: people.get(row.profile_id)!,
            place: places.get(row.spot_id)!,
            mood: row.mood,
            sound: row.sound ?? null,
            pricePaid: row.price_paid,
            company: row.company,
            body: row.body,
            media: files.get(row.id)!,
            likes: row.likes ?? 0,
            comments: row.comments ?? 0,
            goers: row.goers ?? 0,
            status: row.status,
            at: row.published_at ?? row.created_at,
            mine: row.profile_id === viewer,
            liked: likedSet.has(row.id),
            going: goingSet.has(row.id),
        }));
}

// The people a member follows.
export async function followingOf(profileId: string) {
    const { data } = await getSupabaseAdminClient().from("nt_follows").select("followed_id").eq("follower_id", profileId).limit(1000);
    return (data ?? []).map((row) => row.followed_id as string);
}
