import { NextResponse } from "next/server";
import { fail, requireAdmin } from "@/lib/admin-api";
import { selectAll } from "@/lib/admin-places";

// What visitors search for over the last N days: most asked, and the
// searches that found nothing (where to add places next).
export async function GET(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const days = Math.min(90, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 30));
    const since = new Date(Date.now() - days * 86_400_000).toISOString();

    try {
        const rows = await selectAll<{ query: string | null; filters: { city?: string } | null; result_count: number | null; created_at: string }>(
            (from, to) =>
                db
                    .from("nt_searches")
                    .select("query,filters,result_count,created_at")
                    .gte("created_at", since)
                    .order("created_at", { ascending: false })
                    .range(from, to)
        );

        type Bucket = { query: string; count: number; zero: number; cities: Set<string> };
        const groups = new Map<string, Bucket>();
        const perDay = new Map<string, number>();
        for (const row of rows) {
            const query = (row.query ?? "").trim().toLowerCase().replace(/\s+/g, " ");
            if (!query) continue;
            const bucket = groups.get(query) ?? { query, count: 0, zero: 0, cities: new Set<string>() };
            bucket.count++;
            if (row.result_count === 0) bucket.zero++;
            if (row.filters?.city) bucket.cities.add(row.filters.city);
            groups.set(query, bucket);
            const day = row.created_at.slice(0, 10);
            perDay.set(day, (perDay.get(day) ?? 0) + 1);
        }
        const list = [...groups.values()].map((bucket) => ({ ...bucket, cities: [...bucket.cities] }));

        return NextResponse.json({
            ok: true,
            total: rows.length,
            top: list.sort((a, b) => b.count - a.count).slice(0, 30),
            noResults: list.filter((bucket) => bucket.zero > 0).sort((a, b) => b.zero - a.zero).slice(0, 30),
            perDay: [...perDay.entries()].sort().map(([day, count]) => ({ day, count })),
        });
    } catch (error) {
        return fail(error);
    }
}
