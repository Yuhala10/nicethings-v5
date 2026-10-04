import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { UUID_PATTERN } from "@/lib/admin-api";
import type { ClaimFile } from "@/lib/claims/score";
import { MAX_FILES, PROOF_BUCKET, loadOwnClaim, logClaimEvent, publicClaim, readProofFile, refreshAssessment, type ClaimRow } from "@/lib/claims/server";
import { requireOwner } from "@/lib/supabase/owner";

type Context = { params: Promise<{ id: string }> };
const KINDS = ["storefront", "business", "id", "other"] as const;
const OPEN = ["DRAFT", "NEEDS_INFO", "PENDING"];

// Proof files go to a PRIVATE bucket: only the team console can open them,
// through links that expire after a minute.
export async function POST(request: Request, context: Context) {
    const { owner, db, denied } = await requireOwner();
    if (denied) return denied;
    const { id } = await context.params;
    const claim = UUID_PATTERN.test(id) ? await loadOwnClaim(db, id, owner.id) : null;
    if (!claim) return NextResponse.json({ ok: false, message: "Demande introuvable." }, { status: 404 });
    if (!OPEN.includes(claim.status)) return NextResponse.json({ ok: false, message: "Cette demande est close." }, { status: 422 });

    const files = (claim.documents ?? []) as ClaimFile[];
    if (files.length >= MAX_FILES) return NextResponse.json({ ok: false, message: `${MAX_FILES} fichiers maximum.` }, { status: 422 });

    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return NextResponse.json({ ok: false, message: "Envoi invalide." }, { status: 400 });
    }
    const kind = KINDS.find((value) => value === form.get("kind")) ?? "other";
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, message: "Aucun fichier." }, { status: 400 });

    const proof = await readProofFile(file);
    if ("error" in proof) return NextResponse.json({ ok: false, message: proof.error }, { status: 415 });

    const path = `${claim.id}/${kind}-${randomUUID()}.${proof.extension}`;
    const upload = await db.storage.from(PROOF_BUCKET).upload(path, proof.data, { contentType: proof.type, upsert: false });
    if (upload.error) {
        console.error("Proof upload failed:", upload.error);
        return NextResponse.json({ ok: false, message: "Envoi impossible, réessaie." }, { status: 502 });
    }

    const documents = [...files, { kind, path, type: proof.type, at: new Date().toISOString() }];
    const { data, error } = await db.from("nt_claims").update({ documents, documents_checked_at: null }).eq("id", claim.id).select("*").single();
    if (error) return NextResponse.json({ ok: false, message: "Enregistrement impossible." }, { status: 502 });
    await logClaimEvent(db, claim.id, "owner", "file_added", { kind });
    await refreshAssessment(db, data as ClaimRow);
    return NextResponse.json({ ok: true, claim: publicClaim(data as ClaimRow) });
}

// DELETE ?file=<id> — removes one of your files while the claim is open.
export async function DELETE(request: Request, context: Context) {
    const { owner, db, denied } = await requireOwner();
    if (denied) return denied;
    const { id } = await context.params;
    const claim = UUID_PATTERN.test(id) ? await loadOwnClaim(db, id, owner.id) : null;
    if (!claim || !OPEN.includes(claim.status)) return NextResponse.json({ ok: false, message: "Demande introuvable ou close." }, { status: 404 });

    const fileId = new URL(request.url).searchParams.get("file") ?? "";
    const files = (claim.documents ?? []) as ClaimFile[];
    const target = files.find((file) => file.path.endsWith(`/${fileId}`));
    if (!target) return NextResponse.json({ ok: false, message: "Fichier introuvable." }, { status: 404 });

    await db.storage.from(PROOF_BUCKET).remove([target.path]);
    const { data, error } = await db
        .from("nt_claims")
        .update({ documents: files.filter((file) => file !== target), documents_checked_at: null })
        .eq("id", claim.id)
        .select("*")
        .single();
    if (error) return NextResponse.json({ ok: false, message: "Suppression impossible." }, { status: 502 });
    await logClaimEvent(db, claim.id, "owner", "file_removed", { kind: target.kind });
    await refreshAssessment(db, data as ClaimRow);
    return NextResponse.json({ ok: true, claim: publicClaim(data as ClaimRow) });
}
