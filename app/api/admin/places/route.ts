import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { fail, readJson, requireAdmin, UUID_PATTERN } from "@/lib/admin-api";
import { photoCounts, readNewPlace, uniqueSlug } from "@/lib/admin-places";
import { cityBySlug } from "@/lib/cities";
import { PLACES_TAG } from "@/lib/places/server";

const PAGE_SIZE = 40;
const COLUMNS =
    "id,slug,name,category,city,neighborhood,status,verified,featured,minimum_price,maximum_price,opening_time,phone,source,updated_at";
const STATUSES = ["APPROVED", "DRAFT", "PENDING", "REJECTED", "CLOSED"];

// GET /api/admin/places?q=&city=&status=&missing=photo|price|hours|phone&featured=1&page=
export async function GET(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;

    const params = new URL(request.url).searchParams;
    const q = (params.get("q") ?? "").trim().slice(0, 80).replace(/[%_,()]/g, " ");
    const city = cityBySlug(params.get("city"));
    const status = params.get("status");
    const missing = params.get("missing");
    const page = Math.max(0, Number(params.get("page")) || 0);

    try {
        let query = db.from("nt_spots").select(COLUMNS, { count: "exact" });
        if (q) query = query.or(`name.ilike.%${q}%,neighborhood.ilike.%${q}%`);
        if (city) query = query.eq("city", city.name);
        if (status && STATUSES.includes(status)) query = query.eq("status", status);
        if (params.get("featured") === "1") query = query.eq("featured", true);
        if (params.get("verified") === "0") query = query.eq("verified", false);
        if (missing === "price") query = query.is("minimum_price", null).is("maximum_price", null);
        if (missing === "hours") query = query.is("opening_time", null);
        if (missing === "phone") query = query.is("phone", null);

        const photos = await photoCounts(db);
        if (missing === "photo" && photos.size) {
            query = query.not("id", "in", `(${[...photos.keys()].join(",")})`);
        }

        const { data, count, error } = await query
            .order("updated_at", { ascending: false })
            .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
        if (error) throw error;

        return NextResponse.json({
            ok: true,
            rows: (data ?? []).map((row) => ({ ...row, photo_count: photos.get(row.id) ?? 0 })),
            total: count ?? 0,
            pageSize: PAGE_SIZE,
        });
    } catch (error) {
        return fail(error);
    }
}

// POST: create a place from scratch.
export async function POST(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const body = await readJson(request);
    if (!body) return NextResponse.json({ ok: false, message: "Requête invalide." }, { status: 400 });

    const place = readNewPlace(body);
    if (typeof place === "string") return NextResponse.json({ ok: false, message: place }, { status: 422 });

    try {
        const slug = await uniqueSlug(db, [place.name, place.neighborhood, place.city === "Yaoundé" ? null : place.city]);
        const { data, error } = await db.from("nt_spots").insert({ ...place, slug }).select("id,slug").single();
        if (error) throw error;
        revalidateTag(PLACES_TAG, "max");
        return NextResponse.json({ ok: true, row: data });
    } catch (error) {
        return fail(error);
    }
}

// PATCH: the same change on many places — { ids: [...], changes: { status | verified | featured } }.
export async function PATCH(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const body = await readJson(request);
    const ids = Array.isArray(body?.ids) ? (body.ids as unknown[]).filter((id): id is string => typeof id === "string" && UUID_PATTERN.test(id)) : [];
    const raw = (body?.changes ?? {}) as Record<string, unknown>;
    const changes: Record<string, unknown> = {};
    if (typeof raw.status === "string" && STATUSES.includes(raw.status)) changes.status = raw.status;
    if (typeof raw.verified === "boolean") {
        changes.verified = raw.verified;
        if (raw.verified) changes.last_verified_at = new Date().toISOString();
    }
    if (typeof raw.featured === "boolean") changes.featured = raw.featured;
    if (!ids.length || !Object.keys(changes).length || ids.length > 500) {
        return NextResponse.json({ ok: false, message: "Rien à modifier." }, { status: 400 });
    }

    const { error, count } = await db.from("nt_spots").update(changes, { count: "exact" }).in("id", ids);
    if (error) return fail(error);
    revalidateTag(PLACES_TAG, "max");
    return NextResponse.json({ ok: true, updated: count ?? ids.length });
}
