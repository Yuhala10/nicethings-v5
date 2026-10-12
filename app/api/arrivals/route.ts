import { NextResponse, userAgent } from "next/server";
import { looksAutomated } from "@/lib/analytics";
import { cleanPosition, cleanText, publicWriteClient } from "@/lib/feedback";
import { distanceMeters } from "@/lib/places/geo";
import { getPlace } from "@/lib/places/server";

// "Yes, I see it": sent at the end of the guidance, when the phone itself
// measured that the visitor is beside the place and they say they see it
// (components/route/NearSheet.tsx). It is what lets a place page say
// "confirmed on the spot by visitors". Only the fact is kept (which place,
// when, and the random id the browser already uses for audience counting):
// the position is used for the check below and not stored with it.
//
// One exception, to correct the map. When the visitor had to look for the
// place (`found`), or when its pin is only roughly placed, the spot where
// they found it is passed to the team as a note on the place, without the
// visitor's id. A person moves the pin, never this route.

// The visitor must be this close to the place, in metres. A pin that is only
// roughly placed is given more room: finding the real spot is the point.
const NEAR = 150;
const NEAR_ROUGH = 400;
// A found spot is worth a note when it is this far from the pin, and the
// phone knew where it was this well, both in metres.
const WORTH_NOTING = 30;
const SURE = 40;
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
    const away = distanceMeters(position, place);
    if (away > (place.positionExact ? NEAR : NEAR_ROUGH)) return NextResponse.json({ ok: false, far: true }, { status: 422 });
    const accuracy = Number(body.acc);
    const noteSpot = (body.found === true || !place.positionExact) && away > WORTH_NOTING && Number.isFinite(accuracy) && accuracy > 0 && accuracy <= SURE;

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
            if (noteSpot) {
                const noted = await db.from("nt_reports").insert({
                    spot_id: place.id,
                    reason: "location",
                    description: `Trouvé sur place par un visiteur du guidage : ${position.lat.toFixed(5)}, ${position.lng.toFixed(5)} (précision ${Math.round(accuracy)} m), à ${Math.round(away)} m du point de la carte.`,
                    status: "PENDING",
                });
                // The confirmation itself is saved: a note that did not go through is not worth failing for.
                if (noted.error) console.error("Found spot not noted:", noted.error);
            }
        }
    } catch (error) {
        console.error("Arrival not saved:", error);
        return NextResponse.json({ ok: false }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
}
