import { NextResponse, userAgent } from "next/server";
import { looksAutomated } from "@/lib/analytics";
import { notInstalled } from "@/lib/atlas/store";
import { cleanText } from "@/lib/feedback";
import { getPlacesBySlugs } from "@/lib/places/server";
import { MAX_POLL_TITLE, POLLS_PER_DAY, POLL_CODE, POLL_MAX, POLL_MIN, newPollCode } from "@/lib/polls";
import { pollsReady, readPoll } from "@/lib/polls-server";
import { UUID } from "@/lib/posts";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// "On se voit où ?": a vote among friends on two to four places.
//   GET  /api/polls?ready=1          is the feature switched on (script 007 run)?
//   GET  /api/polls?code=…&v=…       the vote as it stands, and the reader's own choice
//   POST /api/polls                  { slugs, title?, v } creates one and answers its code

export async function GET(request: Request) {
    const params = new URL(request.url).searchParams;
    try {
        if (params.get("ready")) {
            return NextResponse.json({ ready: await pollsReady() }, { headers: { "Cache-Control": "public, max-age=120, s-maxage=300" } });
        }
        const code = params.get("code") ?? "";
        const visitor = params.get("v") ?? "";
        if (!POLL_CODE.test(code)) return NextResponse.json({ ok: false }, { status: 400 });
        const poll = await readPoll(code, UUID.test(visitor) ? visitor.toLowerCase() : null);
        if (!poll) return NextResponse.json({ ok: false }, { status: 404 });
        return NextResponse.json({ ok: true, poll }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
        console.error("Poll not read:", error);
        return NextResponse.json({ ok: false }, { status: 502 });
    }
}

export async function POST(request: Request) {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false, why: "invalid" }, { status: 400 });
    }
    const agent = userAgent(request);
    if (agent.isBot || looksAutomated(agent.ua)) return NextResponse.json({ ok: false, why: "invalid" }, { status: 400 });

    const visitor = typeof body.v === "string" && UUID.test(body.v) ? body.v.toLowerCase() : null;
    const asked = Array.isArray(body.slugs) ? [...new Set(body.slugs.filter((slug): slug is string => typeof slug === "string" && /^[a-z0-9-]{1,200}$/.test(slug)))] : [];
    if (!visitor || asked.length < POLL_MIN || asked.length > POLL_MAX) return NextResponse.json({ ok: false, why: "invalid" }, { status: 400 });

    const db = getSupabaseAdminClient();
    try {
        const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
        const made = await db.from("nt_polls").select("id").eq("visitor_id", visitor).gte("created_at", since).limit(POLLS_PER_DAY + 1);
        if (made.error) throw made.error;
        if ((made.data?.length ?? 0) >= POLLS_PER_DAY) return NextResponse.json({ ok: false, why: "many" }, { status: 429 });

        // Only places that are really on the site, in the order they were picked.
        const known = new Set((await getPlacesBySlugs(asked)).map((place) => place.slug));
        const slugs = asked.filter((slug) => known.has(slug));
        if (slugs.length < POLL_MIN) return NextResponse.json({ ok: false, why: "invalid" }, { status: 422 });

        const code = newPollCode();
        const saved = await db.from("nt_polls").insert({ code, slugs, title: cleanText(body.title, MAX_POLL_TITLE), visitor_id: visitor });
        if (saved.error) throw saved.error;
        return NextResponse.json({ ok: true, code });
    } catch (error) {
        if (notInstalled(error)) return NextResponse.json({ ok: false, why: "closed" }, { status: 503 });
        console.error("Poll not created:", error);
        return NextResponse.json({ ok: false, why: "failed" }, { status: 502 });
    }
}
