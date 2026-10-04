import { NextResponse } from "next/server";
import { readJson } from "@/lib/admin-api";
import { claimCode, clientHash } from "@/lib/claims/secrets";
import { OPEN_STATUSES, logClaimEvent, publicClaim, refreshAssessment, type ClaimRow } from "@/lib/claims/server";
import { requireOwner } from "@/lib/supabase/owner";

// POST /api/pro/claims { slug } — starts (or resumes) a claim on a place.
export async function POST(request: Request) {
    const { owner, db, denied } = await requireOwner();
    if (denied) return denied;
    const body = await readJson(request);
    const slug = typeof body?.slug === "string" ? body.slug : "";
    if (!/^[a-z0-9-]{1,200}$/.test(slug)) return NextResponse.json({ ok: false, message: "Lieu inconnu." }, { status: 400 });

    const { data: spot } = await db.from("nt_spots").select("id,phone,status").eq("slug", slug).maybeSingle();
    if (!spot || spot.status !== "APPROVED") return NextResponse.json({ ok: false, message: "Ce lieu n'est pas publié." }, { status: 404 });

    // Already managing it?
    const { data: owned } = await db.from("nt_place_owners").select("id").eq("spot_id", spot.id).eq("user_id", owner.id).is("revoked_at", null).maybeSingle();
    if (owned) return NextResponse.json({ ok: true, owned: true });

    // Resume the open claim on this place if there is one.
    const { data: open } = await db.from("nt_claims").select("*").eq("spot_id", spot.id).eq("user_id", owner.id).in("status", OPEN_STATUSES).maybeSingle();
    if (open) return NextResponse.json({ ok: true, claim: publicClaim(open as ClaimRow) });

    // Limits against mass claiming.
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const [today, active] = await Promise.all([
        db.from("nt_claims").select("id", { count: "exact", head: true }).eq("user_id", owner.id).gte("created_at", since),
        db.from("nt_claims").select("id", { count: "exact", head: true }).eq("user_id", owner.id).in("status", OPEN_STATUSES),
    ]);
    if ((today.count ?? 0) >= 5 || (active.count ?? 0) >= 3) {
        return NextResponse.json({ ok: false, message: "Tu as déjà plusieurs demandes en cours. Termine-les avant d'en ouvrir une nouvelle." }, { status: 429 });
    }

    const { data, error } = await db
        .from("nt_claims")
        .insert({
            spot_id: spot.id,
            user_id: owner.id,
            user_email: owner.email,
            full_name: owner.name ?? "",
            phone: "",
            code: claimCode(),
            listing_phone: spot.phone ?? null,
            client_hash: clientHash(request),
        })
        .select("*")
        .single();
    if (error) {
        console.error("Claim creation failed:", error);
        return NextResponse.json({ ok: false, message: "Impossible de commencer la demande." }, { status: 502 });
    }
    await logClaimEvent(db, data.id, "owner", "started", { email: owner.email });
    await refreshAssessment(db, data as ClaimRow);
    return NextResponse.json({ ok: true, claim: publicClaim(data as ClaimRow) });
}
