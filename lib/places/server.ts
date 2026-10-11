import { POST_COLUMNS, postUrl, toWallPost } from "../posts";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { DEFAULT_CITY, cityByName } from "../cities";
import { DAY_KEYS, type PlaceDetail, type PlaceSummary } from "./types";

// Public, cookie-less reads with the publishable key: Row Level Security
// only exposes APPROVED places, and results are cached so pages render
// from memory. Admin writes call refreshPlaces() (lib/refresh.ts).

export const PLACES_TAG = "places";
const REVALIDATE_SECONDS = 300;

// Local preview: NT_PREVIEW_DRAFTS=1 shows DRAFT places too (using the
// server key), so the app can be seen full of data before anything is
// published. Never active in production builds.
const PREVIEW_DRAFTS =
    process.env.NT_PREVIEW_DRAFTS === "1" && process.env.NODE_ENV !== "production";
const VISIBLE_STATUSES = PREVIEW_DRAFTS ? ["APPROVED", "DRAFT"] : ["APPROVED"];

function publicClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        PREVIEW_DRAFTS ? process.env.SUPABASE_SERVICE_ROLE_KEY! : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
    );
}

type SpotRow = Record<string, unknown> & {
    id: string;
    slug: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
};

const SUMMARY_COLUMNS = [
    "id",
    "slug",
    "name",
    "category",
    "cuisine",
    "city",
    "neighborhood",
    "latitude",
    "longitude",
    "minimum_price",
    "maximum_price",
    "average_price",
    "rating",
    "review_count",
    "vibes",
    "good_for",
    "amenities",
    "opening_time",
    "closing_time",
    ...DAY_KEYS.map((day) => `${day}_open`),
    "verified",
    "featured",
    "source",
].join(",");

function trimTime(value: unknown) {
    return typeof value === "string" ? value.slice(0, 5) : null;
}

// OpenStreetMap names are typed by volunteers: "sweet body", "LOISIR PLUS".
// Mixed-case names are left exactly as written.
function displayName(name: string) {
    const letters = name.replace(/[^\p{L}]/gu, "");
    if (letters.length < 4) return name;
    if (letters !== letters.toLowerCase() && letters !== letters.toUpperCase()) return name;
    return name
        .toLowerCase()
        .replace(/(^|[\s\-(])(\p{L})/gu, (_, before: string, letter: string) => before + letter.toUpperCase());
}

function toSummary(row: SpotRow, cover: string | null): PlaceSummary {
    const average = (row.average_price as number | null) ?? null;
    return {
        id: row.id,
        slug: row.slug,
        name: displayName(row.name),
        category: (row.category as string) ?? "Other",
        cuisine: (row.cuisine as string | null) ?? null,
        city: cityByName(row.city as string | null)?.slug ?? DEFAULT_CITY.slug,
        neighborhood: (row.neighborhood as string | null) ?? null,
        lat: row.latitude as number,
        lng: row.longitude as number,
        priceMin: (row.minimum_price as number | null) ?? average,
        priceMax: (row.maximum_price as number | null) ?? average,
        rating: Number(row.rating ?? 0),
        reviewCount: Number(row.review_count ?? 0),
        vibes: (row.vibes as string[]) ?? [],
        goodFor: (row.good_for as string[]) ?? [],
        amenities: (row.amenities as string[]) ?? [],
        hours: {
            opens: trimTime(row.opening_time),
            closes: trimTime(row.closing_time),
            days: DAY_KEYS.filter((day) => row[`${day}_open`] !== false),
        },
        verified: Boolean(row.verified),
        featured: Boolean(row.featured),
        cover,
        source: (row.source as string) ?? "field",
    };
}

const PAGE_SIZE = 1000;

// First photo of every place, in one pass over the (small) photo table:
// asking per batch of place ids meant a dozen slow requests with huge URLs.
async function fetchCovers() {
    const covers = new Map<string, string>();
    const db = publicClient();
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await db
            .from("nt_spot_photos")
            .select("spot_id,image_url,sort_order")
            .order("spot_id", { ascending: true })
            .order("sort_order", { ascending: true })
            .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        for (const photo of data ?? []) {
            if (!covers.has(photo.spot_id)) covers.set(photo.spot_id, photo.image_url);
        }
        if (!data || data.length < PAGE_SIZE) break;
    }
    // A place with no photo of its own shows the best-liked photo of its
    // wall (visitors' photos approved by the team). No wall yet, or the
    // table not created: nothing changes.
    const wall = await db.from("nt_spot_posts").select("spot_id,media_path").eq("status", "APPROVED").eq("kind", "photo").order("likes", { ascending: false }).order("decided_at", { ascending: true }).limit(2000);
    for (const post of wall.data ?? []) {
        if (!covers.has(post.spot_id)) covers.set(post.spot_id, postUrl(post.media_path));
    }
    return covers;
}

