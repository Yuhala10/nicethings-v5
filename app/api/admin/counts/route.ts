import { NextResponse } from "next/server";
import { fail, requireAdmin } from "@/lib/admin-api";

// Tiny call for the navigation badges: what is waiting for the team.
export async function GET() {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const [submissions, reports] = await Promise.all([
        db.from("nt_spot_submissions").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
        db.from("nt_reports").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
    ]);
    if (submissions.error) return fail(submissions.error);
    if (reports.error) return fail(reports.error);
    return NextResponse.json({ ok: true, submissions: submissions.count ?? 0, reports: reports.count ?? 0 });
}
