import { NextResponse, userAgent } from "next/server";
import { looksAutomated } from "@/lib/analytics";
import { notInstalled } from "@/lib/atlas/store";
import { cityBySlug } from "@/lib/cities";
import { cleanText } from "@/lib/feedback";
import { LIKES, PLATFORMS } from "@/lib/guest-request";
import { cleanHandle, cleanLink } from "@/lib/guests";
import { UUID } from "@/lib/posts";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// "Demande ton invitation" (the form on /fr/invites): someone asks to be
// invited. The request waits in the team's console, which invites, or not.
// Nothing here is ever shown on the site.

const PER_DAY = 2; // requests one browser may send in a day

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

    const name = cleanText(body.name, 60);
    const handle = cleanHandle(body.handle);
    const visitor = typeof body.v === "string" && UUID.test(body.v) ? body.v.toLowerCase() : null;
    if (!name || name.length < 2) return NextResponse.json({ ok: false, why: "name" }, { status: 422 });
    if (!handle) return NextResponse.json({ ok: false, why: "handle" }, { status: 422 });
    if (!visitor) return NextResponse.json({ ok: false, why: "invalid" }, { status: 400 });

    const platform = PLATFORMS.find((item) => item === body.platform) ?? "other";
    const likes = Array.isArray(body.likes) ? LIKES.filter((like) => (body.likes as unknown[]).includes(like)) : [];
    const city = cityBySlug(typeof body.city === "string" ? body.city : null)?.slug ?? null;

    const db = getSupabaseAdminClient();
    try {
        const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
        const sent = await db.from("nt_guest_requests").select("id").eq("visitor_id", visitor).gte("created_at", since).limit(PER_DAY + 1);
        if (sent.error) throw sent.error;
        if ((sent.data?.length ?? 0) >= PER_DAY) return NextResponse.json({ ok: false, why: "many" }, { status: 429 });
        // The same account asking twice: the first request is enough.
        const waiting = await db.from("nt_guest_requests").select("id").ilike("handle", handle.replace(/_/g, "\\_")).eq("platform", platform).eq("status", "PENDING").limit(1);
        if (waiting.error) throw waiting.error;
        if (waiting.data?.length) return NextResponse.json({ ok: true });

        const saved = await db.from("nt_guest_requests").insert({ name, handle, platform, link: cleanLink(body.link), city, likes, why: cleanText(body.why, 400), visitor_id: visitor });
        if (saved.error) throw saved.error;
        return NextResponse.json({ ok: true });
    } catch (error) {
        if (notInstalled(error)) return NextResponse.json({ ok: false, why: "closed" }, { status: 503 });
        console.error("Invitation request not saved:", error);
        return NextResponse.json({ ok: false, why: "failed" }, { status: 502 });
    }
}
