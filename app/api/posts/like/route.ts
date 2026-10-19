import { NextResponse, userAgent } from "next/server";
import { looksAutomated } from "@/lib/analytics";
import { checkLevel, notify } from "@/lib/people/notices";
import { currentProfile } from "@/lib/people/server";
import { UUID } from "@/lib/posts";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// A heart on a photo or a video of a place's wall. Signed in, it is given
// in the profile's name (one per person, whatever the phone, and it shows
// among "who liked"); otherwise one per browser (its random id). Tapping
// again takes it back. The count kept on the post is recounted each time,
// so it cannot drift.
export async function POST(request: Request) {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }
    const agent = userAgent(request);
    if (agent.isBot || looksAutomated(agent.ua)) return NextResponse.json({ ok: false }, { status: 400 });
    const id = typeof body.id === "string" && UUID.test(body.id) ? body.id : null;
    const visitor = typeof body.v === "string" && UUID.test(body.v) ? body.v.toLowerCase() : null;
    const profile = await currentProfile().catch(() => null);
    const key = profile?.id ?? visitor;
    if (!id || !key) return NextResponse.json({ ok: false }, { status: 400 });

    const db = getSupabaseAdminClient();
    try {
        const post = await db.from("nt_spot_posts").select("id,spot_id,profile_id").eq("id", id).eq("status", "APPROVED").maybeSingle();
        if (post.error) throw post.error;
        if (!post.data) return NextResponse.json({ ok: false }, { status: 404 });

        const change =
            body.on === false
                ? await db.from("nt_post_likes").delete().eq("post_id", id).eq("visitor_id", key)
                : await db.from("nt_post_likes").upsert({ post_id: id, visitor_id: key, ...(profile && { profile_id: profile.id }) }, { onConflict: "post_id,visitor_id", ignoreDuplicates: true });
        if (change.error) throw change.error;

        const counted = await db.from("nt_post_likes").select("post_id", { count: "exact", head: true }).eq("post_id", id);
        if (counted.error) throw counted.error;
        const likes = counted.count ?? 0;
        const saved = await db.from("nt_spot_posts").update({ likes }).eq("id", id);
        if (saved.error) throw saved.error;
        // Its author hears of a like given in someone's name.
        const author = (post.data as { profile_id?: string | null }).profile_id;
        if (profile && body.on !== false && author) {
            const spot = await db.from("nt_spots").select("slug,name").eq("id", (post.data as { spot_id: string }).spot_id).maybeSingle();
            await notify(author, "like", { id: profile.id, handle: profile.handle }, { place: spot.data?.slug as string, name: spot.data?.name as string, post: id });
            await checkLevel(author);
        }
        return NextResponse.json({ ok: true, likes });
    } catch (error) {
        console.error("Like not saved:", error);
        return NextResponse.json({ ok: false }, { status: 502 });
    }
}
