import { NextResponse, userAgent } from "next/server";
import { looksAutomated } from "@/lib/analytics";
import { cityBySlug } from "@/lib/cities";
import { publicWriteClient } from "@/lib/feedback";

// Anonymous search log: the words typed, the city and how many places
// matched. No visitor id, no position. Feeds the admin "Recherches" page.
export async function POST(request: Request) {
    // Programs that announce themselves are not people searching.
    const agent = userAgent(request);
    if (agent.isBot || looksAutomated(agent.ua)) return NextResponse.json({ ok: true });

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }
    const query = typeof body.query === "string" ? body.query.replace(/\s+/g, " ").trim().slice(0, 120) : "";
    const city = cityBySlug(typeof body.city === "string" ? body.city : null)?.slug ?? null;
    const results = Number.isInteger(body.results) ? Math.max(0, Math.min(100000, body.results as number)) : null;
    if (query.length < 2) return NextResponse.json({ ok: false }, { status: 400 });

    const { error } = await publicWriteClient()
        .from("nt_searches")
        .insert({ query, filters: city ? { city } : {}, result_count: results });
    if (error) console.error("Search log failed:", error);
    return NextResponse.json({ ok: !error });
}
