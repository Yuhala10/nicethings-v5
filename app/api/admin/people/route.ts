import { NextResponse } from "next/server";
import { UUID_PATTERN, fail, readJson, requireAdmin } from "@/lib/admin-api";
import { notInstalled } from "@/lib/atlas/store";
import { refreshPerson } from "@/lib/people/pages";
import { PHOTO_BUCKET, PROFILE_COLUMNS, statsOf, toPerson, type ProfileRow } from "@/lib/people/server";

// The members: who joined, how active they are, who was reported. The team
// can take a photo down, suspend a profile (and restore it), and give the
// team's or the founder's badge.

export async function GET() {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    try {
        const [rows, total, week, flags] = await Promise.all([
            db.from("nt_profiles").select(`${PROFILE_COLUMNS},last_seen_at`).order("created_at", { ascending: false }).limit(300),
            db.from("nt_profiles").select("id", { count: "exact", head: true }),
            db.from("nt_profiles").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString()),
            db.from("nt_flags").select("item_id").eq("kind", "profile"),
        ]);
        if (rows.error) throw rows.error;
        const list = (rows.data ?? []) as (ProfileRow & { last_seen_at: string })[];
        const stats = await statsOf(list.map((row) => row.id));
        const reported = new Map<string, number>();
        for (const flag of flags.data ?? []) reported.set(flag.item_id as string, (reported.get(flag.item_id as string) ?? 0) + 1);
        return NextResponse.json({
            ok: true,
            setup: false,
            total: total.count ?? list.length,
            week: week.count ?? 0,
            people: list.map((row) => ({
                ...toPerson(row, stats.get(row.id)),
                bio: row.bio,
                status: row.status,
                photo: Boolean(row.photo_path),
                stats: stats.get(row.id) ?? { reviews: 0, photos: 0, comments: 0, cheers: 0 },
                reports: reported.get(row.id) ?? 0,
                createdAt: row.created_at,
                lastSeen: row.last_seen_at,
            })),
        });
    } catch (error) {
        if (notInstalled(error)) return NextResponse.json({ ok: true, setup: true, total: 0, week: 0, people: [] });
        return fail(error);
    }
}

// PATCH /api/admin/people { id, action: "suspend" | "restore" | "photo" | "role", role? }
export async function PATCH(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const body = await readJson(request);
    const id = typeof body?.id === "string" && UUID_PATTERN.test(body.id) ? body.id : null;
    const action = body?.action;
    if (!id) return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });

    try {
        const found = await db.from("nt_profiles").select("handle,photo_path").eq("id", id).maybeSingle();
        if (found.error) throw found.error;
        if (!found.data) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

        if (action === "suspend" || action === "restore") {
            const saved = await db.from("nt_profiles").update({ status: action === "suspend" ? "SUSPENDED" : "ACTIVE" }).eq("id", id);
            if (saved.error) throw saved.error;
            // A suspended profile is signed out everywhere.
            if (action === "suspend") await db.from("nt_profile_sessions").delete().eq("profile_id", id);
        } else if (action === "photo") {
            if (found.data.photo_path) await db.storage.from(PHOTO_BUCKET).remove([found.data.photo_path as string]);
            const saved = await db.from("nt_profiles").update({ photo_path: null }).eq("id", id);
            if (saved.error) throw saved.error;
        } else if (action === "role" && (body?.role === "member" || body?.role === "team" || body?.role === "founder")) {
            const saved = await db.from("nt_profiles").update({ role: body.role }).eq("id", id);
            if (saved.error) throw saved.error;
        } else {
            return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
        }
        refreshPerson(found.data.handle as string);
        return NextResponse.json({ ok: true });
    } catch (error) {
        return fail(error);
    }
}
