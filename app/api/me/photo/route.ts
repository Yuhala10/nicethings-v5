import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { refreshPerson } from "@/lib/people/pages";
import { PHOTO_BUCKET, PROFILE_COLUMNS, deny, meOf, requireProfile, type ProfileRow } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// Their own photo as their face. The phone sends it already cropped and
// small; here it is redrawn as a plain 400 × 400 JPEG, which also drops
// what a photo can hide (the place it was taken, the phone's details).

const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const type = request.headers.get("content-type") ?? "";
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return deny("invalid", 415);
    const raw = Buffer.from(await request.arrayBuffer());
    if (!raw.length || raw.length > MAX_BYTES) return deny("heavy", 413);

    let picture: Buffer;
    try {
        picture = await sharp(raw, { limitInputPixels: 40_000_000 }).rotate().resize(400, 400, { fit: "cover", position: "attention" }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
    } catch {
        return deny("unreadable", 422);
    }

    const db = getSupabaseAdminClient();
    const path = `${profile.id}/${randomUUID()}.jpg`;
    const stored = await db.storage.from(PHOTO_BUCKET).upload(path, picture, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
    if (stored.error) {
        console.error("Photo not stored:", stored.error);
        return deny("failed", 502);
    }
    const saved = await db.from("nt_profiles").update({ photo_path: path, updated_at: new Date().toISOString() }).eq("id", profile.id).select(PROFILE_COLUMNS).single();
    if (saved.error) {
        await db.storage.from(PHOTO_BUCKET).remove([path]);
        return deny("failed", 502);
    }
    if (profile.photo_path) await db.storage.from(PHOTO_BUCKET).remove([profile.photo_path]);
    refreshPerson(profile.handle);
    return NextResponse.json({ ok: true, me: await meOf(saved.data as ProfileRow) });
}

// Back to the drawn avatar.
export async function DELETE(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const db = getSupabaseAdminClient();
    const saved = await db.from("nt_profiles").update({ photo_path: null, updated_at: new Date().toISOString() }).eq("id", profile.id).select(PROFILE_COLUMNS).single();
    if (saved.error) return deny("failed", 502);
    if (profile.photo_path) await db.storage.from(PHOTO_BUCKET).remove([profile.photo_path]);
    refreshPerson(profile.handle);
    return NextResponse.json({ ok: true, me: await meOf(saved.data as ProfileRow) });
}