function spotsPage(from: number, count: boolean) {
    return publicClient()
        .from("nt_spots")
        .select(SUMMARY_COLUMNS, count ? { count: "exact" } : undefined)
        .in("status", VISIBLE_STATUSES)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
}

// The whole catalogue: the first page tells how many there are, the rest
// are fetched side by side, while the covers load in parallel. Exported
// for the sitemap, which reads the database itself.
export async function loadAllPlaces(): Promise<PlaceSummary[]> {
    const [first, covers] = await Promise.all([spotsPage(0, true), fetchCovers()]);
    if (first.error) throw first.error;
    const total = first.count ?? first.data?.length ?? 0;
    const rest = await Promise.all(
        Array.from({ length: Math.max(0, Math.ceil(total / PAGE_SIZE) - 1) }, (_, index) => spotsPage((index + 1) * PAGE_SIZE, false))
    );
    const rows: SpotRow[] = [];
    for (const page of [first, ...rest]) {
        if (page.error) throw page.error;
        rows.push(...((page.data ?? []) as unknown as SpotRow[]));
    }
    return rows.map((row) => toSummary(row, covers.get(row.id) ?? null));
}

export const getAllPlaces = unstable_cache(loadAllPlaces, ["places:all:v4"], {
    revalidate: REVALIDATE_SECONDS,
    tags: [PLACES_TAG],
});

// The places that deserve more than an address (database script 005):
// those worth the trip and those with a story, the most important first.
// Empty until places have been marked in the team console.
export type StoryPlace = PlaceSummary & { standing: 1 | 2 };

async function loadStoryPlaces(): Promise<StoryPlace[]> {
    const db = publicClient();
    const { data, error } = await db.from("nt_spots").select(`${SUMMARY_COLUMNS},standing`).in("status", VISIBLE_STATUSES).gt("standing", 0).not("latitude", "is", null).not("longitude", "is", null).order("standing", { ascending: false }).order("name", { ascending: true }).limit(80);
    if (error || !data?.length) return [];
    const rows = data as unknown as (SpotRow & { standing: number })[];
    const photos = await db
        .from("nt_spot_photos")
        .select("spot_id,image_url,sort_order")
        .in(
            "spot_id",
            rows.map((row) => row.id)
        )
        .order("sort_order", { ascending: true });
    const covers = new Map<string, string>();
    for (const photo of photos.data ?? []) if (!covers.has(photo.spot_id)) covers.set(photo.spot_id, photo.image_url);
    const wall = await db
        .from("nt_spot_posts")
        .select("spot_id,media_path")
        .eq("status", "APPROVED")
        .eq("kind", "photo")
        .in(
            "spot_id",
            rows.map((row) => row.id)
        )
        .order("likes", { ascending: false })
        .order("decided_at", { ascending: true });
    for (const post of wall.data ?? []) if (!covers.has(post.spot_id)) covers.set(post.spot_id, postUrl(post.media_path));
    return rows.map((row) => ({ ...toSummary(row, covers.get(row.id) ?? null), standing: row.standing === 2 ? 2 : 1 }));
}

export const getStoryPlaces = unstable_cache(loadStoryPlaces, ["places:stories:v2"], {
    revalidate: REVALIDATE_SECONDS,
    tags: [PLACES_TAG],
});

