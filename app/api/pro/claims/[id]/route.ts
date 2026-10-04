import { NextResponse } from "next/server";
import { UUID_PATTERN, readJson } from "@/lib/admin-api";
import { cleanPhone, cleanText } from "@/lib/feedback";
import { clientHash, openCode, phoneCode, sameCode, sealCode } from "@/lib/claims/secrets";
import { loadOwnClaim, logClaimEvent, publicClaim, refreshAssessment, type ClaimRow } from "@/lib/claims/server";
import { distanceMeters } from "@/lib/places/geo";
import { requireOwner } from "@/lib/supabase/owner";

type Context = { params: Promise<{ id: string }> };

const CODE_LIFETIME_MS = 72 * 3_600_000;
const MAX_CODE_REQUESTS = 3;
const MAX_CODE_ATTEMPTS = 5;
const EDITABLE = ["DRAFT", "NEEDS_INFO"];
const PROOFS_OPEN = ["DRAFT", "NEEDS_INFO", "PENDING"];

async function setup(context: Context) {
    const auth = await requireOwner();
    if (auth.denied) return { ...auth, claim: null } as const;
    const { id } = await context.params;
    const claim = UUID_PATTERN.test(id) ? await loadOwnClaim(auth.db, id, auth.owner.id) : null;
    if (!claim) return { ...auth, claim: null, denied: NextResponse.json({ ok: false, message: "Demande introuvable." }, { status: 404 }) } as const;
    return { ...auth, claim } as const;
}

function refused(message: string, status = 422) {
    return NextResponse.json({ ok: false, message }, { status });
}

export async function GET(_request: Request, context: Context) {
    const { db, claim, denied } = await setup(context);
    if (denied) return denied;
    const { data: spot } = await db.from("nt_spots").select("slug,name,category,city,neighborhood,latitude,longitude").eq("id", claim.spot_id).single();
    return NextResponse.json({ ok: true, claim: publicClaim(claim), place: spot }, { headers: { "Cache-Control": "private, no-store" } });
}

// Who is claiming: name, role, phone, official page, sworn statement.
export async function PATCH(request: Request, context: Context) {
    const { db, owner, claim, denied } = await setup(context);
    if (denied) return denied;
    if (!EDITABLE.includes(claim.status)) return refused("Cette demande ne peut plus être modifiée.");
    const body = (await readJson(request)) ?? {};

    const changes: Record<string, unknown> = {};
    if ("full_name" in body) changes.full_name = cleanText(body.full_name, 100) ?? "";
    if ("role" in body) changes.role = body.role === "MANAGER" ? "MANAGER" : "OWNER";
    if ("phone" in body) {
        const phone = cleanPhone(body.phone);
        if (phone === undefined) return refused("Numéro de téléphone pas reconnu.");
        changes.phone = phone ?? "";
    }
    if ("social_url" in body) {
        const url = cleanText(body.social_url, 300);
        if (url && !/^https:\/\/(www\.|m\.|web\.)?(facebook\.com|instagram\.com|tiktok\.com|x\.com|twitter\.com|linkedin\.com)\/\S+$/i.test(url)) {
            return refused("Colle le lien complet de la page Facebook, Instagram, TikTok, X ou LinkedIn de l'établissement.");
        }
        if (url !== claim.social_url) changes.social_verified_at = null;
        changes.social_url = url;
    }
    if (body.statement === true && !claim.statement_accepted_at) changes.statement_accepted_at = new Date().toISOString();

    const { data, error } = await db.from("nt_claims").update(changes).eq("id", claim.id).select("*").single();
    if (error) return refused("Enregistrement impossible.", 502);
    await logClaimEvent(db, claim.id, "owner", "details_updated", { fields: Object.keys(changes), by: owner.email });
    await refreshAssessment(db, data as ClaimRow);
    return NextResponse.json({ ok: true, claim: publicClaim(data as ClaimRow) });
}

