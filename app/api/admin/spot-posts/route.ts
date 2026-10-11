import { NextResponse } from "next/server";
import { UUID_PATTERN, fail, readJson, requireAdmin } from "@/lib/admin-api";
import { notInstalled } from "@/lib/atlas/store";
import { POST_BUCKET, postUrl } from "@/lib/posts";
import { refreshPlaces } from "@/lib/refresh";

// The team's desk for what visitors send to the walls of places: what is
// waiting, and what is already shown.

const COLUMNS = "id,spot_id,kind,media_path,poster_path,duration,caption,likes,status,created_at";

// GET /api/admin/spot-posts — photos and videos waiting for a decision, then
// the latest ones already on the site.
export async function GET() {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    try {
        const [waiting, shown] = await Promise.all([
            db.from("nt_spot_posts").select(COLUMNS).eq("status", "PENDING").not("uploaded_at", "is", null).order("created_at", { ascending: true }).limit(100),
            db.from("nt_spot_posts").select(COLUMNS).eq("status", "APPROVED").order("decided_at", { ascending: false }).limit(60),
        ]);
        if (waiting.error) throw waiting.error;
        if (shown.error) throw shown.error;
        const rows = [...(waiting.data ?? []), ...(shown.data ?? [])];
        const ids = [...new Set(rows.map((row) => row.spot_id))];
        const spots = ids.length ? await db.from("nt_spots").select("id,name,slug,city").in("id", ids) : { data: [], error: null };
        if (spots.error) throw spots.error;
        const places = new Map((spots.data ?? []).map((spot) => [spot.id, spot]));
        const shape = (row: (typeof rows)[number]) => ({
            id: row.id,
            kind: row.kind,
            url: postUrl(row.media_path),
            poster: row.poster_path ? postUrl(row.poster_path) : null,
            duration: row.duration,
            caption: row.caption,
            likes: row.likes,
            created_at: row.created_at,
            place: places.get(row.spot_id) ?? null,
        });
        return NextResponse.json({ ok: true, setup: false, waiting: (waiting.data ?? []).map(shape), shown: (shown.data ?? []).map(shape) });
    } catch (error) {
        if (notInstalled(error)) return NextResponse.json({ ok: true, setup: true, waiting: [], shown: [] });
        return fail(error);
    }
}

// POST /api/admin/spot-posts { id, action } — "approve" puts it on the
// place's wall; "remove" refuses it (or takes it down) and deletes its files.
export async function POST(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const body = await readJson(request);
    const id = typeof body?.id === "string" && UUID_PATTERN.test(body.id) ? body.id : null;
    const action = body?.action === "approve" || body?.action === "remove" ? body.action : null;
    if (!id || !action) return NextResponse.json({ ok: false, message: "Requête invalide." }, { status: 400 });

    try {
        const { data: post, error } = await db.from("nt_spot_posts").select("id,media_path,poster_path").eq("id", id).maybeSingle();
        if (error) throw error;
        if (!post) return NextResponse.json({ ok: false, message: "Publication introuvable." }, { status: 404 });

        if (action === "approve") {
            const saved = await db.from("nt_spot_posts").update({ status: "APPROVED", decided_at: new Date().toISOString() }).eq("id", id);
            if (saved.error) throw saved.error;
        } else {
            const files = [post.media_path, post.poster_path].filter((path): path is string => Boolean(path));
            const removed = await db.storage.from(POST_BUCKET).remove(files);
            if (removed.error) throw removed.error;
            const saved = await db.from("nt_spot_posts").update({ status: "REJECTED", decided_at: new Date().toISOString() }).eq("id", id);
            if (saved.error) throw saved.error;
        }
        refreshPlaces();
        return NextResponse.json({ ok: true });
    } catch (caught) {
        return fail(caught);
    }
}
