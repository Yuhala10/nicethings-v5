import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { fail, readJson, requireAdmin, UUID_PATTERN } from "@/lib/admin-api";
import { readNewPlace, uniqueSlug } from "@/lib/admin-places";
import { PLACES_TAG } from "@/lib/places/server";

// Turn a visitor's suggestion into a place (a draft to complete, or
// published straight away when it has a position), and close the
// suggestion.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const { id } = await context.params;
    if (!UUID_PATTERN.test(id)) return NextResponse.json({ ok: false, message: "Introuvable." }, { status: 404 });
    const body = (await readJson(request)) ?? {};

    try {
        const { data: submission, error } = await db.from("nt_spot_submissions").select("*").eq("id", id).maybeSingle();
        if (error) throw error;
        if (!submission) return NextResponse.json({ ok: false, message: "Introuvable." }, { status: 404 });

        const place = readNewPlace({
            name: submission.name,
            category: submission.category,
            cityName: submission.city,
            neighborhood: submission.neighborhood,
            landmark: submission.landmark,
            latitude: submission.latitude,
            longitude: submission.longitude,
            phone: submission.phone,
            description: submission.description,
            status: body.publish === true ? "APPROVED" : "DRAFT",
            source: "submission",
        });
        if (typeof place === "string") return NextResponse.json({ ok: false, message: place }, { status: 422 });

        const slug = await uniqueSlug(db, [place.name, place.neighborhood, place.city === "Yaoundé" ? null : place.city]);
        const created = await db
            .from("nt_spots")
            .insert({ ...place, slug, source_ref: `submission/${id}` })
            .select("id,slug,status")
            .single();
        if (created.error) throw created.error;

        const closed = await db.from("nt_spot_submissions").update({ status: "APPROVED" }).eq("id", id);
        if (closed.error) throw closed.error;

        revalidateTag(PLACES_TAG, "max");
        return NextResponse.json({ ok: true, row: created.data });
    } catch (caught) {
        return fail(caught);
    }
}
