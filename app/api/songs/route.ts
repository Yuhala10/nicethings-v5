import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { notInstalled } from "@/lib/atlas/store";
import { deny, readBody, requireProfile } from "@/lib/people/server";
import { MAX_SONG_BYTES, SONG_BUCKET, SONG_GENRES, SONG_TYPES, SONGS_PER_DAY, loadLibrary } from "@/lib/songs";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// The songs one can put on an outing (GET), and an artist sending theirs
// (POST): it waits for the team, who listen to it first. The file goes
// straight from the phone to storage with a one-time permission.

export async function GET() {
    try {
        const songs = await loadLibrary();
        return NextResponse.json({ ok: true, closed: songs === null, songs: songs ?? [] }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=120" } });
    } catch (error) {
        console.error("Songs not read:", error);
        return deny("failed", 502);
    }
}

const text = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

// { title, artist, genre, link, contact, consent: true, type, size }
export async function POST(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const body = await readBody(request);
    const title = text(body.title, 120);
    const artist = text(body.artist, 160);
    const genre = (SONG_GENRES as readonly string[]).includes(body.genre as string) ? (body.genre as string) : "other";
    const link = text(body.link, 300);
    const contact = text(body.contact, 40);
    const ext = typeof body.type === "string" ? SONG_TYPES[body.type] : undefined;
    const size = Number(body.size);
    if (!title || !artist || body.consent !== true) return deny("invalid", 422);
    if (link && !/^https?:\/\/[^\s]+\.[^\s]+/i.test(link)) return deny("link", 422);
    if (contact.replace(/\D/g, "").length < 8) return deny("contact", 422);
    if (!ext) return deny("media", 422);
    if (!Number.isFinite(size) || size <= 0 || size > MAX_SONG_BYTES) return deny("heavy", 413);

    const db = getSupabaseAdminClient();
    try {
        const since = new Date(Date.now() - 86_400_000).toISOString();
        const today = await db.from("nt_songs").select("id", { count: "exact", head: true }).eq("profile_id", profile.id).gte("created_at", since);
        if (today.error) throw today.error;
        if ((today.count ?? 0) >= SONGS_PER_DAY) return deny("many", 429);

        const path = `artists/${randomUUID()}.${ext}`;
        const row = await db
            .from("nt_songs")
            .insert({ title, artist, genre, file_path: path, licence: "artist", link: link || null, source_url: link || null, contact, profile_id: profile.id, status: "PENDING" })
            .select("id")
            .single();
        if (row.error) throw row.error;
        const upload = await db.storage.from(SONG_BUCKET).createSignedUploadUrl(path);
        if (upload.error) throw upload.error;
        return NextResponse.json({ ok: true, id: row.data.id, upload: { path, token: upload.data.token } });
    } catch (error) {
        if (notInstalled(error)) return deny("closed", 503);
        console.error("Song not received:", error);
        return deny("failed", 502);
    }
}
