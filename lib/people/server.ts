import crypto from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { NextResponse, userAgent } from "next/server";
import { looksAutomated } from "../analytics";
import { getSupabaseAdminClient } from "../supabase/admin";
import { avatarUrl, defaultAvatar, parseAvatar } from "./avatars";
import { levelOf, pointsOf, type Stats } from "./rules";
import type { Me, Person } from "./types";

// Profiles on the server: the PIN's fingerprint, the cookie that keeps a
// phone signed in, the limits on PIN tries, and the public face of a
// profile. Only API routes use this; pages stay cached and the browser asks
// /api/me who is there.

const scrypt = promisify(crypto.scrypt) as (secret: string, salt: Buffer, length: number) => Promise<Buffer>;

export const SESSION_COOKIE = "nt_me";
const SESSION_DAYS = 365;
export const PHOTO_BUCKET = "profiles";

export const PROFILE_COLUMNS = "id,member_no,handle,name,bio,avatar,photo_path,city,area,top_places,role,status,created_at";

export type ProfileRow = {
    id: string;
    member_no: number;
    handle: string;
    name: string | null;
    bio: string | null;
    avatar: string | null;
    photo_path: string | null;
    city: string | null;
    area: string | null;
    top_places: string[] | null;
    role: string;
    status: string;
    created_at: string;
};

// ---------------------------------------------------------------- secrets

