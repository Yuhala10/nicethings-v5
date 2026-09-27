import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { DAY_KEYS, type PlaceDetail, type PlaceSummary } from "./types";

// Public, cookie-less reads with the publishable key: Row Level Security
// only exposes APPROVED places, and results are cached so pages render
// from memory. Admin writes call revalidateTag(PLACES_TAG) to refresh.

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
].join(",");

function trimTime(value: unknown) {
    return typeof value === "string" ? value.slice(0, 5) : null;
}

function toSummary(row: SpotRow, cover: string | null): PlaceSummary {
    const average = (row.average_price as number | null) ?? null;
    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        category: (row.category as string) ?? "Other",
        cuisine: (row.cuisine as string | null) ?? null,
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
    };
}

async function fetchCovers(ids: string[]) {
    const covers = new Map<string, string>();
    if (ids.length === 0) return covers;

    const db = publicClient();
    for (let i = 0; i < ids.length; i += 300) {
        const { data, error } = await db
            .from("nt_spot_photos")
            .select("spot_id,image_url,sort_order")
            .in("spot_id", ids.slice(i, i + 300))
            .order("sort_order", { ascending: true });
        if (error) throw error;
        for (const photo of data ?? []) {
            if (!covers.has(photo.spot_id)) covers.set(photo.spot_id, photo.image_url);
        }
    }
    return covers;
}

async function loadAllPlaces(): Promise<PlaceSummary[]> {
    const db = publicClient();
    const rows: SpotRow[] = [];

    for (let from = 0; ; from += 1000) {
        const { data, error } = await db
            .from("nt_spots")
            .select(SUMMARY_COLUMNS)
            .in("status", VISIBLE_STATUSES)
            .not("latitude", "is", null)
            .not("longitude", "is", null)
            .range(from, from + 999);
        if (error) throw error;
        rows.push(...((data ?? []) as unknown as SpotRow[]));
        if (!data || data.length < 1000) break;
    }

    const covers = await fetchCovers(rows.map((row) => row.id));
    return rows.map((row) => toSummary(row, covers.get(row.id) ?? null));
}

export const getAllPlaces = unstable_cache(loadAllPlaces, ["places:all:v1"], {
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

    const [photos, menu, reviews] = await Promise.all([
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
    ]);

    for (const result of [photos, menu, reviews]) {
        if (result.error) throw result.error;
    }

    const photoList = (photos.data ?? []).map((photo) => ({
        url: photo.image_url as string,
        alt: (photo.alt_text as string | null) ?? null,
    }));

    return {
        ...toSummary(row as SpotRow, photoList[0]?.url ?? null),
        description: row.description ?? null,
        address: row.address ?? null,
        landmark: row.landmark ?? null,
        phone: row.phone ?? null,
        whatsapp: row.whatsapp ?? null,
        website: row.website ?? null,
        instagram: row.instagram ?? null,
        lastVerifiedAt: row.last_verified_at ?? null,
        updatedAt: row.updated_at,
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

export const getPlace = unstable_cache(loadPlace, ["places:detail:v1"], {
    revalidate: REVALIDATE_SECONDS,
    tags: [PLACES_TAG],
});
