import { NextResponse } from "next/server";
import { fail, requireAdmin } from "../../../../lib/admin-api";

export async function GET() {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;

    const count = (table: string, status?: string) => {
        let query = db.from(table).select("id", { count: "exact", head: true });
        if (status) query = query.eq("status", status);
        return query;
    };

    const results = await Promise.all([
        count("nt_spots", "APPROVED"),
        count("nt_spots", "PENDING"),
        count("nt_spot_submissions"),
        count("nt_spot_submissions", "PENDING"),
        count("nt_reports"),
        count("nt_reports", "PENDING"),
        count("nt_visitors"),
        count("nt_reviews"),
        db
            .from("nt_spot_submissions")
            .select("id,name,city,category,status,created_at")
            .order("created_at", { ascending: false })
            .limit(6),
        db
            .from("nt_reports")
            .select("id,reason,status,created_at")
            .order("created_at", { ascending: false })
            .limit(5),
    ]);

    const failed = results.find((result) => result.error);
    if (failed?.error) return fail(failed.error);

    const [
        spots,
        pendingSpots,
        submissions,
        pendingSubmissions,
        reports,
        pendingReports,
        visitors,
        reviews,
        recentSubmissions,
        recentReports,
    ] = results;

    return NextResponse.json({
        ok: true,
        stats: {
            spots: spots.count ?? 0,
            pendingSpots: pendingSpots.count ?? 0,
            submissions: submissions.count ?? 0,
            pendingSubmissions: pendingSubmissions.count ?? 0,
            reports: reports.count ?? 0,
            pendingReports: pendingReports.count ?? 0,
            visitors: visitors.count ?? 0,
            reviews: reviews.count ?? 0,
        },
        recentSubmissions: recentSubmissions.data ?? [],
        recentReports: recentReports.data ?? [],
    });
}
