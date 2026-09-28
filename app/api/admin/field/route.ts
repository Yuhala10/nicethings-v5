import { NextResponse } from "next/server";
import { fail, requireAdmin } from "@/lib/admin-api";

// Field kit search: places by name, or the nearest to where the admin
// stands. Every status is included so drafts can be completed on site.

const COLUMNS = "id,slug,name,category,city,neighborhood,latitude,longitude,status,verified";

type Row = { id: string; latitude: number | null; longitude: number | null };

export async function GET(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;

    const params = new URL(request.url).searchParams;
    const q = (params.get("q") ?? "").trim().slice(0, 80);
    const lat = Number(params.get("lat"));
    const lng = Number(params.get("lng"));
    const near = params.has("lat") && Number.isFinite(lat) && Number.isFinite(lng);

    let query = db.from("nt_spots").select(COLUMNS).limit(near ? 400 : 40);
    if (q) query = query.ilike("name", `%${q.replace(/[%_]/g, "")}%`);
    if (near) {
        const box = 0.02; // ~2 km
        query = query
            .gte("latitude", lat - box)
            .lte("latitude", lat + box)
            .gte("longitude", lng - box)
            .lte("longitude", lng + box);
    }
    if (!q && !near) query = query.order("updated_at", { ascending: false });

    const { data, error } = await query;
    if (error) return fail(error);

    let rows = (data ?? []) as Row[];
    if (near) {
        const distance = (row: Row) =>
            Math.hypot((row.latitude ?? 0) - lat, ((row.longitude ?? 0) - lng) * Math.cos((lat * Math.PI) / 180));
        rows = rows.sort((a, b) => distance(a) - distance(b)).slice(0, 30);
    }

    // How many photos each place already has.
    const ids = rows.map((row) => row.id);
    const counts = new Map<string, number>();
    if (ids.length) {
        const photos = await db.from("nt_spot_photos").select("spot_id").in("spot_id", ids);
        if (photos.error) return fail(photos.error);
        for (const photo of photos.data ?? []) counts.set(photo.spot_id, (counts.get(photo.spot_id) ?? 0) + 1);
    }

    return NextResponse.json({ ok: true, rows: rows.map((row) => ({ ...row, photo_count: counts.get(row.id) ?? 0 })) });
}
