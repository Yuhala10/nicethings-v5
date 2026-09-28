import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { fail, requireAdmin, UUID_PATTERN } from "@/lib/admin-api";
import { PLACES_TAG } from "@/lib/places/server";

const BUCKET = "spot-photos";
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 6 * 1024 * 1024;

// Upload one photo for a place (already resized on the phone). The first
// photo of a place becomes its cover automatically.
export async function POST(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;

    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return NextResponse.json({ ok: false, message: "Invalid upload." }, { status: 400 });
    }

    const spotId = String(form.get("spotId") ?? "");
    const file = form.get("file");
    if (!UUID_PATTERN.test(spotId) || !(file instanceof File)) {
        return NextResponse.json({ ok: false, message: "Invalid upload." }, { status: 400 });
    }
    const extension = TYPES[file.type];
    if (!extension) return NextResponse.json({ ok: false, message: "Use a JPEG, PNG or WebP photo." }, { status: 415 });
    if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, message: "Photo too large (6 MB max)." }, { status: 413 });

    const path = `${spotId}/${randomUUID()}.${extension}`;
    const upload = await db.storage.from(BUCKET).upload(path, await file.arrayBuffer(), {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
    });
    if (upload.error) return fail(upload.error);

    const imageUrl = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    const last = await db
        .from("nt_spot_photos")
        .select("sort_order")
        .eq("spot_id", spotId)
        .order("sort_order", { ascending: false })
        .limit(1);
    const sortOrder = (last.data?.[0]?.sort_order ?? -1) + 1;
    const alt = String(form.get("alt") ?? "").slice(0, 200) || null;

    const { data, error } = await db
        .from("nt_spot_photos")
        .insert({ spot_id: spotId, image_url: imageUrl, alt_text: alt, sort_order: sortOrder })
        .select("id,image_url,alt_text,sort_order")
        .single();
    if (error) {
        await db.storage.from(BUCKET).remove([path]);
        return fail(error);
    }

    revalidateTag(PLACES_TAG, "max");
    return NextResponse.json({ ok: true, row: data });
}
