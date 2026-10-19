import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { UUID } from "@/lib/posts";
import { reviewsTag } from "@/lib/people/reviews";
import { deny, readBody, requireProfile } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// "Validé !": this review helped. One per person; not on one's own review.
export async function POST(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const body = await readBody(request);
    const id = typeof body.id === "string" && UUID.test(body.id) ? body.id : null;
    if (!id) return deny("invalid", 400);
    const db = getSupabaseAdminClient();
    const review = await db.from("nt_reviews").select("id,profile_id,spot_id").eq("id", id).eq("status", "PUBLISHED").maybeSingle();
    if (review.error) return deny("failed", 502);
    if (!review.data) return deny("invalid", 404);
    if (review.data.profile_id === profile.id) return deny("own", 422);

    const change =
        body.on === false
            ? await db.from("nt_review_votes").delete().eq("review_id", id).eq("profile_id", profile.id)
            : await db.from("nt_review_votes").upsert({ review_id: id, profile_id: profile.id }, { onConflict: "review_id,profile_id", ignoreDuplicates: true });
    if (change.error) return deny("failed", 502);
    const { count } = await db.from("nt_review_votes").select("review_id", { count: "exact", head: true }).eq("review_id", id);
    await db.from("nt_reviews").update({ helpful: count ?? 0 }).eq("id", id);
    revalidateTag(reviewsTag(review.data.spot_id as string), { expire: 0 });
    return NextResponse.json({ ok: true, helpful: count ?? 0 });
}
