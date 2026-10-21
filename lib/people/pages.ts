import { revalidateTag, unstable_cache } from "next/cache";
import { postUrl } from "../posts";
import { getPlacesBySlugs } from "../places/server";
import type { PlaceSummary } from "../places/types";
import { getSupabaseAdminClient } from "../supabase/admin";
import { REVIEW_COLUMNS } from "./reviews";
import { PROFILE_COLUMNS, statsOf, toPerson, type ProfileRow } from "./server";
import { seriesOf } from "./series";
import type { Person, Series } from "./types";
import type { Stats } from "./rules";

// A profile's public page: who they are, their top 3, their reviews (with
// the place each is about) and their photos on the walls.

export const personTag = (handle: string) => `person:${handle}`;

// Their page shows the change at once.
export function refreshPerson(handle: string) {
    revalidateTag(personTag(handle), { expire: 0 });
}

export type ProfilePage = {
    person: Person;
    bio: string | null;
    createdAt: string;
    stats: Stats;
    // La série (null before script 014).
    series: Series | null;
    top: PlaceSummary[];
    reviews: { id: string; rating: number; body: string | null; tags: string[]; pricePaid: number | null; company: string | null; helpful: number; createdAt: string; place: { slug: string; name: string; neighborhood: string | null } }[];
    photos: { id: string; kind: "photo" | "video"; url: string; poster: string | null; caption: string | null; likes: number; place: { slug: string; name: string } }[];
};

async function loadProfilePage(handle: string): Promise<ProfilePage | null> {
    const db = getSupabaseAdminClient();
    const found = await db.from("nt_profiles").select(PROFILE_COLUMNS).eq("handle", handle).eq("status", "ACTIVE").maybeSingle();
    if (found.error) throw found.error;
    const row = found.data as ProfileRow | null;
    if (!row) return null;

    const [stats, reviews, photos, top, best] = await Promise.all([
        statsOf([row.id]),
        db.from("nt_reviews").select(`${REVIEW_COLUMNS},spot_id`).eq("profile_id", row.id).eq("status", "PUBLISHED").order("updated_at", { ascending: false }).limit(60),
        db.from("nt_spot_posts").select("id,kind,media_path,poster_path,caption,likes,spot_id").eq("profile_id", row.id).eq("status", "APPROVED").order("decided_at", { ascending: false }).limit(60),
        row.top_places?.length ? getPlacesBySlugs(row.top_places).catch(() => []) : [],
        db.from("nt_profiles").select("series_best").eq("id", row.id).maybeSingle(),
    ]);
    const series = best.error ? null : await seriesOf(row.id, Number(best.data?.series_best ?? 0)).catch(() => null);

    const spotIds = [...new Set([...(reviews.data ?? []), ...(photos.data ?? [])].map((item) => item.spot_id as string))];
    const spots = spotIds.length ? await db.from("nt_spots").select("id,slug,name,neighborhood").in("id", spotIds).eq("status", "APPROVED") : null;
    const placeOf = new Map((spots?.data ?? []).map((spot) => [spot.id as string, { slug: spot.slug as string, name: spot.name as string, neighborhood: (spot.neighborhood as string | null) ?? null }]));
    const own = stats.get(row.id) ?? { reviews: 0, photos: 0, comments: 0, cheers: 0 };

    return {
        person: toPerson(row, own),
        bio: row.bio,
        createdAt: row.created_at,
        stats: own,
        series,
        // In the order they chose.
        top: (row.top_places ?? []).map((slug) => (top as PlaceSummary[]).find((place) => place.slug === slug)).filter((place): place is PlaceSummary => Boolean(place)),
        reviews: (reviews.data ?? [])
            .filter((review) => placeOf.has(review.spot_id as string))
            .map((review) => ({
                id: review.id as string,
                rating: review.rating as number,
                body: (review.comment as string | null) ?? null,
                tags: (review.tags as string[] | null) ?? [],
                pricePaid: (review.price_paid as number | null) ?? null,
                company: (review.company as string | null) ?? null,
                helpful: (review.helpful as number | null) ?? 0,
                createdAt: (review.updated_at as string | null) ?? (review.created_at as string),
                place: placeOf.get(review.spot_id as string)!,
            })),
        photos: (photos.data ?? [])
            .filter((post) => placeOf.has(post.spot_id as string))
            .map((post) => ({
                id: post.id as string,
                kind: post.kind === "video" ? "video" : "photo",
                url: postUrl(post.media_path as string),
                poster: post.poster_path ? postUrl(post.poster_path as string) : null,
                caption: (post.caption as string | null) ?? null,
                likes: (post.likes as number | null) ?? 0,
                place: placeOf.get(post.spot_id as string)!,
            })),
    };
}

export function getProfilePage(handle: string) {
    return unstable_cache(() => loadProfilePage(handle), ["person:v1", handle], { revalidate: 120, tags: [personTag(handle)] })();
}
