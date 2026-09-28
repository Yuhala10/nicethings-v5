import { fail, requireAdmin } from "@/lib/admin-api";
import { photoCounts, selectAll } from "@/lib/admin-places";

// GET /api/admin/places/export — the whole catalogue as a CSV spreadsheet.
const COLUMNS = [
    "id",
    "slug",
    "name",
    "status",
    "category",
    "cuisine",
    "city",
    "neighborhood",
    "address",
    "landmark",
    "latitude",
    "longitude",
    "phone",
    "whatsapp",
    "website",
    "minimum_price",
    "maximum_price",
    "opening_time",
    "closing_time",
    "verified",
    "featured",
    "source",
    "updated_at",
] as const;

function cell(value: unknown) {
    if (value === null || value === undefined) return "";
    const text = Array.isArray(value) ? value.join("|") : String(value);
    return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    try {
        const [rows, photos] = await Promise.all([
            selectAll<Record<string, unknown>>((from, to) => db.from("nt_spots").select(COLUMNS.join(",")).order("city").order("name").range(from, to)),
            photoCounts(db),
        ]);
        const lines = [
            [...COLUMNS, "photos"].join(","),
            ...rows.map((row) => [...COLUMNS.map((column) => cell(row[column])), photos.get(row.id as string) ?? 0].join(",")),
        ];
        const date = new Date().toISOString().slice(0, 10);
        // BOM so Excel opens the accents correctly.
        return new Response("﻿" + lines.join("\r\n"), {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="nicethings-lieux-${date}.csv"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        return fail(error);
    }
}
