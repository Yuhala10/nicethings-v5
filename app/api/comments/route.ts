import { NextResponse, userAgent } from "next/server";
import { looksAutomated } from "@/lib/analytics";
import { notInstalled } from "@/lib/atlas/store";
import { COMMENTS_PER_DAY, MAX_COMMENT, MAX_NAME, MIN_COMMENT } from "@/lib/blog/comment-rules";
import { cleanText } from "@/lib/feedback";
import { UUID } from "@/lib/posts";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// A reader says what they think under an article. The comment waits for
// the team to read it: nothing shows on the site before that.
export async function POST(request: Request) {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false, why: "invalid" }, { status: 400 });
    }
    const agent = userAgent(request);
    // Robots fill every field; people never see this one.
    if (agent.isBot || looksAutomated(agent.ua) || body.website) return NextResponse.json({ ok: false, why: "invalid" }, { status: 400 });

    const post = typeof body.post === "string" && UUID.test(body.post) ? body.post : null;
    const visitor = typeof body.v === "string" && UUID.test(body.v) ? body.v.toLowerCase() : null;
    const text = typeof body.body === "string" ? body.body.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_COMMENT) : "";
    if (!post || !visitor) return NextResponse.json({ ok: false, why: "invalid" }, { status: 400 });
    if (text.length < MIN_COMMENT) return NextResponse.json({ ok: false, why: "short" }, { status: 422 });

    const db = getSupabaseAdminClient();
    try {
        const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
        const sent = await db.from("nt_post_comments").select("id").eq("visitor_id", visitor).gte("created_at", since).limit(COMMENTS_PER_DAY + 1);
        if (sent.error) throw sent.error;
        if ((sent.data?.length ?? 0) >= COMMENTS_PER_DAY) return NextResponse.json({ ok: false, why: "many" }, { status: 429 });

        const published = await db.from("nt_posts").select("id").eq("id", post).eq("status", "PUBLISHED").maybeSingle();
        if (published.error) throw published.error;
        if (!published.data) return NextResponse.json({ ok: false, why: "invalid" }, { status: 404 });

        const saved = await db.from("nt_post_comments").insert({ post_id: post, visitor_id: visitor, name: cleanText(body.name, MAX_NAME), body: text });
        if (saved.error) throw saved.error;
        return NextResponse.json({ ok: true });
    } catch (error) {
        if (notInstalled(error)) return NextResponse.json({ ok: false, why: "closed" }, { status: 503 });
        console.error("Comment not saved:", error);
        return NextResponse.json({ ok: false, why: "failed" }, { status: 502 });
    }
}
