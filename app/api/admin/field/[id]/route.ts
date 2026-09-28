import { NextResponse } from "next/server";
import { fail, requireAdmin, UUID_PATTERN } from "@/lib/admin-api";

// One place with everything the field kit edits, photos included.
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;

    const { id } = await context.params;
    if (!UUID_PATTERN.test(id)) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

    const [spot, photos] = await Promise.all([
        db.from("nt_spots").select("*").eq("id", id).maybeSingle(),
        db
            .from("nt_spot_photos")
            .select("id,image_url,alt_text,sort_order")
            .eq("spot_id", id)
            .order("sort_order", { ascending: true }),
    ]);
    if (spot.error) return fail(spot.error);
    if (photos.error) return fail(photos.error);
    if (!spot.data) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

    return NextResponse.json({ ok: true, row: spot.data, photos: photos.data ?? [] });
}
