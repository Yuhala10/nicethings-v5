import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { readJson } from "@/lib/admin-api";
import { cleanText } from "@/lib/feedback";
import { FIELD_LABELS, OWNER_FIELDS, applyOwnerChanges, readOwnerChanges } from "@/lib/claims/owner-edits";
import { ownedSpot } from "@/lib/claims/owned";
import { cityByName } from "@/lib/cities";
import { PLACES_TAG } from "@/lib/places/server";
import { CATEGORIES } from "@/lib/tags";
import { requireOwner } from "@/lib/supabase/owner";

type Context = { params: Promise<{ slug: string }> };

const notYours = () => NextResponse.json({ ok: false, message: "Tu ne gères pas ce lieu." }, { status: 403 });

// GET — everything the owner can edit, with the photos, the menu and the
// recent history of changes.
export async function GET(_request: Request, context: Context) {
    const { owner, db, denied } = await requireOwner();
    if (denied) return denied;
    const owned = await ownedSpot(db, owner.id, (await context.params).slug);
    if (!owned) return notYours();
    const { spot } = owned;

    // The owner's own numbers: views of the listing and route requests.
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [photos, menu, history, views, directions] = await Promise.all([
        db.from("nt_spot_photos").select("id,image_url,sort_order").eq("spot_id", spot.id).order("sort_order"),
        db.from("nt_spot_menu").select("name,description,price,popular,available").eq("spot_id", spot.id).order("created_at"),
        db.from("nt_spot_changes").select("field,status,created_at").eq("spot_id", spot.id).order("created_at", { ascending: false }).limit(20),
        db.from("nt_events").select("visitor_id").eq("page", "place").eq("place", spot.slug).gte("created_at", since).limit(20000),
        db.from("nt_events").select("id", { count: "exact", head: true }).eq("page", "directions").eq("place", spot.slug).gte("created_at", since),
    ]);

    const editable = Object.fromEntries(
        OWNER_FIELDS.map((field) => [field, field.endsWith("_time") && typeof spot[field] === "string" ? (spot[field] as string).slice(0, 5) : (spot[field] ?? null)])
    );
    return NextResponse.json(
        {
            ok: true,
            role: owned.role,
            place: {
                id: spot.id,
                slug: spot.slug,
                name: spot.name,
                category: spot.category,
                city: cityByName(spot.city as string)?.slug ?? null,
                neighborhood: spot.neighborhood,
                verified: spot.verified,
                ...editable,
            },
            photos: photos.data ?? [],
            menu: menu.data ?? [],
            history: (history.data ?? []).map((change) => ({ ...change, label: FIELD_LABELS[change.field] ?? change.field })),
            stats: {
                views: views.data?.length ?? 0,
                visitors: new Set((views.data ?? []).map((row) => row.visitor_id)).size,
                directions: directions.count ?? 0,
            },
        },
        { headers: { "Cache-Control": "private, no-store" } }
    );
}

// PATCH { field: value } — live changes, each one logged.
export async function PATCH(request: Request, context: Context) {
    const { owner, db, denied } = await requireOwner();
    if (denied) return denied;
    const owned = await ownedSpot(db, owner.id, (await context.params).slug);
    if (!owned) return notYours();

    const result = readOwnerChanges((await readJson(request)) ?? {});
    if ("invalid" in result) return NextResponse.json({ ok: false, message: "Valeur invalide.", field: result.invalid }, { status: 422 });
    try {
        const count = await applyOwnerChanges(db, owned.spot.id, owner.id, result.changes);
        if (count) revalidateTag(PLACES_TAG, "max");
        return NextResponse.json({ ok: true, changed: count });
    } catch (error) {
        console.error("Owner edit failed:", error);
        return NextResponse.json({ ok: false, message: "Enregistrement impossible." }, { status: 502 });
    }
}

// POST { name?, category?, address?, note? } — a correction only the team
// can make (identity and position of the place).
export async function POST(request: Request, context: Context) {
    const { owner, db, denied } = await requireOwner();
    if (denied) return denied;
    const owned = await ownedSpot(db, owner.id, (await context.params).slug);
    if (!owned) return notYours();
    const body = (await readJson(request)) ?? {};

    const wanted = {
        name: cleanText(body.name, 120),
        category: typeof body.category === "string" && body.category in CATEGORIES ? body.category : null,
        address: cleanText(body.address, 200),
        position: Number.isFinite(Number(body.lat)) && Number.isFinite(Number(body.lng)) && body.lat !== null ? { lat: Number(body.lat), lng: Number(body.lng) } : null,
        note: cleanText(body.note, 1000),
    };
    if (!wanted.name && !wanted.category && !wanted.address && !wanted.position && !wanted.note) {
        return NextResponse.json({ ok: false, message: "Dis-nous ce qu'il faut corriger." }, { status: 422 });
    }
    const { count } = await db
        .from("nt_spot_changes")
        .select("id", { count: "exact", head: true })
        .eq("spot_id", owned.spot.id)
        .eq("field", "request")
        .eq("status", "PENDING");
    if ((count ?? 0) >= 3) return NextResponse.json({ ok: false, message: "Tu as déjà des demandes en attente : l'équipe s'en occupe." }, { status: 429 });

    const { error } = await db.from("nt_spot_changes").insert({
        spot_id: owned.spot.id,
        user_id: owner.id,
        field: "request",
        old_value: { name: owned.spot.name, category: owned.spot.category, address: owned.spot.address ?? null, lat: owned.spot.latitude, lng: owned.spot.longitude },
        new_value: wanted,
        status: "PENDING",
    });
    if (error) return NextResponse.json({ ok: false, message: "Envoi impossible." }, { status: 502 });
    return NextResponse.json({ ok: true });
}
