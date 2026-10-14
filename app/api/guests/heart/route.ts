import { NextResponse, userAgent } from "next/server";
import { looksAutomated } from "@/lib/analytics";
import { getGuest } from "@/lib/guests";
import { UUID } from "@/lib/posts";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// Hearts for a guest ("I love these places"): one per browser (its random
// id). The count kept on the guest is recounted each time, so it cannot
// drift. Only for guests whose page is out.
//   GET  ?slug=…                 the count now
//   POST { slug, v, on }         give a heart, or take it back

const SLUG = /^[a-z0-9-]{1,60}$/;

async function count(ref: string) {
    const db = getSupabaseAdminClient();
    const counted = await db.from("nt_guest_hearts").select("guest_ref", { count: "exact", head: true }).eq("guest_ref", ref);
    if (counted.error) throw counted.error;
    return counted.count ?? 0;
}

export async function GET(request: Request) {
    const slug = new URL(request.url).searchParams.get("slug") ?? "";
    const guest = SLUG.test(slug) ? await getGuest(slug) : null;
    if (!guest) return NextResponse.json({ ok: false }, { status: 404 });
    try {
        return NextResponse.json({ ok: true, hearts: await count(guest.ref) }, { headers: { "Cache-Control": "public, max-age=10, s-maxage=10" } });
    } catch (error) {
        console.error("Hearts not read:", error);
        return NextResponse.json({ ok: false }, { status: 502 });
    }
}

export async function POST(request: Request) {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }
    const agent = userAgent(request);
    if (agent.isBot || looksAutomated(agent.ua)) return NextResponse.json({ ok: false }, { status: 400 });
    const slug = typeof body.slug === "string" && SLUG.test(body.slug) ? body.slug : null;
    const visitor = typeof body.v === "string" && UUID.test(body.v) ? body.v.toLowerCase() : null;
    if (!slug || !visitor) return NextResponse.json({ ok: false }, { status: 400 });

    const guest = await getGuest(slug);
    if (!guest) return NextResponse.json({ ok: false }, { status: 404 });
    const db = getSupabaseAdminClient();
    try {
        const change =
            body.on === false
                ? await db.from("nt_guest_hearts").delete().eq("guest_ref", guest.ref).eq("visitor_id", visitor)
                : await db.from("nt_guest_hearts").upsert({ guest_ref: guest.ref, visitor_id: visitor }, { onConflict: "guest_ref,visitor_id", ignoreDuplicates: true });
        if (change.error) throw change.error;
        const hearts = await count(guest.ref);
        const saved = await db.from("nt_guests").update({ hearts }).eq("ref", guest.ref);
        if (saved.error) throw saved.error;
        return NextResponse.json({ ok: true, hearts });
    } catch (error) {
        console.error("Heart not saved:", error);
        return NextResponse.json({ ok: false }, { status: 502 });
    }
}
