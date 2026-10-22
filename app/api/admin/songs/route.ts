import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { UUID_PATTERN, fail, readJson, requireAdmin } from "@/lib/admin-api";
import { notInstalled } from "@/lib/atlas/store";
import { peopleByIds } from "@/lib/people/server";
import { MAX_SONG_BYTES, SONG_BUCKET, SONG_GENRES, SONG_LICENCES, SONG_TYPES, songUrl } from "@/lib/songs";

// The song library, for the team: songs sent by artists wait here to be
// listened to (and given the second their best part starts), then go LIVE;
// the team also adds songs it may use (Pixabay, Creative Commons BY).

const NOW = { expire: 0 };
const text = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

export async function GET() {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    try {
        const rows = await db.from("nt_songs").select("*").order("created_at", { ascending: false }).limit(500);
        if (rows.error) throw rows.error;
        const people = await peopleByIds((rows.data ?? []).map((row) => row.profile_id as string).filter(Boolean));
        return NextResponse.json({
            ok: true,
            setup: false,
            songs: (rows.data ?? []).map((row) => ({ ...row, url: songUrl(row.file_path as string), person: row.profile_id ? (people.get(row.profile_id as string) ?? null) : null })),
        });
    } catch (error) {
        if (notInstalled(error)) return NextResponse.json({ ok: true, setup: true, songs: [] });
        return fail(error);
    }
}

// { action: "create", title, artist, genre, licence, licence_note, source_url, link, start_at, type, size }
// { action: "delete", id }
export async function POST(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const body = await readJson(request);
    if (!body) return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
    try {
        if (body.action === "delete") {
            if (typeof body.id !== "string" || !UUID_PATTERN.test(body.id)) return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
            const gone = await db.from("nt_songs").delete().eq("id", body.id).select("file_path").maybeSingle();
            if (gone.error) throw gone.error;
            if (gone.data?.file_path) await db.storage.from(SONG_BUCKET).remove([gone.data.file_path as string]);
            revalidateTag("songs", NOW);
            return NextResponse.json({ ok: true });
        }
        const title = text(body.title, 120);
        const artist = text(body.artist, 160);
        const ext = typeof body.type === "string" ? SONG_TYPES[body.type] : undefined;
        const size = Number(body.size);
        const licence = (SONG_LICENCES as readonly string[]).includes(body.licence as string) ? (body.licence as string) : null;
        if (!title || !artist || !ext || !licence || !(size > 0 && size <= MAX_SONG_BYTES)) return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
        const path = `library/${randomUUID()}.${ext}`;
        const row = await db
            .from("nt_songs")
            .insert({
                title,
                artist,
                genre: (SONG_GENRES as readonly string[]).includes(body.genre as string) ? body.genre : "other",
                file_path: path,
                start_at: Math.max(0, Number(body.start_at) || 0),
                licence,
                licence_note: text(body.licence_note, 80) || null,
                source_url: text(body.source_url, 300) || null,
                link: text(body.link, 300) || null,
                status: "PENDING",
            })
            .select("id")
            .single();
        if (row.error) throw row.error;
        const upload = await db.storage.from(SONG_BUCKET).createSignedUploadUrl(path);
        if (upload.error) throw upload.error;
        return NextResponse.json({ ok: true, id: row.data.id, upload: { path, token: upload.data.token } });
    } catch (error) {
        return fail(error);
    }
}

// { id, status?, start_at?, title?, artist?, genre?, link?, licence_note? }
export async function PATCH(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const body = await readJson(request);
    if (!body || typeof body.id !== "string" || !UUID_PATTERN.test(body.id)) return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
    const change: Record<string, unknown> = {};
    if (["PENDING", "LIVE", "HIDDEN"].includes(body.status as string)) change.status = body.status;
    if (body.start_at !== undefined) change.start_at = Math.max(0, Number(body.start_at) || 0);
    if (text(body.title, 120)) change.title = text(body.title, 120);
    if (text(body.artist, 160)) change.artist = text(body.artist, 160);
    if ((SONG_GENRES as readonly string[]).includes(body.genre as string)) change.genre = body.genre;
    if (body.link !== undefined) change.link = text(body.link, 300) || null;
    if (body.licence_note !== undefined) change.licence_note = text(body.licence_note, 80) || null;
    try {
        const saved = await db.from("nt_songs").update(change).eq("id", body.id).select("*").single();
        if (saved.error) throw saved.error;
        revalidateTag("songs", NOW);
        return NextResponse.json({ ok: true, row: saved.data });
    } catch (error) {
        return fail(error);
    }
}
