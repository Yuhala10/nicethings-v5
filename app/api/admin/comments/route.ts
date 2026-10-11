import { NextResponse } from "next/server";
import { UUID_PATTERN, fail, readJson, requireAdmin } from "@/lib/admin-api";
import { notInstalled } from "@/lib/atlas/store";
import { refreshPosts } from "@/lib/refresh";

// The team's desk for what readers write under articles.

const COLUMNS = "id,post_id,name,body,status,created_at";

// GET /api/admin/comments — comments waiting to be read, then the latest
// ones already shown.
export async function GET() {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    try {
        const [waiting, shown] = await Promise.all([
            db.from("nt_post_comments").select(COLUMNS).eq("status", "PENDING").order("created_at", { ascending: true }).limit(200),
            db.from("nt_post_comments").select(COLUMNS).eq("status", "APPROVED").order("decided_at", { ascending: false }).limit(60),
        ]);
        if (waiting.error) throw waiting.error;
        if (shown.error) throw shown.error;
        const rows = [...(waiting.data ?? []), ...(shown.data ?? [])];
        const ids = [...new Set(rows.map((row) => row.post_id))];
        const posts = ids.length ? await db.from("nt_posts").select("id,slug,title_fr").in("id", ids) : { data: [], error: null };
        if (posts.error) throw posts.error;
        const articles = new Map((posts.data ?? []).map((post) => [post.id, post]));
        const shape = (row: (typeof rows)[number]) => ({ id: row.id, name: row.name, body: row.body, created_at: row.created_at, article: articles.get(row.post_id) ?? null });
        return NextResponse.json({ ok: true, setup: false, waiting: (waiting.data ?? []).map(shape), shown: (shown.data ?? []).map(shape) });
    } catch (error) {
        if (notInstalled(error)) return NextResponse.json({ ok: true, setup: true, waiting: [], shown: [] });
        return fail(error);
    }
}

// POST /api/admin/comments { id, action } — "approve" shows it under the
// article; "remove" refuses it (or takes it down) and deletes it.
export async function POST(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const body = await readJson(request);
    const id = typeof body?.id === "string" && UUID_PATTERN.test(body.id) ? body.id : null;
    const action = body?.action === "approve" || body?.action === "remove" ? body.action : null;
    if (!id || !action) return NextResponse.json({ ok: false, message: "Requête invalide." }, { status: 400 });
    try {
        const change =
            action === "approve"
                ? await db.from("nt_post_comments").update({ status: "APPROVED", decided_at: new Date().toISOString() }).eq("id", id)
                : await db.from("nt_post_comments").delete().eq("id", id);
        if (change.error) throw change.error;
        refreshPosts();
        return NextResponse.json({ ok: true });
    } catch (caught) {
        return fail(caught);
    }
}
