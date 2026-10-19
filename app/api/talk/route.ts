import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { notInstalled } from "@/lib/atlas/store";
import { UUID } from "@/lib/posts";
import { COMMENTS_PER_HOUR, MAX_COMMENT, MIN_COMMENT, needsReading } from "@/lib/people/rules";
import { checkLevel, notify } from "@/lib/people/notices";
import { reviewsTag } from "@/lib/people/reviews";
import { currentProfile, deny, peopleByIds, readBody, requireProfile } from "@/lib/people/server";
import { TARGETS, loadTalk, recount, talkTag, targetExists, type Target } from "@/lib/people/talk";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const NOW = { expire: 0 };

function targetOf(value: unknown): Target | null {
    return typeof value === "string" && (TARGETS as readonly string[]).includes(value) ? (value as Target) : null;
}

// After a change: the cached copies that show these words are dropped.
async function refresh(target: Target, id: string) {
    revalidateTag(talkTag(target, id), NOW);
    if (target === "review") {
        const review = await getSupabaseAdminClient().from("nt_reviews").select("spot_id").eq("id", id).maybeSingle();
        if (review.data) revalidateTag(reviewsTag(review.data.spot_id as string), NOW);
    }
}

// The comments under something, as the person reading sees them (their own
// words show at once, even those waiting to be read).
export async function GET(request: Request) {
    const query = new URL(request.url).searchParams;
    const target = targetOf(query.get("target"));
    const ids = (query.get("id") ?? "").split(",").filter((id) => UUID.test(id)).slice(0, 12);
    if (!target || !ids.length) return deny("invalid", 400);
    try {
        const viewer = await currentProfile().catch(() => null);
        const comments = await loadTalk(target, ids, viewer?.id ?? null);
        // Who liked a photo or video of a wall, newest first, and whether
        // the person reading did.
        let likers = undefined;
        let liked = undefined;
        if (target === "wall" && ids.length === 1) {
            const likes = await getSupabaseAdminClient().from("nt_post_likes").select("profile_id").eq("post_id", ids[0]).not("profile_id", "is", null).order("created_at", { ascending: false }).limit(30);
            const order = (likes.data ?? []).map((like) => like.profile_id as string);
            const people = await peopleByIds(order);
            likers = order.map((id) => people.get(id)).filter(Boolean);
            if (viewer) liked = Boolean((await getSupabaseAdminClient().from("nt_post_likes").select("post_id").eq("post_id", ids[0]).eq("visitor_id", viewer.id).maybeSingle()).data);
        }
        return NextResponse.json({ ok: true, comments, likers, liked }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
        if (notInstalled(error)) return NextResponse.json({ ok: false, why: "closed" }, { status: 503 });
        console.error("Comments not read:", error);
        return deny("failed", 502);
    }
}

export async function POST(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const body = await readBody(request);
    const target = targetOf(body.target);
    const id = typeof body.id === "string" && UUID.test(body.id) ? body.id : null;
    const text = typeof body.body === "string" ? body.body.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_COMMENT) : "";
    if (!target || !id) return deny("invalid", 400);
    if (text.length < MIN_COMMENT) return deny("short", 422);

    const db = getSupabaseAdminClient();
    try {
        const since = new Date(Date.now() - 3_600_000).toISOString();
        const sent = await db.from("nt_comments").select("id", { count: "exact", head: true }).eq("profile_id", profile.id).gte("created_at", since);
        if ((sent.count ?? 0) >= COMMENTS_PER_HOUR) return deny("many", 429);
        if (!(await targetExists(target, id))) return deny("invalid", 404);

        const saved = await db.from("nt_comments").insert({ target, target_id: id, profile_id: profile.id, body: text, status: needsReading(text) ? "PENDING" : "PUBLISHED" }).select("id").single();
        if (saved.error) throw saved.error;
        await recount(target, id);
        await refresh(target, id);
        // The author of the review or of the photo hears of it.
        if (target !== "article") {
            const owner = target === "review" ? await db.from("nt_reviews").select("profile_id,spot_id").eq("id", id).maybeSingle() : await db.from("nt_spot_posts").select("profile_id,spot_id").eq("id", id).maybeSingle();
            if (owner.data?.profile_id) {
                const spot = await db.from("nt_spots").select("slug,name").eq("id", owner.data.spot_id).maybeSingle();
                await notify(owner.data.profile_id as string, target === "review" ? "reply" : "comment", { id: profile.id, handle: profile.handle }, { place: spot.data?.slug as string, name: spot.data?.name as string, snippet: text.slice(0, 80), ...(target === "review" ? { review: id } : { post: id }) });
            }
        }
        await checkLevel(profile.id);
        return NextResponse.json({ ok: true, comments: await loadTalk(target, [id], profile.id) });
    } catch (error) {
        if (notInstalled(error)) return deny("closed", 503);
        console.error("Comment not saved:", error);
        return deny("failed", 502);
    }
}

// Taking their words back.
export async function DELETE(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !UUID.test(id)) return deny("invalid", 400);
    const db = getSupabaseAdminClient();
    const gone = await db.from("nt_comments").delete().eq("id", id).eq("profile_id", profile.id).select("target,target_id").maybeSingle();
    if (gone.error) return deny("failed", 502);
    if (gone.data) {
        const target = gone.data.target as Target;
        await recount(target, gone.data.target_id as string);
        await refresh(target, gone.data.target_id as string);
    }
    return NextResponse.json({ ok: true });
}
