import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { assess, type ClaimContext, type ClaimFacts, type ClaimFile } from "./score";

// Shared server logic for claims: loading, the trust assessment, the audit
// trail and the private proof files.

export const PROOF_BUCKET = "claim-proofs";
export const OPEN_STATUSES = ["DRAFT", "PENDING", "NEEDS_INFO"];
export const MAX_FILES = 12;
const PROOF_RETENTION_DAYS = 30;

export type ClaimRow = ClaimFacts & {
    id: string;
    spot_id: string;
    user_id: string;
    status: "DRAFT" | "PENDING" | "NEEDS_INFO" | "APPROVED" | "REJECTED" | "WITHDRAWN";
    full_name: string;
    role: "OWNER" | "MANAGER";
    statement_accepted_at: string | null;
    code: string;
    phone_code_secret: string | null;
    phone_code_requested_at: string | null;
    phone_code_sent_at: string | null;
    phone_code_attempts: number;
    onsite_lat: number | null;
    onsite_lng: number | null;
    onsite_at: string | null;
    documents_purged_at: string | null;
    field_visit_note: string | null;
    trust_score: number;
    risk_flags: unknown;
    client_hash: string | null;
    message_to_owner: string | null;
    review_note: string | null;
    decided_at: string | null;
    decided_by: string | null;
    submitted_at: string | null;
    created_at: string;
    updated_at: string;
};

export async function logClaimEvent(db: SupabaseClient, claimId: string, actor: "owner" | "team" | "system", action: string, detail: Record<string, unknown> = {}) {
    const { error } = await db.from("nt_claim_events").insert({ claim_id: claimId, actor, action, detail });
    if (error) console.error("Claim event not saved:", error);
}

export async function claimContext(db: SupabaseClient, claim: Pick<ClaimRow, "id" | "spot_id" | "user_id" | "client_hash">): Promise<ClaimContext> {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [spot, owners, recent, rejected, shared] = await Promise.all([
        db.from("nt_spots").select("website,source").eq("id", claim.spot_id).maybeSingle(),
        db.from("nt_place_owners").select("user_id").eq("spot_id", claim.spot_id).is("revoked_at", null).neq("user_id", claim.user_id),
        db.from("nt_claims").select("id", { count: "exact", head: true }).eq("user_id", claim.user_id).gte("created_at", since),
        db.from("nt_claims").select("id", { count: "exact", head: true }).eq("user_id", claim.user_id).eq("spot_id", claim.spot_id).eq("status", "REJECTED"),
        claim.client_hash
            ? db.from("nt_claims").select("user_id").eq("client_hash", claim.client_hash).neq("user_id", claim.user_id)
            : Promise.resolve({ data: [] as { user_id: string }[], error: null }),
    ]);
    return {
        placeWebsite: (spot.data?.website as string | null) ?? null,
        placeSource: (spot.data?.source as string | null) ?? null,
        otherOwners: owners.data?.length ?? 0,
        recentClaims: recent.count ?? 0,
        sharedDevice: new Set((shared.data ?? []).map((row) => row.user_id)).size,
        rejectedBefore: (rejected.count ?? 0) > 0,
    };
}

// Recomputes and stores the score and warning signs of a claim.
export async function refreshAssessment(db: SupabaseClient, claim: ClaimRow) {
    const result = assess({ ...claim, documents: (claim.documents ?? []) as ClaimFile[] }, await claimContext(db, claim));
    await db.from("nt_claims").update({ trust_score: result.score, risk_flags: result.flags }).eq("id", claim.id);
    return result;
}

export async function loadOwnClaim(db: SupabaseClient, id: string, userId: string) {
    const { data, error } = await db.from("nt_claims").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
    if (error) throw error;
    return (data as ClaimRow | null) ?? null;
}

// What the claimant may see about their own claim: never the phone code,
// the team's notes or the warning signs.
export function publicClaim(claim: ClaimRow) {
    const digits = (claim.listing_phone ?? "").replace(/\D/g, "").slice(-9);
    return {
        id: claim.id,
        status: claim.status,
        full_name: claim.full_name,
        role: claim.role,
        phone: claim.phone,
        code: claim.code,
        statement_accepted_at: claim.statement_accepted_at,
        // "6 79 •• •• 92": enough to recognise it, not to copy it.
        listing_phone: digits.length === 9 ? `${digits[0]} ${digits.slice(1, 3)} •• •• ${digits.slice(7)}` : null,
        phone_code_requested: Boolean(claim.phone_code_secret),
        phone_code_sent_at: claim.phone_code_sent_at,
        phone_code_attempts: claim.phone_code_attempts,
        phone_verified_at: claim.phone_verified_at,
        onsite_distance_m: claim.onsite_distance_m,
        onsite_accuracy: claim.onsite_accuracy,
        onsite_at: claim.onsite_at,
        documents: ((claim.documents ?? []) as ClaimFile[]).map(({ kind, path, type, at }) => ({ kind, id: path.split("/").pop()!, type, at })),
        documents_checked_at: claim.documents_checked_at,
        social_url: claim.social_url,
        social_verified_at: claim.social_verified_at,
        field_visit_at: claim.field_visit_at,
        message_to_owner: claim.message_to_owner,
        submitted_at: claim.submitted_at,
        decided_at: claim.decided_at,
        created_at: claim.created_at,
    };
}

export type PublicClaim = ReturnType<typeof publicClaim>;

// Validates an uploaded proof by its content. Pictures are decoded and
// re-encoded (nothing hidden survives, and they stay light); PDFs must
// really be PDFs.
export async function readProofFile(file: File) {
    if (file.size > 10 * 1024 * 1024) return { error: "Fichier trop lourd (10 Mo max)." } as const;
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.subarray(0, 5).toString("latin1") === "%PDF-") return { data: bytes, type: "application/pdf", extension: "pdf" } as const;
    try {
        const data = await sharp(bytes).rotate().resize(2200, 2200, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
        return { data, type: "image/jpeg", extension: "jpg" } as const;
    } catch {
        return { error: "Envoie une photo (JPEG, PNG, WebP) ou un PDF." } as const;
    }
}

// Proof files are deleted 30 days after a decision: we keep the decision
// and its history, not people's papers.
export async function purgeOldProofs(db: SupabaseClient) {
    const before = new Date(Date.now() - PROOF_RETENTION_DAYS * 86_400_000).toISOString();
    const { data } = await db
        .from("nt_claims")
        .select("id,documents")
        .in("status", ["APPROVED", "REJECTED", "WITHDRAWN"])
        .lt("decided_at", before)
        .is("documents_purged_at", null)
        .limit(50);
    for (const claim of data ?? []) {
        const paths = ((claim.documents ?? []) as ClaimFile[]).map((file) => file.path);
        if (paths.length) await db.storage.from(PROOF_BUCKET).remove(paths);
        await db.from("nt_claims").update({ documents: [], documents_purged_at: new Date().toISOString() }).eq("id", claim.id);
        await logClaimEvent(db, claim.id, "system", "proofs_purged", { files: paths.length });
    }
}
