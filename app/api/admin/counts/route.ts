import { NextResponse } from "next/server";
import { fail, requireAdmin } from "@/lib/admin-api";

// Tiny call for the navigation badges: what is waiting for the team.
export async function GET() {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const [submissions, reports, claims, requests] = await Promise.all([
        db.from("nt_spot_submissions").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
        db.from("nt_reports").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
        db.from("nt_claims").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
        db.from("nt_spot_changes").select("id", { count: "exact", head: true }).eq("field", "request").eq("status", "PENDING"),
    ]);
    if (submissions.error) return fail(submissions.error);
    if (reports.error) return fail(reports.error);
    // Claims may not be set up yet: they simply count as zero.
    return NextResponse.json({
        ok: true,
        submissions: submissions.count ?? 0,
        reports: reports.count ?? 0,
        claims: (claims.count ?? 0) + (requests.count ?? 0),
    });
}
