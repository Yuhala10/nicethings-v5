import { NextResponse } from "next/server";
import { notInstalled } from "@/lib/atlas/store";
import { cityBySlug } from "@/lib/cities";
import { cleanText } from "@/lib/feedback";
import { getPlacesBySlugs } from "@/lib/places/server";
import { parseAvatar } from "@/lib/people/avatars";
import { refreshPerson } from "@/lib/people/pages";
import { MAX_BIO, MAX_NAME } from "@/lib/people/rules";
import { PHOTO_BUCKET, PROFILE_COLUMNS, currentProfile, deny, endSession, meOf, readBody, requireProfile, secretMatches, type ProfileRow } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// Who is signed in on this phone. Pages are cached for everyone, so the
// browser asks here once and remembers.
export async function GET() {
    try {
        const profile = await currentProfile();
        return NextResponse.json({ ok: true, me: profile ? await meOf(profile) : null }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
        if (notInstalled(error)) return NextResponse.json({ ok: true, me: null, closed: true }, { headers: { "Cache-Control": "private, no-store" } });
        console.error("Profile not read:", error);
        return NextResponse.json({ ok: false, me: null }, { status: 502 });
    }
}

// Their own profile, changed by them: name, words, face, neighbourhood,
// their three favourite places.
export async function PATCH(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const body = await readBody(request);
    const change: Record<string, unknown> = {};

    if ("name" in body) change.name = cleanText(body.name, MAX_NAME);
    if ("bio" in body) change.bio = typeof body.bio === "string" ? body.bio.replace(/\r/g, "").replace(/\n{2,}/g, "\n").trim().slice(0, MAX_BIO) || null : null;
    if ("city" in body) change.city = cityBySlug(typeof body.city === "string" ? body.city : null)?.slug ?? null;
    if ("area" in body) change.area = cleanText(body.area, 60);
    // Choosing a drawn face puts the photo away.
    if ("avatar" in body) {
        if (!parseAvatar(body.avatar)) return deny("invalid", 422);
        change.avatar = body.avatar;
        change.photo_path = null;
    }
    if ("topPlaces" in body) {
        const wanted = Array.isArray(body.topPlaces) ? [...new Set(body.topPlaces.filter((slug): slug is string => typeof slug === "string"))].slice(0, 3) : [];
        const found = wanted.length ? await getPlacesBySlugs(wanted).catch(() => []) : [];
        change.top_places = wanted.filter((slug) => found.some((place) => place.slug === slug));
    }
    if (!Object.keys(change).length) return deny("invalid", 400);

    const db = getSupabaseAdminClient();
    const saved = await db.from("nt_profiles").update({ ...change, updated_at: new Date().toISOString() }).eq("id", profile.id).select(PROFILE_COLUMNS).single();
    if (saved.error) {
        console.error("Profile not saved:", saved.error);
        return deny("failed", 502);
    }
    if ("photo_path" in change && profile.photo_path) await db.storage.from(PHOTO_BUCKET).remove([profile.photo_path]);
    refreshPerson(profile.handle);
    return NextResponse.json({ ok: true, me: await meOf(saved.data as ProfileRow) });
}

// Leaving: with the PIN, the profile and everything signed with it go
// (reviews, comments, likes, saved places); photos on walls stay, unsigned.
export async function DELETE(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const body = await readBody(request);
    const db = getSupabaseAdminClient();
    const secret = await db.from("nt_profiles").select("pin_hash").eq("id", profile.id).single();
    if (secret.error || !(await secretMatches(typeof body.pin === "string" ? body.pin : "", secret.data.pin_hash as string))) return deny("wrong", 401);

    if (profile.photo_path) await db.storage.from(PHOTO_BUCKET).remove([profile.photo_path]);
    const gone = await db.from("nt_profiles").delete().eq("id", profile.id);
    if (gone.error) {
        console.error("Profile not deleted:", gone.error);
        return deny("failed", 502);
    }
    await endSession().catch(() => {});
    refreshPerson(profile.handle);
    return NextResponse.json({ ok: true });
}
