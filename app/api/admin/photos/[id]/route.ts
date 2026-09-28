import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { fail, readJson, requireAdmin, UUID_PATTERN } from "@/lib/admin-api";
import { PLACES_TAG } from "@/lib/places/server";

const BUCKET = "spot-photos";

type Context = { params: Promise<{ id: string }> };

// Storage path from a public URL: .../object/public/spot-photos/<path>
function storagePath(url: string) {
    const marker = `/object/public/${BUCKET}/`;
    const index = url.indexOf(marker);
    return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}

// { cover: true } moves a photo to the front.
export async function PATCH(request: Request, context: Context) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const { id } = await context.params;
    const body = await readJson(request);
    if (!UUID_PATTERN.test(id) || body?.cover !== true) {
        return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
    }

    const photo = await db.from("nt_spot_photos").select("spot_id").eq("id", id).maybeSingle();
    if (photo.error) return fail(photo.error);
    if (!photo.data) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

    const first = await db
        .from("nt_spot_photos")
        .select("sort_order")
        .eq("spot_id", photo.data.spot_id)
        .order("sort_order")
        .limit(1);
    const { error } = await db
        .from("nt_spot_photos")
        .update({ sort_order: (first.data?.[0]?.sort_order ?? 0) - 1 })
        .eq("id", id);
    if (error) return fail(error);

    revalidateTag(PLACES_TAG, "max");
    return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: Context) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const { id } = await context.params;
    if (!UUID_PATTERN.test(id)) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

    const photo = await db.from("nt_spot_photos").select("image_url").eq("id", id).maybeSingle();
    if (photo.error) return fail(photo.error);
    if (!photo.data) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

    const { error } = await db.from("nt_spot_photos").delete().eq("id", id);
    if (error) return fail(error);
    const path = storagePath(photo.data.image_url);
    if (path) await db.storage.from(BUCKET).remove([path]);

    revalidateTag(PLACES_TAG, "max");
    return NextResponse.json({ ok: true });
}
