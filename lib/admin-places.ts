import type { SupabaseClient } from "@supabase/supabase-js";
import { cityBySlug } from "./cities";
import { slugify } from "./places/paths";
import { CATEGORIES } from "./tags";

// Helpers shared by the admin place endpoints (server only).

// Every row of a query, 1000 at a time (the database caps each call).
export async function selectAll<T>(
    build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
) {
    const rows: T[] = [];
    for (let from = 0; ; from += 1000) {
        const { data, error } = await build(from, from + 999);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) break;
    }
    return rows;
}

// Ids of places that have at least one photo, with how many.
export async function photoCounts(db: SupabaseClient) {
    const rows = await selectAll<{ spot_id: string }>((from, to) => db.from("nt_spot_photos").select("spot_id").range(from, to));
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.spot_id, (counts.get(row.spot_id) ?? 0) + 1);
    return counts;
}

// A slug nobody uses yet: "chez-wou-bastos", then "-2", "-3"…
export async function uniqueSlug(db: SupabaseClient, parts: (string | null | undefined)[]) {
    const base = slugify(parts.filter(Boolean).join(" ")).slice(0, 80) || "lieu";
    const { data, error } = await db.from("nt_spots").select("slug").like("slug", `${base}%`);
    if (error) throw error;
    const taken = new Set((data ?? []).map((row) => row.slug));
    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

export type NewPlace = {
    name: string;
    category: string;
    city: string; // city name as stored
    neighborhood: string | null;
    landmark: string | null;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    description: string | null;
    status: "DRAFT" | "APPROVED";
    source: "field" | "submission";
    source_ref?: string | null;
};

// Validates and normalises an admin "new place" payload.
export function readNewPlace(body: Record<string, unknown>): NewPlace | string {
    const text = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);
    const name = text(body.name, 120);
    if (!name || name.length < 2) return "Le nom est obligatoire.";
    const category = typeof body.category === "string" && body.category in CATEGORIES ? body.category : "Other";
    const city = cityBySlug(typeof body.city === "string" ? body.city : null)?.name ?? (text(body.cityName, 60) || "Yaoundé");
    const lat = Number(body.latitude);
    const lng = Number(body.longitude);
    const hasPosition = Number.isFinite(lat) && Number.isFinite(lng) && body.latitude !== null && body.latitude !== "";
    return {
        name,
        category,
        city,
        neighborhood: text(body.neighborhood, 60),
        landmark: text(body.landmark, 200),
        latitude: hasPosition ? lat : null,
        longitude: hasPosition ? lng : null,
        phone: text(body.phone, 40),
        description: text(body.description, 1500),
        status: body.status === "APPROVED" && hasPosition ? "APPROVED" : "DRAFT",
        source: body.source === "submission" ? "submission" : "field",
    };
}
