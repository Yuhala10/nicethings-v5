import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { UUID_PATTERN } from "@/lib/admin-api";
import { ownedSpot } from "@/lib/claims/owned";
import { PLACES_TAG } from "@/lib/places/server";
import { requireOwner } from "@/lib/supabase/owner";

type Context = { params: Promise<{ slug: string }> };
const BUCKET = "spot-photos";
const MAX_PHOTOS = 15;

// Owners add their own photos. Each one is decoded and re-encoded (location
// data and anything hidden is dropped) and logged in the change history.
export async function POST(request: Request, context: Context) {
    const { owner, db, denied } = await requireOwner();
    if (denied) return denied;
    const owned = await ownedSpot(db, owner.id, (await context.params).slug);
    if (!owned) return NextResponse.json({ ok: false, message: "Tu ne gères pas ce lieu." }, { status: 403 });

    const { count } = await db.from("nt_spot_photos").select("id", { count: "exact", head: true }).eq("spot_id", owned.spot.id);
    if ((count ?? 0) >= MAX_PHOTOS) return NextResponse.json({ ok: false, message: `${MAX_PHOTOS} photos maximum.` }, { status: 422 });

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || file.size > 10 * 1024 * 1024) return NextResponse.json({ ok: false, message: "Photo manquante ou trop lourde." }, { status: 400 });

    let jpeg: Buffer;
    try {
        jpeg = await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    } catch {
        return NextResponse.json({ ok: false, message: "Ce fichier n'est pas une photo lisible." }, { status: 415 });
    }

    const path = `${owned.spot.id}/${randomUUID()}.jpg`;
    const upload = await db.storage.from(BUCKET).upload(path, jpeg, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
    if (upload.error) return NextResponse.json({ ok: false, message: "Envoi impossible." }, { status: 502 });

    const url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    const { data, error } = await db
        .from("nt_spot_photos")
        .insert({ spot_id: owned.spot.id, image_url: url, alt_text: owned.spot.name, sort_order: (count ?? 0) + 1 })
        .select("id,image_url,sort_order")
        .single();
    if (error) {
        await db.storage.from(BUCKET).remove([path]);
        return NextResponse.json({ ok: false, message: "Enregistrement impossible." }, { status: 502 });
    }
    await db.from("nt_spot_changes").insert({ spot_id: owned.spot.id, user_id: owner.id, field: "photo_added", new_value: { url }, status: "APPLIED" });
    revalidateTag(PLACES_TAG, "max");
    return NextResponse.json({ ok: true, photo: data });
}

// DELETE ?id=<photo id>; PATCH { order: [ids] } puts the chosen cover first.
export async function DELETE(request: Request, context: Context) {
    const { owner, db, denied } = await requireOwner();
    if (denied) return denied;
    const owned = await ownedSpot(db, owner.id, (await context.params).slug);
    if (!owned) return NextResponse.json({ ok: false, message: "Tu ne gères pas ce lieu." }, { status: 403 });
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!UUID_PATTERN.test(id)) return NextResponse.json({ ok: false }, { status: 400 });

    const { data: photo } = await db.from("nt_spot_photos").select("id,image_url").eq("id", id).eq("spot_id", owned.spot.id).maybeSingle();
    if (!photo) return NextResponse.json({ ok: false, message: "Photo introuvable." }, { status: 404 });
    await db.from("nt_spot_photos").delete().eq("id", id);
    const marker = `/object/public/${BUCKET}/`;
    const path = photo.image_url.includes(marker) ? photo.image_url.split(marker)[1] : null;
    if (path) await db.storage.from(BUCKET).remove([path]);
    await db.from("nt_spot_changes").insert({ spot_id: owned.spot.id, user_id: owner.id, field: "photo_removed", old_value: { url: photo.image_url }, status: "APPLIED" });
    revalidateTag(PLACES_TAG, "max");
    return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, context: Context) {
    const { owner, db, denied } = await requireOwner();
    if (denied) return denied;
    const owned = await ownedSpot(db, owner.id, (await context.params).slug);
    if (!owned) return NextResponse.json({ ok: false, message: "Tu ne gères pas ce lieu." }, { status: 403 });
    const body = await request.json().catch(() => null);
    const order: string[] = Array.isArray(body?.order) ? body.order.filter((id: unknown) => typeof id === "string" && UUID_PATTERN.test(id)) : [];

    const { data: photos } = await db.from("nt_spot_photos").select("id").eq("spot_id", owned.spot.id);
    const mine = new Set<string>((photos ?? []).map((photo) => String(photo.id)));
    const ids = [...order.filter((id) => mine.has(id)), ...[...mine].filter((id) => !order.includes(id))];
    await Promise.all(ids.map((id, index) => db.from("nt_spot_photos").update({ sort_order: index }).eq("id", id)));
    revalidateTag(PLACES_TAG, "max");
    return NextResponse.json({ ok: true });
}
