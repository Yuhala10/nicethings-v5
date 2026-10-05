import { NextResponse } from "next/server";
import { UUID_PATTERN, fail, readJson, requireAdmin } from "@/lib/admin-api";
import { cleanText } from "@/lib/feedback";
import { assess, type ClaimFile } from "@/lib/claims/score";
import { openCode } from "@/lib/claims/secrets";
import { PROOF_BUCKET, claimContext, logClaimEvent, refreshAssessment, type ClaimRow } from "@/lib/claims/server";
import { refreshPlaces } from "@/lib/refresh";

type Context = { params: Promise<{ id: string }> };

async function loadClaim(db: NonNullable<Awaited<ReturnType<typeof requireAdmin>>["db"]>, context: Context) {
    const { id } = await context.params;
    if (!UUID_PATTERN.test(id)) return null;
    const { data } = await db.from("nt_claims").select("*").eq("id", id).maybeSingle();
    return (data as ClaimRow | null) ?? null;
}

// Everything the team needs to decide: the claim, the place, a live trust
// assessment, the proof files (links valid one minute), the code to send,
// other claims on the same place and the full history.
export async function GET(_request: Request, context: Context) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const claim = await loadClaim(db, context);
    if (!claim) return NextResponse.json({ ok: false, message: "Demande introuvable." }, { status: 404 });

    try {
        const files = (claim.documents ?? []) as ClaimFile[];
        const [spot, events, others, owners, signed, context2] = await Promise.all([
            db.from("nt_spots").select("id,slug,name,category,city,neighborhood,phone,whatsapp,website,source,latitude,longitude,verified,claimed,created_at").eq("id", claim.spot_id).single(),
            db.from("nt_claim_events").select("actor,action,detail,created_at").eq("claim_id", claim.id).order("created_at"),
            db.from("nt_claims").select("id,status,full_name,user_email,trust_score,created_at").eq("spot_id", claim.spot_id).neq("id", claim.id).order("created_at", { ascending: false }),
            db.from("nt_place_owners").select("user_id,role,created_at,revoked_at").eq("spot_id", claim.spot_id),
            files.length ? db.storage.from(PROOF_BUCKET).createSignedUrls(files.map((file) => file.path), 60) : Promise.resolve({ data: [] as { signedUrl: string }[], error: null }),
            claimContext(db, claim),
        ]);
        if (spot.error) throw spot.error;

        const assessment = assess({ ...claim, documents: files }, context2);
        const code = claim.phone_verified_at ? null : openCode(claim.phone_code_secret);

        return NextResponse.json(
            {
                ok: true,
                claim: { ...claim, phone_code_secret: undefined, client_hash: undefined },
                code,
                place: spot.data,
                files: files.map((file, index) => ({ ...file, url: signed.data?.[index]?.signedUrl ?? null })),
                events: events.data ?? [],
                others: others.data ?? [],
                owners: owners.data ?? [],
                assessment,
            },
            { headers: { "Cache-Control": "private, no-store" } }
        );
    } catch (error) {
        return fail(error);
    }
}

// PATCH { action, ... } — one team decision, always written to the history.
export async function PATCH(request: Request, context: Context) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const claim = await loadClaim(db, context);
    if (!claim) return NextResponse.json({ ok: false, message: "Demande introuvable." }, { status: 404 });
    const body = (await readJson(request)) ?? {};
    const now = new Date().toISOString();
    const note = cleanText(body.note ?? body.message ?? body.reason, 1000);
    const say = (message: string, status = 422) => NextResponse.json({ ok: false, message }, { status });
    let changes: Record<string, unknown> = {};

    switch (body.action) {
        case "code_sent":
            changes = { phone_code_sent_at: now };
            break;
        case "papers":
            changes = { documents_checked_at: body.ok === true ? now : null };
            break;
        case "social":
            changes = { social_verified_at: body.ok === true ? now : null };
            break;
        case "field_visit":
            changes = { field_visit_at: now, field_visit_note: note };
            break;
        case "note":
            changes = { review_note: note };
            break;
        case "needs_info":
            if (!note) return say("Écris ce qu'il manque au demandeur.");
            changes = { status: "NEEDS_INFO", message_to_owner: note };
            break;
        case "reject":
            if (!note) return say("Indique la raison du refus (elle sera montrée au demandeur).");
            changes = { status: "REJECTED", message_to_owner: note, review_note: note, decided_at: now, decided_by: "équipe", phone_code_secret: null };
            break;
        case "approve": {
            if (!["PENDING", "NEEDS_INFO"].includes(claim.status)) return say("Seule une demande envoyée peut être validée.");
            const assessment = assess({ ...claim, documents: (claim.documents ?? []) as ClaimFile[] }, await claimContext(db, claim));
            // Forcing past the rules is possible, but only with a written reason.
            if (!assessment.canApprove && !(body.override === true && note && note.length >= 15)) return say(assessment.blocker ?? "Conditions non remplies.");
            const link = await db.from("nt_place_owners").insert({ spot_id: claim.spot_id, user_id: claim.user_id, role: claim.role, claim_id: claim.id });
            if (link.error && link.error.code !== "23505") return fail(link.error);
            await db.from("nt_spots").update({ claimed: true }).eq("id", claim.spot_id);
            changes = { status: "APPROVED", decided_at: now, decided_by: "équipe", review_note: note ?? claim.review_note, phone_code_secret: null, message_to_owner: null };
            if (!assessment.canApprove) await logClaimEvent(db, claim.id, "team", "approved_with_override", { reason: note, blocker: assessment.blocker });
            refreshPlaces();
            break;
        }
        case "revoke": {
            if (!note) return say("Indique pourquoi l'accès est retiré.");
            await db.from("nt_place_owners").update({ revoked_at: now, revoked_reason: note }).eq("spot_id", claim.spot_id).eq("user_id", claim.user_id).is("revoked_at", null);
            const { count } = await db.from("nt_place_owners").select("id", { count: "exact", head: true }).eq("spot_id", claim.spot_id).is("revoked_at", null);
            if (!count) await db.from("nt_spots").update({ claimed: false }).eq("id", claim.spot_id);
            changes = { review_note: note };
            refreshPlaces();
            break;
        }
        default:
            return say("Action inconnue.", 400);
    }

    const { data, error } = await db.from("nt_claims").update(changes).eq("id", claim.id).select("*").single();
    if (error) return fail(error);
    await logClaimEvent(db, claim.id, "team", String(body.action), note ? { note } : {});
    await refreshAssessment(db, data as ClaimRow);
    return NextResponse.json({ ok: true });
}
