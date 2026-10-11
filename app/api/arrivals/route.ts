import { NextResponse, userAgent } from "next/server";
import { looksAutomated } from "@/lib/analytics";
import { cleanPosition, cleanText, publicWriteClient } from "@/lib/feedback";
import { distanceMeters } from "@/lib/places/geo";
import { getPlace } from "@/lib/places/server";

// "Yes, I'm here": sent from the arrival screen of the guidance, when the
// phone itself measured that the visitor reached the door and they confirm
// the place is really there. It is what lets a place page say "confirmed on
// the spot by visitors". Only the fact is kept (which place, when, and the
// random id the browser already uses for audience counting): the position
// is used for the check below and never stored.

// The visitor must be this close to the place, in metres.
const NEAR = 150;
// One confirmation per visitor and place in this time, in hours.
const ONCE_EVERY = 20;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }

    const agent = userAgent(request);
    if (agent.isBot || looksAutomated(agent.ua)) return NextResponse.json({ ok: true });

    const slug = cleanText(body.slug, 200);
    const visitor = typeof body.v === "string" && UUID.test(body.v) ? body.v.toLowerCase() : null;
    const position = cleanPosition(body.lat, body.lng);
    if (!slug || !visitor || !position) return NextResponse.json({ ok: false }, { status: 400 });

    const place = await getPlace(slug).catch(() => null);
    if (!place) return NextResponse.json({ ok: false }, { status: 404 });
    if (distanceMeters(position, place) > NEAR) return NextResponse.json({ ok: false, far: true }, { status: 422 });

    const db = publicWriteClient();
    try {
        const known = await db.from("nt_visitors").upsert({ id: visitor }, { onConflict: "id", ignoreDuplicates: true });
        if (known.error) throw known.error;
        const since = new Date(Date.now() - ONCE_EVERY * 3_600_000).toISOString();
        const already = await db.from("nt_arrivals").select("id").eq("visitor_id", visitor).eq("spot_id", place.id).gte("created_at", since).limit(1);
        if (already.error) throw already.error;
        if (!already.data?.length) {
            const saved = await db.from("nt_arrivals").insert({ visitor_id: visitor, spot_id: place.id });
            if (saved.error) throw saved.error;
        }
    } catch (error) {
        console.error("Arrival not saved:", error);
        return NextResponse.json({ ok: false }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
}
