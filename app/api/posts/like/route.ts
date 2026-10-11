import { NextResponse, userAgent } from "next/server";
import { looksAutomated } from "@/lib/analytics";
import { UUID } from "@/lib/posts";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// A heart on a photo or a video of a place's wall. One per browser (its
// random id) and per post; tapping again takes it back. The count kept on
// the post is recounted each time, so it cannot drift.
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
    if (!id || !visitor) return NextResponse.json({ ok: false }, { status: 400 });

    const db = getSupabaseAdminClient();
    try {
        const post = await db.from("nt_spot_posts").select("id").eq("id", id).eq("status", "APPROVED").maybeSingle();
        if (post.error) throw post.error;
        if (!post.data) return NextResponse.json({ ok: false }, { status: 404 });

        const change =
            body.on === false
                ? await db.from("nt_post_likes").delete().eq("post_id", id).eq("visitor_id", visitor)
                : await db.from("nt_post_likes").upsert({ post_id: id, visitor_id: visitor }, { onConflict: "post_id,visitor_id", ignoreDuplicates: true });
        if (change.error) throw change.error;

        const counted = await db.from("nt_post_likes").select("post_id", { count: "exact", head: true }).eq("post_id", id);
        if (counted.error) throw counted.error;
        const likes = counted.count ?? 0;
        const saved = await db.from("nt_spot_posts").update({ likes }).eq("id", id);
        if (saved.error) throw saved.error;
        return NextResponse.json({ ok: true, likes });
    } catch (error) {
        console.error("Like not saved:", error);
        return NextResponse.json({ ok: false }, { status: 502 });
    }
}