// "s1$salt$hash": scrypt, so a stolen table does not give PINs away
// cheaply. A 6-digit PIN alone is weak; the limits on tries below are
// what really protects it.
export async function hashSecret(secret: string) {
    const salt = crypto.randomBytes(16);
    const hash = await scrypt(secret, salt, 32);
    return `s1$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function secretMatches(secret: string, stored: string | null) {
    const [version, salt, hash] = (stored ?? "").split("$");
    if (version !== "s1" || !salt || !hash) return false;
    const expected = Buffer.from(hash, "base64url");
    const actual = await scrypt(secret, Buffer.from(salt, "base64url"), expected.length);
    return crypto.timingSafeEqual(actual, expected);
}

// The rescue code shown once at sign-up: 12 letters and digits that are
// hard to misread (no 0/O, 1/I/L).
export function newRecoveryCode() {
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const bytes = crypto.randomBytes(12);
    const raw = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
}

export function cleanRecoveryCode(value: unknown) {
    return typeof value === "string" ? value.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
}

const key = () => crypto.createHash("sha256").update(`nt-people:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`).digest();
const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

// A connection, recognised without being kept: a keyed fingerprint of its
// address.
export function connectionOf(request: Request) {
    const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    return crypto.createHmac("sha256", key()).update(address).digest("hex").slice(0, 32);
}

// Writes come from our own pages only.
export function foreign(request: Request) {
    const origin = request.headers.get("origin");
    if (!origin) return false;
    try {
        return new URL(origin).host !== new URL(request.url).host && new URL(origin).host !== request.headers.get("host");
    } catch {
        return true;
    }
}

export function deny(why: string, status: number, more: Record<string, unknown> = {}) {
    return NextResponse.json({ ok: false, why, ...more }, { status });
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
    try {
        const body = await request.json();
        return body && typeof body === "object" && !Array.isArray(body) ? body : {};
    } catch {
        return {};
    }
}

// Robots fill the hidden "website" field and announce themselves.
export function robot(request: Request, body: Record<string, unknown>) {
    const agent = userAgent(request);
    return agent.isBot || looksAutomated(agent.ua) || Boolean(body.website);
}

// ---------------------------------------------------------------- sessions

function deviceOf(request: Request) {
    const agent = userAgent(request);
    return [agent.device.model || agent.os.name, agent.browser.name].filter(Boolean).join(" · ").slice(0, 60) || null;
}

export async function startSession(profileId: string, request: Request) {
    const token = crypto.randomBytes(32).toString("base64url");
    const { error } = await getSupabaseAdminClient().from("nt_profile_sessions").insert({ token_hash: sha256(token), profile_id: profileId, device: deviceOf(request) });
    if (error) throw error;
    const store = await cookies();
    store.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_DAYS * 86_400,
    });
}

export async function endSession(everywhere = false) {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    store.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
    if (!token) return;
    const db = getSupabaseAdminClient();
    const session = await db.from("nt_profile_sessions").select("profile_id").eq("token_hash", sha256(token)).maybeSingle();
    if (everywhere && session.data) await db.from("nt_profile_sessions").delete().eq("profile_id", session.data.profile_id);
    else await db.from("nt_profile_sessions").delete().eq("token_hash", sha256(token));
}

// The profile signed in on this phone, or null. Its last visit is noted
// at most once an hour.
export async function currentProfile(): Promise<ProfileRow | null> {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token || token.length < 30) return null;
    const db = getSupabaseAdminClient();
    const session = await db.from("nt_profile_sessions").select("profile_id,last_seen_at").eq("token_hash", sha256(token)).maybeSingle();
    if (session.error || !session.data) return null;
    const profile = await db.from("nt_profiles").select(PROFILE_COLUMNS).eq("id", session.data.profile_id).eq("status", "ACTIVE").maybeSingle();
    if (profile.error || !profile.data) return null;
    if (Date.now() - new Date(session.data.last_seen_at as string).getTime() > 3_600_000) {
        const now = new Date().toISOString();
        await Promise.all([
            db.from("nt_profile_sessions").update({ last_seen_at: now }).eq("token_hash", sha256(token)),
            db.from("nt_profiles").update({ last_seen_at: now }).eq("id", session.data.profile_id),
        ]);
    }
    return profile.data as ProfileRow;
}

// For routes that need someone signed in.
export async function requireProfile(request: Request) {
    if (foreign(request)) return { profile: null, denied: deny("invalid", 403) } as const;
    const profile = await currentProfile().catch(() => null);
    if (!profile) return { profile: null, denied: deny("signin", 401) } as const;
    return { profile, denied: null } as const;
}

// ---------------------------------------------------------------- PIN tries

const FAILS_PER_HOUR = 25;

// Too many wrong PINs from this connection in the last hour.
export async function connectionBlocked(connection: string) {
    const since = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await getSupabaseAdminClient().from("nt_login_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", connection).eq("ok", false).gte("at", since);
    return (count ?? 0) >= FAILS_PER_HOUR;
}

export async function noteAttempt(connection: string, handle: string | null, ok: boolean) {
    const db = getSupabaseAdminClient();
    await db.from("nt_login_attempts").insert({ ip_hash: connection, handle, ok });
    // Now and then, forget tries older than two days.
    if (Math.random() < 0.03) await db.from("nt_login_attempts").delete().lt("at", new Date(Date.now() - 2 * 86_400_000).toISOString());
}

// After every fifth wrong PIN in a row the profile rests: 15 minutes, then
// 30, then an hour… up to a day.
export function lockAfter(fails: number) {
    if (fails < 5 || fails % 5 !== 0) return null;
    const minutes = Math.min(15 * 2 ** (fails / 5 - 1), 24 * 60);
    return new Date(Date.now() + minutes * 60_000).toISOString();
}

// ---------------------------------------------------------------- faces

export function photoUrl(path: string) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

export function faceOf(row: Pick<ProfileRow, "handle" | "avatar" | "photo_path">) {
    if (row.photo_path) return photoUrl(row.photo_path);
    return avatarUrl(parseAvatar(row.avatar) ? row.avatar! : defaultAvatar(row.handle));
}

const NO_STATS: Stats = { reviews: 0, photos: 0, comments: 0, cheers: 0 };

export function toPerson(row: ProfileRow, stats: Stats = NO_STATS): Person {
    const { level, points } = levelOf(pointsOf(stats));
    return {
        id: row.id,
        handle: row.handle,
        name: row.name,
        face: faceOf(row),
        area: row.area,
        city: row.city,
        role: row.role === "team" || row.role === "founder" ? row.role : "member",
        memberNo: Number(row.member_no),
        level,
        points,
    };
}

export async function statsOf(ids: string[]) {
    const stats = new Map<string, Stats>();
    if (!ids.length) return stats;
    const db = getSupabaseAdminClient();
    // Ways and live news are counted once script 012 has been run.
    // The view grows with the scripts (012: ways and live news, 013:
    // outings and follows): the richest one that exists is read.
    const shapes = ["id,reviews,photos,comments,cheers,tips,pulses,outings,followers,following", "id,reviews,photos,comments,cheers,tips,pulses", "id,reviews,photos,comments,cheers"];
    let read: { data: unknown[] | null; error: { code?: string } | null } = { data: null, error: null };
    for (const columns of shapes) {
        read = await db.from("nt_profile_stats").select(columns).in("id", ids);
        if (read.error?.code !== "42703") break;
    }
    const count = (value: unknown) => Number(value ?? 0);
    for (const row of (read.data ?? []) as Record<string, unknown>[]) {
        stats.set(row.id as string, {
            reviews: count(row.reviews),
            photos: count(row.photos),
            comments: count(row.comments),
            cheers: count(row.cheers),
            tips: count(row.tips),
            pulses: count(row.pulses),
            outings: count(row.outings),
            followers: count(row.followers),
            following: count(row.following),
        });
    }
    return stats;
}

// The public faces of several profiles at once (for a list of comments).
export async function peopleByIds(ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))];
    const people = new Map<string, Person>();
    if (!unique.length) return people;
    const [rows, stats] = await Promise.all([getSupabaseAdminClient().from("nt_profiles").select(PROFILE_COLUMNS).in("id", unique), statsOf(unique)]);
    for (const row of (rows.data ?? []) as ProfileRow[]) people.set(row.id, toPerson(row, stats.get(row.id)));
    return people;
}

export async function meOf(row: ProfileRow): Promise<Me> {
    const db = getSupabaseAdminClient();
    const [stats, saves, unread, level] = await Promise.all([
        statsOf([row.id]),
        db.from("nt_profile_saves").select("slug").eq("profile_id", row.id).order("created_at", { ascending: false }).limit(500),
        db.from("nt_notices").select("id", { count: "exact", head: true }).eq("profile_id", row.id).is("read_at", null),
        db.from("nt_notices").select("id,data").eq("profile_id", row.id).eq("kind", "level").is("read_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const own = stats.get(row.id) ?? NO_STATS;
    return {
        ...toPerson(row, own),
        avatar: row.avatar,
        photo: row.photo_path ? photoUrl(row.photo_path) : null,
        bio: row.bio,
        topPlaces: row.top_places ?? [],
        saves: (saves.data ?? []).map((save) => save.slug as string),
        stats: own,
        createdAt: row.created_at,
        // Before script 012 there is no Activité: nothing unread.
        unread: unread.error ? 0 : (unread.count ?? 0),
        levelUp: level.data ? { id: level.data.id as string, level: Number((level.data.data as { level?: number }).level ?? 0) } : null,
    };
}
