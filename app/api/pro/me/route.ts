import { NextResponse } from "next/server";
import { publicClaim, type ClaimRow } from "@/lib/claims/server";
import { cityByName } from "@/lib/cities";
import { currentOwner } from "@/lib/supabase/owner";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// GET /api/pro/me — the signed-in owner, the places they manage and their
// claims. Signed out: { user: null }.
export async function GET() {
    const owner = await currentOwner();
    if (!owner) return NextResponse.json({ ok: true, user: null }, { headers: { "Cache-Control": "private, no-store" } });
    const db = getSupabaseAdminClient();

    const [owned, claims] = await Promise.all([
        db.from("nt_place_owners").select("role,created_at,spot:nt_spots(id,slug,name,category,city,neighborhood,status)").eq("user_id", owner.id).is("revoked_at", null),
        db.from("nt_claims").select("*, spot:nt_spots(slug,name,category,city,neighborhood)").eq("user_id", owner.id).order("created_at", { ascending: false }).limit(30),
    ]);
    if (owned.error || claims.error) {
        const error = owned.error ?? claims.error;
        // Claims are not set up yet in the database.
        if (error?.code === "PGRST205" || error?.code === "42P01") return NextResponse.json({ ok: true, user: owner, places: [], claims: [], setup: true });
        console.error("Owner overview failed:", error);
        return NextResponse.json({ ok: false, message: "Chargement impossible." }, { status: 502 });
    }

    const place = (spot: Record<string, unknown> | null) =>
        spot && { ...spot, city: cityByName(spot.city as string)?.slug ?? null };

    return NextResponse.json(
        {
            ok: true,
            user: owner,
            places: (owned.data ?? []).map((row) => ({ role: row.role, since: row.created_at, place: place(row.spot as unknown as Record<string, unknown>) })),
            claims: (claims.data ?? []).map((row) => ({ ...publicClaim(row as unknown as ClaimRow), place: place(row.spot as unknown as Record<string, unknown>) })),
        },
        { headers: { "Cache-Control": "private, no-store" } }
    );
}
