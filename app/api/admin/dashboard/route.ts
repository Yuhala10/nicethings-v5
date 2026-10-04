import { NextResponse } from "next/server";
import { fail, requireAdmin } from "@/lib/admin-api";
import { photoCounts, selectAll } from "@/lib/admin-places";

// Everything the dashboard shows in one call: headline numbers, how
// complete each city's listings are, what is waiting, and recent activity.

type Row = {
    city: string | null;
    status: string;
    verified: boolean;
    featured: boolean;
    minimum_price: number | null;
    maximum_price: number | null;
    opening_time: string | null;
    phone: string | null;
    id: string;
};

export async function GET() {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;

    try {
        const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
        const [spots, photos, submissions, reports, searches, recentSubmissions, recentReports, audience] = await Promise.all([
            selectAll<Row>((from, to) =>
                db.from("nt_spots").select("id,city,status,verified,featured,minimum_price,maximum_price,opening_time,phone").range(from, to)
            ),
            photoCounts(db),
            db.from("nt_spot_submissions").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
            db.from("nt_reports").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
            db.from("nt_searches").select("id", { count: "exact", head: true }).gte("created_at", since),
            db.from("nt_spot_submissions").select("id,name,city,neighborhood,category,created_at").eq("status", "PENDING").order("created_at", { ascending: false }).limit(5),
            db.from("nt_reports").select("id,reason,description,spot_id,created_at").eq("status", "PENDING").order("created_at", { ascending: false }).limit(5),
            // Visitors this week (if analytics is set up; otherwise left out).
            db.rpc("nt_audience", { since }),
        ]);
        for (const result of [submissions, reports, searches, recentSubmissions, recentReports]) {
            if (result.error) throw result.error;
        }

        const cities = new Map<string, { city: string; published: number; photos: number; hours: number; prices: number; phones: number; verified: number }>();
        let published = 0;
        let drafts = 0;
        let verified = 0;
        let featured = 0;
        let withPhotos = 0;
        for (const spot of spots) {
            if (spot.status === "DRAFT" || spot.status === "PENDING") drafts++;
            if (spot.status !== "APPROVED") continue;
            published++;
            if (spot.verified) verified++;
            if (spot.featured) featured++;
            const hasPhoto = photos.has(spot.id);
            if (hasPhoto) withPhotos++;
            const key = spot.city ?? "—";
            const row = cities.get(key) ?? { city: key, published: 0, photos: 0, hours: 0, prices: 0, phones: 0, verified: 0 };
            row.published++;
            if (hasPhoto) row.photos++;
            if (spot.opening_time) row.hours++;
            if (spot.minimum_price || spot.maximum_price) row.prices++;
            if (spot.phone) row.phones++;
            if (spot.verified) row.verified++;
            cities.set(key, row);
        }

        // Names of the places the recent reports are about.
        const reportSpotIds = [...new Set((recentReports.data ?? []).map((report) => report.spot_id).filter(Boolean))];
        const names = new Map<string, { name: string; id: string }>();
        if (reportSpotIds.length) {
            const { data, error } = await db.from("nt_spots").select("id,name").in("id", reportSpotIds);
            if (error) throw error;
            for (const row of data ?? []) names.set(row.id, row);
        }

        return NextResponse.json({
            ok: true,
            totals: {
                published,
                drafts,
                verified,
                featured,
                withPhotos,
                pendingSubmissions: submissions.count ?? 0,
                pendingReports: reports.count ?? 0,
                searches7d: searches.count ?? 0,
                visitors7d: audience.error ? null : Number(audience.data?.visitors ?? 0),
                returned7d: audience.error ? null : Number(audience.data?.returned ?? 0),
            },
            cities: [...cities.values()].sort((a, b) => b.published - a.published),
            recentSubmissions: recentSubmissions.data ?? [],
            recentReports: (recentReports.data ?? []).map((report) => ({ ...report, spot: report.spot_id ? names.get(report.spot_id) ?? null : null })),
        });
    } catch (error) {
        return fail(error);
    }
}
