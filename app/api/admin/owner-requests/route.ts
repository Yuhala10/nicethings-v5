import { NextResponse } from "next/server";
import { fail, readJson, requireAdmin } from "@/lib/admin-api";
import { CATEGORIES } from "@/lib/tags";
import { refreshPlaces } from "@/lib/refresh";

// Corrections owners asked for on fields only the team may change (name,
// category, address, position).

export async function GET() {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const { data, error } = await db
        .from("nt_spot_changes")
        .select("id,old_value,new_value,created_at, spot:nt_spots(id,slug,name,city)")
        .eq("field", "request")
        .eq("status", "PENDING")
        .order("created_at")
        .limit(100);
    if (error) {
        if (error.code === "PGRST205" || error.code === "42P01") return NextResponse.json({ ok: true, rows: [] });
        return fail(error);
    }
    return NextResponse.json({ ok: true, rows: data ?? [] });
}

// PATCH { id, action: "apply" | "reject" }
export async function PATCH(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const body = (await readJson(request)) ?? {};
    const id = Number(body.id);
    if (!Number.isInteger(id)) return NextResponse.json({ ok: false, message: "Requête invalide." }, { status: 400 });
    const { data: change } = await db.from("nt_spot_changes").select("*").eq("id", id).eq("status", "PENDING").maybeSingle();
    if (!change) return NextResponse.json({ ok: false, message: "Demande introuvable ou déjà traitée." }, { status: 404 });

    if (body.action === "apply") {
        const wanted = (change.new_value ?? {}) as { name?: string; category?: string; address?: string; position?: { lat: number; lng: number } };
        const update: Record<string, unknown> = {};
        if (wanted.name) update.name = wanted.name;
        if (wanted.category && wanted.category in CATEGORIES) update.category = wanted.category;
        if (wanted.address) update.address = wanted.address;
        if (wanted.position) {
            update.latitude = wanted.position.lat;
            update.longitude = wanted.position.lng;
        }
        if (Object.keys(update).length) {
            const { error } = await db.from("nt_spots").update(update).eq("id", change.spot_id);
            if (error) return fail(error);
            refreshPlaces();
        }
    }
    const { error } = await db.from("nt_spot_changes").update({ status: body.action === "apply" ? "APPLIED" : "REJECTED" }).eq("id", id);
    if (error) return fail(error);
    return NextResponse.json({ ok: true });
}
