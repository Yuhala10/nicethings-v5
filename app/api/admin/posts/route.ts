import { NextResponse } from "next/server";
import { fail, readJson, requireAdmin } from "@/lib/admin-api";
import { POST_LIST_COLUMNS, uniquePostSlug } from "@/lib/blog/admin";

// GET /api/admin/posts — every article, newest first, for the console list.
export async function GET() {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const { data, error } = await db.from("nt_posts").select(POST_LIST_COLUMNS).order("updated_at", { ascending: false }).limit(500);
    if (error) {
        // The blog tables are not created yet: the page explains what to run.
        if (error.code === "PGRST205" || error.code === "42P01") return NextResponse.json({ ok: true, setup: true, rows: [] });
        return fail(error);
    }
    return NextResponse.json({ ok: true, rows: data ?? [] });
}

// POST /api/admin/posts { title } — a new draft, ready to write.
export async function POST(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const body = (await readJson(request)) ?? {};
    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 160) : "Nouvel article";
    try {
        const slug = await uniquePostSlug(db, title);
        const { data, error } = await db
            .from("nt_posts")
            .insert({ slug, title_fr: title, status: "DRAFT", body_fr: [{ type: "p", text: "" }] })
            .select("id")
            .single();
        if (error) throw error;
        return NextResponse.json({ ok: true, id: data.id });
    } catch (error) {
        return fail(error);
    }
}
