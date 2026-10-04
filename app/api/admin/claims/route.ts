import { NextResponse } from "next/server";
import { fail, requireAdmin } from "@/lib/admin-api";
import { purgeOldProofs } from "@/lib/claims/server";

const FILTERS: Record<string, string[]> = {
    open: ["PENDING", "NEEDS_INFO"],
    drafts: ["DRAFT"],
    approved: ["APPROVED"],
    closed: ["REJECTED", "WITHDRAWN"],
};

// GET /api/admin/claims?filter=open|drafts|approved|closed
export async function GET(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const filter = new URL(request.url).searchParams.get("filter") ?? "open";

    try {
        await purgeOldProofs(db);
        const { data, error } = await db
            .from("nt_claims")
            .select("id,status,full_name,role,user_email,trust_score,risk_flags,phone_verified_at,phone_code_requested_at,phone_code_sent_at,documents,documents_checked_at,field_visit_at,submitted_at,created_at,updated_at, spot:nt_spots(slug,name,city,neighborhood)")
            .in("status", FILTERS[filter] ?? FILTERS.open)
            .order("updated_at", { ascending: false })
            .limit(200);
        if (error) throw error;
        return NextResponse.json({ ok: true, rows: data ?? [] });
    } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === "PGRST205" || code === "42P01") return NextResponse.json({ ok: true, setup: true, rows: [] });
        return fail(error);
    }
}
