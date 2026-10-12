import { NextResponse, userAgent } from "next/server";
import { looksAutomated } from "@/lib/analytics";
import { notInstalled } from "@/lib/atlas/store";
import { cleanText } from "@/lib/feedback";
import { MAX_VOTER_NAME, POLL_CODE } from "@/lib/polls";
import { readPoll } from "@/lib/polls-server";
import { UUID } from "@/lib/posts";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// POST /api/polls/vote { code, slug, v, name? } — one browser, one vote per
// poll; voting again changes it. Answers the vote as it now stands.
export async function POST(request: Request) {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false, why: "invalid" }, { status: 400 });
    }
    const agent = userAgent(request);
    if (agent.isBot || looksAutomated(agent.ua)) return NextResponse.json({ ok: false, why: "invalid" }, { status: 400 });

    const code = typeof body.code === "string" && POLL_CODE.test(body.code) ? body.code : null;
    const visitor = typeof body.v === "string" && UUID.test(body.v) ? body.v.toLowerCase() : null;
    const slug = typeof body.slug === "string" ? body.slug : null;
    if (!code || !visitor || !slug) return NextResponse.json({ ok: false, why: "invalid" }, { status: 400 });

    const db = getSupabaseAdminClient();
    try {
        const found = await db.from("nt_polls").select("id,slugs").eq("code", code).maybeSingle();
        if (found.error) throw found.error;
        const poll = found.data as { id: string; slugs: string[] } | null;
        if (!poll || !poll.slugs.includes(slug)) return NextResponse.json({ ok: false, why: "invalid" }, { status: 404 });

        const saved = await db
            .from("nt_poll_votes")
            .upsert({ poll_id: poll.id, visitor_id: visitor, slug, name: cleanText(body.name, MAX_VOTER_NAME), created_at: new Date().toISOString() }, { onConflict: "poll_id,visitor_id" });
        if (saved.error) throw saved.error;
        return NextResponse.json({ ok: true, poll: await readPoll(code, visitor) });
    } catch (error) {
        if (notInstalled(error)) return NextResponse.json({ ok: false, why: "closed" }, { status: 503 });
        console.error("Vote not saved:", error);
        return NextResponse.json({ ok: false, why: "failed" }, { status: 502 });
    }
}
