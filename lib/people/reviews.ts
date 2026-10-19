import { unstable_cache } from "next/cache";
import { getSupabaseAdminClient } from "../supabase/admin";
import { REVIEW_TAGS } from "./rules";
import { peopleByIds } from "./server";
import type { ReviewSummary, ReviewView } from "./types";

// Reviews of a place, each with the face of who wrote it, and what they
// add up to. The page shows a cached copy (dropped as soon as someone
// writes); the browser then asks for the version that knows who is reading.

export const REVIEW_COLUMNS = "id,profile_id,rating,comment,tags,price_paid,company,helpful,replies,status,created_at,updated_at";

type Row = {
    id: string;
    profile_id: string;
    rating: number;
    comment: string | null;
    tags: string[] | null;
    price_paid: number | null;
    company: string | null;
    helpful: number | null;
    replies: number | null;
    status: string;
    created_at: string;
    updated_at: string | null;
};

export const reviewsTag = (spotId: string) => `reviews:${spotId}`;

function median(values: number[]) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export function summarize(rows: Pick<Row, "rating" | "tags" | "price_paid">[]): ReviewSummary {
    const spread: ReviewSummary["spread"] = [0, 0, 0, 0, 0];
    const tags = new Map<string, number>();
    const prices: number[] = [];
    for (const row of rows) {
        if (row.rating >= 1 && row.rating <= 5) spread[row.rating - 1]++;
        for (const tag of row.tags ?? []) if (REVIEW_TAGS.includes(tag)) tags.set(tag, (tags.get(tag) ?? 0) + 1);
        if (row.price_paid && row.price_paid > 0) prices.push(row.price_paid);
    }
    const count = rows.length;
    return {
        count,
        average: count ? Math.round((rows.reduce((sum, row) => sum + row.rating, 0) / count) * 10) / 10 : 0,
        spread,
        tags: [...tags].map(([tag, total]) => ({ tag, count: total })).sort((a, b) => b.count - a.count).slice(0, 6),
        // Two people saying the same thing is a hint; one is an anecdote.
        price: prices.length >= 2 ? { median: Math.round(median(prices) / 50) * 50, count: prices.length } : null,
    };
}

export async function loadReviews(spotId: string, viewer: string | null, sort: "recent" | "useful" = "recent") {
    const db = getSupabaseAdminClient();
    const [published, own, votes] = await Promise.all([
        db
            .from("nt_reviews")
            .select(REVIEW_COLUMNS)
            .eq("spot_id", spotId)
            .eq("status", "PUBLISHED")
            .not("profile_id", "is", null)
            .order(sort === "useful" ? "helpful" : "created_at", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(200),
        viewer ? db.from("nt_reviews").select(REVIEW_COLUMNS).eq("spot_id", spotId).eq("profile_id", viewer).maybeSingle() : null,
        viewer ? db.from("nt_review_votes").select("review_id").eq("profile_id", viewer) : null,
    ]);
    if (published.error) throw published.error;
    const rows = (published.data ?? []) as Row[];
    const mine = (own?.data as Row | null) ?? null;
    const list = mine && mine.status !== "PUBLISHED" ? [mine, ...rows] : rows;
    const people = await peopleByIds(list.map((row) => row.profile_id));
    const voted = new Set((votes?.data ?? []).map((vote) => vote.review_id as string));

    const reviews: ReviewView[] = list
        .filter((row) => people.has(row.profile_id))
        .map((row) => ({
            id: row.id,
            person: people.get(row.profile_id)!,
            rating: row.rating,
            body: row.comment,
            tags: (row.tags ?? []).filter((tag) => REVIEW_TAGS.includes(tag)),
            pricePaid: row.price_paid,
            company: row.company,
            helpful: row.helpful ?? 0,
            replies: row.replies ?? 0,
            createdAt: row.created_at,
            updatedAt: row.updated_at ?? row.created_at,
            pending: row.status !== "PUBLISHED",
            mine: row.profile_id === viewer,
            voted: voted.has(row.id),
        }));
    return { summary: summarize(rows), reviews, mine: reviews.find((review) => review.mine) ?? null };
}

// What everyone sees, for the place page itself.
export function getPlaceReviews(spotId: string) {
    return unstable_cache(() => loadReviews(spotId, null), ["reviews:v1", spotId], { revalidate: 600, tags: [reviewsTag(spotId)] })();
}
