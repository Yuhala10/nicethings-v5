import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { UUID_PATTERN, fail, requireAdmin } from "@/lib/admin-api";

const BUCKET = "blog-images";
const MAX_BYTES = 8 * 1024 * 1024;

// Upload a picture for an article (resized on the phone first). The file is
// checked by decoding it, not by trusting its name or type, and re-encoded
// so no hidden content or location data (EXIF) survives.
export async function POST(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;

    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return NextResponse.json({ ok: false, message: "Envoi invalide." }, { status: 400 });
    }
    const postId = String(form.get("postId") ?? "");
    const file = form.get("file");
    if (!UUID_PATTERN.test(postId) || !(file instanceof File)) return NextResponse.json({ ok: false, message: "Envoi invalide." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, message: "Photo trop lourde (8 Mo max)." }, { status: 413 });

    let jpeg: Buffer;
    try {
        jpeg = await sharp(Buffer.from(await file.arrayBuffer()))
            .rotate()
            .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 82, mozjpeg: true })
            .toBuffer();
    } catch {
        return NextResponse.json({ ok: false, message: "Ce fichier n'est pas une image lisible." }, { status: 415 });
    }

    const path = `${postId}/${randomUUID()}.jpg`;
    const upload = await db.storage.from(BUCKET).upload(path, jpeg, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
    if (upload.error) return fail(upload.error);
    return NextResponse.json({ ok: true, url: db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl });
}
