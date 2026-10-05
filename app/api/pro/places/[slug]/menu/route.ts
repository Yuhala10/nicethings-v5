import { NextResponse } from "next/server";
import { readMenu } from "@/lib/claims/owner-edits";
import { ownedSpot } from "@/lib/claims/owned";
import { requireOwner } from "@/lib/supabase/owner";
import { refreshPlaces } from "@/lib/refresh";

// PUT { items: [...] } — replaces the whole menu (prices in FCFA).
export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { owner, db, denied } = await requireOwner();
    if (denied) return denied;
    const owned = await ownedSpot(db, owner.id, (await params).slug);
    if (!owned) return NextResponse.json({ ok: false, message: "Tu ne gères pas ce lieu." }, { status: 403 });

    const body = await request.json().catch(() => null);
    const items = readMenu(body?.items);
    if (!items) return NextResponse.json({ ok: false, message: "Menu invalide." }, { status: 400 });

    const { data: before } = await db.from("nt_spot_menu").select("name,description,price,popular,available").eq("spot_id", owned.spot.id).order("created_at");
    const removed = await db.from("nt_spot_menu").delete().eq("spot_id", owned.spot.id);
    if (removed.error) return NextResponse.json({ ok: false, message: "Enregistrement impossible." }, { status: 502 });
    if (items.length) {
        const inserted = await db.from("nt_spot_menu").insert(items.map((item) => ({ ...item, spot_id: owned.spot.id, currency: "XAF" })));
        if (inserted.error) {
            // Put the old menu back rather than leave it empty.
            if (before?.length) await db.from("nt_spot_menu").insert(before.map((item) => ({ ...item, spot_id: owned.spot.id })));
            return NextResponse.json({ ok: false, message: "Enregistrement impossible." }, { status: 502 });
        }
    }
    await db.from("nt_spot_changes").insert({ spot_id: owned.spot.id, user_id: owner.id, field: "menu", old_value: before ?? [], new_value: items, status: "APPLIED" });
    refreshPlaces();
    return NextResponse.json({ ok: true, count: items.length });
}
