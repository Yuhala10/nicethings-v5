import { NextResponse } from "next/server";
import { getPlace } from "@/lib/places/server";
import { UUID } from "@/lib/posts";
import { currentProfile, readBody, robot } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// A WhatsApp message or a call started from a place's page. Counted, so
// its owner sees the customers NiceThings sends them. Nothing is said back:
// the message or the call goes on whatever happens here.
export async function POST(request: Request) {
    const body = await readBody(request);
    if (robot(request, body)) return NextResponse.json({ ok: false }, { status: 400 });
    const channel = body.channel === "whatsapp" || body.channel === "call" ? body.channel : null;
    const place = typeof body.place === "string" && body.place.length <= 200 ? await getPlace(body.place).catch(() => null) : null;
    if (!channel || !place) return NextResponse.json({ ok: false }, { status: 400 });
    const visitor = typeof body.v === "string" && UUID.test(body.v) ? body.v.toLowerCase() : null;
    const profile = await currentProfile().catch(() => null);
    const db = getSupabaseAdminClient();
    // The same phone tapping again within ten minutes is one customer.
    if (visitor) {
        const since = new Date(Date.now() - 600_000).toISOString();
        const again = await db.from("nt_place_contacts").select("id").eq("spot_id", place.id).eq("visitor_id", visitor).gte("created_at", since).limit(1);
        if (again.data?.length) return NextResponse.json({ ok: true });
    }
    await db.from("nt_place_contacts").insert({ spot_id: place.id, channel, visitor_id: visitor, profile_id: profile?.id ?? null });
    return NextResponse.json({ ok: true });
}