async function loadPlace(slug: string): Promise<PlaceDetail | null> {
    const db = publicClient();
    const { data: row, error } = await db
        .from("nt_spots")
        .select("*")
        .eq("slug", slug)
        .in("status", VISIBLE_STATUSES)
        .maybeSingle();

    if (error) throw error;
    if (!row || row.latitude == null || row.longitude == null) return null;

    const [photos, menu, reviews, arrivals, wall] = await Promise.all([
        db
            .from("nt_spot_photos")
            .select("image_url,alt_text")
            .eq("spot_id", row.id)
            .order("sort_order", { ascending: true }),
        db
            .from("nt_spot_menu")
            .select("name,description,price,popular")
            .eq("spot_id", row.id)
            .eq("available", true)
            .order("popular", { ascending: false })
            .limit(40),
        db
            .from("nt_reviews")
            .select("id,rating,comment,price_accurate,created_at")
            .eq("spot_id", row.id)
            .order("created_at", { ascending: false })
            .limit(30),
        db.from("nt_arrivals").select("created_at", { count: "exact" }).eq("spot_id", row.id).order("created_at", { ascending: false }).limit(1),
        db.from("nt_spot_posts").select(POST_COLUMNS).eq("spot_id", row.id).eq("status", "APPROVED").order("likes", { ascending: false }).order("decided_at", { ascending: false }).limit(30),
    ]);

    for (const result of [photos, menu, reviews]) {
        if (result.error) throw result.error;
    }

    const ownPhotos = (photos.data ?? []).map((photo) => ({
        url: photo.image_url as string,
        alt: (photo.alt_text as string | null) ?? null,
    }));
    // No photo of its own: the best-liked photo of its wall opens the page
    // (its credit, when it has one, is in its caption on the wall below).
    const wallPhoto = wall.error ? undefined : (wall.data ?? []).find((post) => post.kind === "photo");
    const photoList = ownPhotos.length || !wallPhoto ? ownPhotos : [{ url: postUrl(wallPhoto.media_path as string), alt: (wallPhoto.caption as string | null) ?? null }];

    // Written by the team for places that tell a story; absent (so empty)
    // until database script 005 has been run.
    const words = (key: string) => ({ fr: ((row[`${key}_fr`] as string | null | undefined) ?? "").trim() || null, en: ((row[`${key}_en`] as string | null | undefined) ?? "").trim() || null });

    return {
        ...toSummary(row as SpotRow, photoList[0]?.url ?? null),
        standing: row.standing === 1 || row.standing === 2 ? row.standing : 0,
        positionExact: row.position_exact !== false,
        // An error here means the wall is not open yet: the page does without.
        wall: wall.error ? null : (wall.data ?? []).map(toWallPost),
        guide: { story: words("story"), access: words("access"), fees: words("fees"), company: words("company"), bestTime: words("best_time"), bring: words("bring") },
        description: row.description ?? null,
        address: row.address ?? null,
        landmark: row.landmark ?? null,
        phone: row.phone ?? null,
        whatsapp: row.whatsapp ?? null,
        website: row.website ?? null,
        instagram: row.instagram ?? null,
        lastVerifiedAt: row.last_verified_at ?? null,
        updatedAt: row.updated_at,
        sourceRef: row.source_ref ?? null,
        claimed: Boolean(row.claimed),
        // Never worth failing the page for.
        arrivals: arrivals.error ? { count: 0, last: null } : { count: arrivals.count ?? 0, last: (arrivals.data?.[0]?.created_at as string | undefined) ?? null },
        photos: photoList,
        menu: (menu.data ?? []).map((item) => ({
            name: item.name,
            description: item.description ?? null,
            price: item.price,
            popular: Boolean(item.popular),
        })),
        reviews: (reviews.data ?? []).map((review) => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment ?? null,
            priceAccurate: review.price_accurate ?? null,
            createdAt: review.created_at,
        })),
    };
}

export const getPlace = unstable_cache(loadPlace, ["places:detail:v7"], {
    revalidate: REVALIDATE_SECONDS,
    tags: [PLACES_TAG],
});

// Saved places and other short lists: served from the cached catalogue.
export async function getPlacesBySlugs(slugs: string[]) {
    const wanted = new Set(slugs);
    const places = await getAllPlaces();
    const bySlug = new Map(places.filter((place) => wanted.has(place.slug)).map((place) => [place.slug, place]));
    return slugs.map((slug) => bySlug.get(slug)).filter((place): place is PlaceSummary => Boolean(place));
}

export async function getCityPlaces(city: string) {
    return (await getAllPlaces()).filter((place) => place.city === city);
}

// Published places per city slug, for city pickers and the landing page.
export async function getCityCounts() {
    const counts: Record<string, number> = {};
    for (const place of await getAllPlaces()) counts[place.city] = (counts[place.city] ?? 0) + 1;
    return counts;
}