// One step of the claim: { action: "onsite" | "phone_request" | "phone_verify" | "submit" | "withdraw" }.
export async function POST(request: Request, context: Context) {
    const { db, owner, claim, denied } = await setup(context);
    if (denied) return denied;
    const body = (await readJson(request)) ?? {};
    const now = new Date().toISOString();
    let changes: Record<string, unknown> = {};

    switch (body.action) {
        case "onsite": {
            if (!PROOFS_OPEN.includes(claim.status)) return refused("Cette demande est close.");
            const lat = Number(body.lat);
            const lng = Number(body.lng);
            const accuracy = Math.round(Number(body.accuracy));
            if (![lat, lng, accuracy].every(Number.isFinite) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return refused("Position invalide.");
            const { data: spot } = await db.from("nt_spots").select("latitude,longitude").eq("id", claim.spot_id).single();
            if (spot?.latitude == null || spot.longitude == null) return refused("Ce lieu n'a pas de position connue.");
            const distance = distanceMeters({ lat, lng }, { lat: spot.latitude, lng: spot.longitude });
            changes = { onsite_lat: lat, onsite_lng: lng, onsite_accuracy: accuracy, onsite_distance_m: distance, onsite_at: now };
            await logClaimEvent(db, claim.id, "owner", "onsite_checked", { distance, accuracy });
            break;
        }
        case "phone_request": {
            if (!PROOFS_OPEN.includes(claim.status)) return refused("Cette demande est close.");
            if (!claim.listing_phone) return refused("La fiche n'a pas de numéro de téléphone : utilise une autre preuve.");
            if (claim.phone_verified_at) return refused("Ton numéro est déjà confirmé.");
            const { count } = await db.from("nt_claim_events").select("id", { count: "exact", head: true }).eq("claim_id", claim.id).eq("action", "phone_code_requested");
            if ((count ?? 0) >= MAX_CODE_REQUESTS) return refused("Trop de demandes de code. Utilise une autre preuve ou contacte l'équipe.", 429);
            changes = { phone_code_secret: sealCode(phoneCode()), phone_code_requested_at: now, phone_code_sent_at: null, phone_code_attempts: 0 };
            await logClaimEvent(db, claim.id, "owner", "phone_code_requested");
            break;
        }
        case "phone_verify": {
            const code = openCode(claim.phone_code_secret);
            if (!code || !claim.phone_code_requested_at) return refused("Demande d'abord un code.");
            if (Date.now() - new Date(claim.phone_code_requested_at).getTime() > CODE_LIFETIME_MS) return refused("Ce code a expiré. Demandes-en un nouveau.");
            if (claim.phone_code_attempts >= MAX_CODE_ATTEMPTS) return refused("Trop d'essais. Demande un nouveau code.", 429);
            if (!sameCode(code, String(body.code ?? ""))) {
                await db.from("nt_claims").update({ phone_code_attempts: claim.phone_code_attempts + 1 }).eq("id", claim.id);
                await logClaimEvent(db, claim.id, "owner", "phone_code_failed", { attempt: claim.phone_code_attempts + 1 });
                return refused(`Code incorrect. Il te reste ${MAX_CODE_ATTEMPTS - claim.phone_code_attempts - 1} essai(s).`);
            }
            changes = { phone_verified_at: now, phone_code_secret: null };
            await logClaimEvent(db, claim.id, "owner", "phone_verified");
            break;
        }
        case "submit": {
            if (!EDITABLE.includes(claim.status)) return refused("Cette demande est déjà envoyée.");
            if (claim.full_name.trim().length < 3) return refused("Indique ton nom complet.");
            if (!claim.phone) return refused("Indique ton numéro de téléphone.");
            if (!claim.statement_accepted_at) return refused("Coche la déclaration sur l'honneur.");
            const hasProof =
                claim.phone_code_secret || claim.phone_verified_at || (claim.documents ?? []).length > 0 || claim.social_url || (claim.onsite_distance_m !== null && claim.onsite_distance_m <= 150);
            if (!hasProof) return refused("Ajoute au moins une preuve avant d'envoyer.");
            changes = { status: "PENDING", submitted_at: now, message_to_owner: null, client_hash: clientHash(request) };
            await logClaimEvent(db, claim.id, "owner", claim.status === "NEEDS_INFO" ? "resubmitted" : "submitted", { by: owner.email });
            break;
        }
        case "withdraw": {
            if (!["DRAFT", "PENDING", "NEEDS_INFO"].includes(claim.status)) return refused("Cette demande est déjà close.");
            changes = { status: "WITHDRAWN", decided_at: now, phone_code_secret: null };
            await logClaimEvent(db, claim.id, "owner", "withdrawn");
            break;
        }
        default:
            return refused("Action inconnue.", 400);
    }

    const { data, error } = await db.from("nt_claims").update(changes).eq("id", claim.id).select("*").single();
    if (error) return refused("Enregistrement impossible.", 502);
    await refreshAssessment(db, data as ClaimRow);
    return NextResponse.json({ ok: true, claim: publicClaim(data as ClaimRow) });
}
