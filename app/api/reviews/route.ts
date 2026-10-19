import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { notInstalled } from "@/lib/atlas/store";
import { getPlace } from "@/lib/places/server";
import { UUID } from "@/lib/posts";
import { COMPANIES, MAX_PRICE, MAX_REVIEW, REVIEWS_PER_DAY, REVIEW_TAGS, needsReading } from "@/lib/people/rules";
import { checkLevel } from "@/lib/people/notices";
import { refreshPerson } from "@/lib/people/pages";
import { loadReviews, reviewsTag } from "@/lib/people/reviews";
import { currentProfile, deny, readBody, requireProfile } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const NOW = { expire: 0 };

async function placeOf(slug: unknown) {
    return typeof slug === "string" && slug.length <= 200 ? await getPlace(slug).catch(() => null) : null;
}

// A place's reviews, as the person reading sees them (their own first,
// even while it waits to be read; what they found useful).
export async function GET(request: Request) {
    const query = new URL(request.url).searchParams;
    const place = await placeOf(query.get("place"));
    if (!place) return deny("invalid", 404);
    try {
        const viewer = await currentProfile().catch(() => null);
        const answer = await loadReviews(place.id, viewer?.id ?? null, query.get("sort") === "useful" ? "useful" : "recent");
        return NextResponse.json({ ok: true, ...answer }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
        if (notInstalled(error) || (error as { code?: string }).code === "42703") return NextResponse.json({ ok: false, why: "closed" }, { status: 503 });
        console.error("Reviews not read:", error);
        return deny("failed", 502);
    }
}

// Their review of a place: a mark from "C'est le ndem" to "C'est validé",
// what they liked, what they paid, who they were with, a few words. Writing
// again changes it. A review carrying a link or a phone number waits for
// the team.
export async function POST(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const body = await readBody(request);
    const place = await placeOf(body.place);
    if (!place) return deny("invalid", 404);
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return deny("rating", 422);
    const text = typeof body.body === "string" ? body.body.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_REVIEW) : "";
    const tags = Array.isArray(body.tags) ? [...new Set(body.tags.filter((tag): tag is string => typeof tag === "string" && REVIEW_TAGS.includes(tag)))].slice(0, 8) : [];
    const price = Math.round(Number(body.pricePaid));
    const company = typeof body.company === "string" && (COMPANIES as readonly string[]).includes(body.company) ? body.company : null;

    const db = getSupabaseAdminClient();
    try {
        const since = new Date(Date.now() - 86_400_000).toISOString();
        const written = await db.from("nt_reviews").select("id", { count: "exact", head: true }).eq("profile_id", profile.id).gte("updated_at", since);
        if ((written.count ?? 0) >= REVIEWS_PER_DAY) return deny("many", 429);

        const saved = await db.from("nt_reviews").upsert(
            {
                spot_id: place.id,
                profile_id: profile.id,
                rating,
                comment: text || null,
                tags,
                price_paid: Number.isFinite(price) && price > 0 && price <= MAX_PRICE ? price : null,
                company,
                status: text && needsReading(text) ? "PENDING" : "PUBLISHED",
                updated_at: new Date().toISOString(),
            },
            { onConflict: "profile_id,spot_id" }
        );
        if (saved.error) throw saved.error;
        revalidateTag(reviewsTag(place.id), NOW);
        revalidateTag("kwat", NOW);
        refreshPerson(profile.handle);
        await checkLevel(profile.id);
        return NextResponse.json({ ok: true, ...(await loadReviews(place.id, profile.id)) });
    } catch (error) {
        if (notInstalled(error) || (error as { code?: string }).code === "42703") return deny("closed", 503);
        console.error("Review not saved:", error);
        return deny("failed", 502);
    }
}

// Taking their review back.
export async function DELETE(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !UUID.test(id)) return deny("invalid", 400);
    const db = getSupabaseAdminClient();
    const gone = await db.from("nt_reviews").delete().eq("id", id).eq("profile_id", profile.id).select("spot_id").maybeSingle();
    if (gone.error) return deny("failed", 502);
    if (gone.data) revalidateTag(reviewsTag(gone.data.spot_id as string), NOW);
    refreshPerson(profile.handle);
    return NextResponse.json({ ok: true });
}
