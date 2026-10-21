import crypto from "node:crypto";
import { after } from "next/server";
import { getDictionary, type Locale } from "../i18n";
import { paths } from "../places/paths";
import { getSupabaseAdminClient } from "../supabase/admin";
import { notify, pushToPhones } from "./notices";
import { placesById } from "./outings";
import type { ProfileRow } from "./server";
import type { ChatFlame, ChatKind, ChatMessage, ChatPresence, ChatPrivacy, ChatRequest, ChatWrite, KwatPlace } from "./types";

// Messages between two members (server only, script 014): who may write to
// whom, la flamme, the read ticks, "en ligne", the notifications, and the
// instant signal that tells the phones to look (Supabase Realtime: the
// signal carries nothing but "something changed"; what changed is read
// through the site's API, by the two members only).

// Before script 014: its tables (or its columns on profiles) are missing.
export function chatsClosed(error: unknown) {
    const code = (error as { code?: string } | null)?.code;
    return code === "PGRST205" || code === "42P01" || code === "42703" || code === "PGRST204";
}

export const CHAT_BUCKET = "chats";
export const MAX_MESSAGE = 2000;
export const MESSAGES_PER_MINUTE = 30;
// A request (to someone who does not follow you) holds this many messages
// until it is accepted, and no photo or voice note.
export const REQUEST_MESSAGES = 3;
export const NEW_CHATS_PER_DAY = 20;
// A message can be taken back for everyone within a day.
export const TAKE_BACK_MS = 24 * 3_600_000;
export const MAX_VOICE_SECONDS = 180;
export const MAX_CHAT_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_VOICE_BYTES = 6 * 1024 * 1024;
export const REACTIONS = ["❤️", "😂", "🔥", "👍", "😮", "🙏"] as const;
// The milestones of la flamme that are celebrated.
export const FLAME_MILESTONES = [7, 30, 100, 365];

export const CHAT_TYPES: Record<string, { kind: "photo" | "voice"; ext: string }> = {
    "image/jpeg": { kind: "photo", ext: "jpg" },
    "image/webp": { kind: "photo", ext: "webp" },
    "image/png": { kind: "photo", ext: "png" },
    "audio/webm": { kind: "voice", ext: "webm" },
    "audio/ogg": { kind: "voice", ext: "ogg" },
    "audio/mp4": { kind: "voice", ext: "m4a" },
    "audio/aac": { kind: "voice", ext: "aac" },
    "audio/mpeg": { kind: "voice", ext: "mp3" },
};
// "audio/webm;codecs=opus" → "audio/webm".
export const baseType = (type: unknown) => (typeof type === "string" ? type.split(";")[0].trim().toLowerCase() : "");

export const CHAT_COLUMNS =
    "id,a_id,b_id,started_by,accepted,created_at,last_at,last_message_id,a_read_at,b_read_at,a_cleared_at,b_cleared_at,a_archived,b_archived,a_muted,b_muted,a_pinned,b_pinned,a_day,b_day,flame,flame_day,flame_best";
export const MESSAGE_COLUMNS = "id,chat_id,sender_id,kind,body,media_path,media_width,media_height,duration,spot_id,plan_at,plan_answers,reply_to,reactions,status,created_at,updated_at";
export const PRESENCE_COLUMNS = "id,handle,status,messages_from,hide_last_seen,hide_read,active_at,last_seen_at";

export type ChatRow = {
    id: string;
    a_id: string;
    b_id: string;
    started_by: string;
    accepted: boolean;
    created_at: string;
    last_at: string;
    last_message_id: string | null;
    a_read_at: string | null;
    b_read_at: string | null;
    a_cleared_at: string | null;
    b_cleared_at: string | null;
    a_archived: boolean;
    b_archived: boolean;
    a_muted: boolean;
    b_muted: boolean;
    a_pinned: boolean;
    b_pinned: boolean;
    a_day: string | null;
    b_day: string | null;
    flame: number;
    flame_day: string | null;
    flame_best: number;
};

export type MessageRow = {
    id: string;
    chat_id: string;
    sender_id: string;
    kind: ChatKind;
    body: string | null;
    media_path: string | null;
    media_width: number | null;
    media_height: number | null;
    duration: number | string | null;
    spot_id: string | null;
    plan_at: string | null;
    plan_answers: Record<string, "yes" | "no"> | null;
    reply_to: string | null;
    reactions: Record<string, string> | null;
    status: "DRAFT" | "SENT" | "DELETED";
    created_at: string;
    updated_at: string;
};

export type PresenceRow = {
    id: string;
    handle: string;
    status: string;
    messages_from: ChatPrivacy["messagesFrom"];
    hide_last_seen: boolean;
    hide_read: boolean;
    active_at: string | null;
    last_seen_at: string | null;
};

type Side = "a" | "b";
export const sideOf = (chat: ChatRow, me: string): Side => (chat.a_id === me ? "a" : "b");
export const otherSide = (side: Side): Side => (side === "a" ? "b" : "a");
export const otherOf = (chat: ChatRow, me: string) => (chat.a_id === me ? chat.b_id : chat.a_id);
export const pairOf = (x: string, y: string) => (x < y ? [x, y] : [y, x]);
// One of the two sides' own fields: mine(chat, me, "read_at").
export const field = <K extends "read_at" | "cleared_at" | "archived" | "muted" | "pinned" | "day">(chat: ChatRow, side: Side, key: K) => chat[`${side}_${key}` as keyof ChatRow] as ChatRow[`a_${K}`];

export function requestOf(chat: ChatRow, me: string): ChatRequest {
    if (chat.accepted) return null;
    return chat.started_by === me ? "outgoing" : "incoming";
}

// ---------------------------------------------------------------- days and la flamme

const HOUR = 3_600_000;
// A day in Douala (UTC+1, no summer time), "YYYY-MM-DD".
export const dayOf = (shift = 0) => new Date(Date.now() + HOUR + shift * 24 * HOUR).toISOString().slice(0, 10);
const doualaHour = () => new Date(Date.now() + HOUR).getUTCHours();

export function flameOf(chat: Pick<ChatRow, "flame" | "flame_day" | "flame_best">): ChatFlame | null {
    if (!chat.flame || !chat.flame_day) return null;
    const today = dayOf();
    const yesterday = dayOf(-1);
    if (chat.flame_day !== today && chat.flame_day !== yesterday) return null;
    return { count: chat.flame, best: chat.flame_best, alive: true, ending: chat.flame_day === yesterday && doualaHour() >= 18 };
}

// ---------------------------------------------------------------- instant signals

const secret = () => crypto.createHash("sha256").update(`nt-chat:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`).digest();
const sign = (value: string) => crypto.createHmac("sha256", secret()).update(value).digest("base64url").slice(0, 22);
// Names nobody can guess: only the two members are given their chat's,
// only the member their inbox's.
export const chatTopic = (chatId: string) => `ntc-${sign(`chat:${chatId}`)}`;
export const inboxTopic = (profileId: string) => `nti-${sign(`inbox:${profileId}`)}`;

// "Look again": sent after the answer, never in its way.
export function signal(topics: string[], event: "m" | "r" = "m") {
    after(async () => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
                method: "POST",
                headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ messages: topics.map((topic) => ({ topic, event, payload: { at: Date.now() } })) }),
                signal: AbortSignal.timeout(5000),
            });
        } catch {}
    });
}

// ---------------------------------------------------------------- presence

export async function presenceRows(ids: string[]) {
    const rows = await getSupabaseAdminClient().from("nt_profiles").select(PRESENCE_COLUMNS).in("id", [...new Set(ids)]);
    if (rows.error) throw rows.error;
    return new Map(((rows.data ?? []) as PresenceRow[]).map((row) => [row.id, row]));
}

const ONLINE_MS = 60_000;

// What one sees of the other: hidden both ways when either hides it.
export function presenceOf(other: PresenceRow | undefined, mine: PresenceRow | undefined): ChatPresence {
    if (!other || other.hide_last_seen || mine?.hide_last_seen) return { online: false, lastSeen: null };
    const active = other.active_at ?? other.last_seen_at;
    return { online: Boolean(other.active_at && Date.now() - Date.parse(other.active_at) < ONLINE_MS), lastSeen: active };
}

// Noted at most every 20 seconds, while messages are open.
export async function noteActive(profileId: string) {
    const cut = new Date(Date.now() - 20_000).toISOString();
    await getSupabaseAdminClient().from("nt_profiles").update({ active_at: new Date().toISOString() }).eq("id", profileId).or(`active_at.is.null,active_at.lt."${cut}"`);
}

// ---------------------------------------------------------------- who may write

export async function blocksBetween(me: string, other: string) {
    const { data } = await getSupabaseAdminClient().from("nt_blocks").select("blocker_id").or(`and(blocker_id.eq.${me},blocked_id.eq.${other}),and(blocker_id.eq.${other},blocked_id.eq.${me})`);
    const rows = data ?? [];
    return { byMe: rows.some((row) => row.blocker_id === me), byThem: rows.some((row) => row.blocker_id === other) };
}

export async function follows(follower: string, followed: string) {
    const { data } = await getSupabaseAdminClient().from("nt_follows").select("follower_id").eq("follower_id", follower).eq("followed_id", followed).maybeSingle();
    return Boolean(data);
}

export async function writeCheck(me: string, other: PresenceRow | undefined, chat: ChatRow | null): Promise<ChatWrite> {
    if (!other || other.status !== "ACTIVE") return { ok: false, why: "unavailable" };
    const blocks = await blocksBetween(me, other.id);
    if (blocks.byMe) return { ok: false, why: "blocked" };
    if (blocks.byThem) return { ok: false, why: "unavailable" };
    if (chat?.accepted) return { ok: true };
    // Answering a request accepts it.
    if (chat && chat.started_by !== me) return { ok: true };
    if (other.messages_from === "nobody") return { ok: false, why: "closed" };
    if (other.messages_from === "following" && !(await follows(other.id, me))) return { ok: false, why: "following" };
    if (chat) {
        const { count } = await getSupabaseAdminClient().from("nt_messages").select("id", { count: "exact", head: true }).eq("chat_id", chat.id).eq("sender_id", me).neq("status", "DRAFT");
        if ((count ?? 0) >= REQUEST_MESSAGES) return { ok: false, why: "limit" };
    }
    return { ok: true };
}

// ---------------------------------------------------------------- messages as phones see them

export function reactionsOf(raw: Record<string, string> | null, me: string) {
    const counts = new Map<string, { count: number; mine: boolean }>();
    for (const [who, emoji] of Object.entries(raw ?? {})) {
        const entry = counts.get(emoji) ?? { count: 0, mine: false };
        entry.count++;
        if (who === me) entry.mine = true;
        counts.set(emoji, entry);
    }
    return [...counts.entries()].map(([emoji, entry]) => ({ emoji, ...entry }));
}

export async function messageViews(rows: MessageRow[], me: string): Promise<ChatMessage[]> {
    if (!rows.length) return [];
    const db = getSupabaseAdminClient();
    const missing = [...new Set(rows.map((row) => row.reply_to).filter((id): id is string => Boolean(id) && !rows.some((row) => row.id === id)))];
    const replied = missing.length ? (((await db.from("nt_messages").select(MESSAGE_COLUMNS).in("id", missing)).data ?? []) as MessageRow[]) : [];
    const all = new Map([...rows, ...replied].map((row) => [row.id, row]));

    // Photos and voice notes: links that work for an hour, for these two only.
    const files = rows.filter((row) => row.media_path && row.status !== "DELETED").map((row) => row.media_path!);
    const links = new Map<string, string>();
    if (files.length) {
        const signed = await db.storage.from(CHAT_BUCKET).createSignedUrls(files, 3600);
        for (const item of signed.data ?? []) if (item.path && item.signedUrl) links.set(item.path, item.signedUrl);
    }
    const places = rows.some((row) => row.spot_id) ? await placesById() : new Map<string, KwatPlace>();

    return rows.map((row) => {
        const deleted = row.status === "DELETED";
        const reply = row.reply_to ? all.get(row.reply_to) : undefined;
        const answers = row.plan_answers ?? {};
        const theirs = Object.entries(answers).find(([who]) => who !== me)?.[1] ?? null;
        return {
            id: row.id,
            mine: row.sender_id === me,
            kind: row.kind,
            body: deleted ? null : row.body,
            media: !deleted && row.media_path && links.has(row.media_path) ? { url: links.get(row.media_path)!, width: row.media_width, height: row.media_height, duration: row.duration === null ? null : Number(row.duration) } : null,
            place: !deleted && row.spot_id ? (places.get(row.spot_id) ?? null) : null,
            plan: !deleted && row.kind === "plan" && row.plan_at ? { at: row.plan_at, mine: answers[me] ?? null, theirs } : null,
            reply: reply ? { id: reply.id, mine: reply.sender_id === me, kind: reply.kind, body: reply.status === "DELETED" ? null : reply.body, deleted: reply.status === "DELETED" } : null,
            reactions: deleted ? [] : reactionsOf(row.reactions, me),
            deleted,
            pending: row.status === "DRAFT",
            at: row.created_at,
            changedAt: row.updated_at,
        };
    });
}

// ---------------------------------------------------------------- after a message is out

function preview(kind: ChatKind, body: string | null, place: string | null, lang: Locale) {
    const words = getDictionary(lang).people.chat.preview;
    if (kind === "photo") return words.photo;
    if (kind === "voice") return words.voice;
    if (kind === "place") return `📍 ${place ?? ""}`;
    if (kind === "plan") return `📅 ${words.plan} ${place ?? ""}`;
    const text = (body ?? "").replace(/\s+/g, " ").trim();
    return text.length > 120 ? `${text.slice(0, 118)}…` : text;
}

// The conversation moves up, la flamme may grow, the other's phones are
// told (unless the conversation is muted or they are looking right now).
export async function afterSend(chat: ChatRow, message: MessageRow, sender: ProfileRow, other: PresenceRow) {
    const db = getSupabaseAdminClient();
    const side = sideOf(chat, sender.id);
    const theirs = otherSide(side);
    const now = new Date().toISOString();
    const today = dayOf();
    const updates: Record<string, unknown> = { last_at: now, last_message_id: message.id, [`${side}_day`]: today, [`${side}_read_at`]: now, [`${theirs}_archived`]: false };
    // Answering a request accepts it.
    if (!chat.accepted && chat.started_by !== sender.id) updates.accepted = true;
    let milestone = 0;
    if (field(chat, theirs, "day") === today && chat.flame_day !== today) {
        const count = chat.flame_day === dayOf(-1) ? chat.flame + 1 : 1;
        updates.flame = count;
        updates.flame_day = today;
        updates.flame_best = Math.max(chat.flame_best, count);
        if (FLAME_MILESTONES.includes(count)) milestone = count;
    }
    const saved = await db.from("nt_chats").update(updates).eq("id", chat.id);
    if (saved.error) throw saved.error;

    if (milestone) {
        await notify(other.id, "flame", { id: sender.id, handle: sender.handle }, { flame: milestone });
        await notify(sender.id, "flame", { id: other.id, handle: other.handle }, { flame: milestone });
    }

    const looking = other.active_at && Date.now() - Date.parse(other.active_at) < 30_000;
    if (!field(chat, theirs, "muted") && !looking) {
        const place = message.spot_id ? ((await placesById()).get(message.spot_id)?.name ?? null) : null;
        const request = !chat.accepted && chat.started_by === sender.id;
        const name = sender.name?.trim() || `@${sender.handle}`;
        after(() =>
            pushToPhones(other.id, (lang) => {
                const words = getDictionary(lang).people.chat;
                return request
                    ? { title: words.push.requestTitle, body: words.push.request.replace("{name}", name), url: paths.messages(lang), tag: `chat-${chat.id}` }
                    : { title: name, body: preview(message.kind, message.body, place, lang), url: paths.chat(lang, sender.handle), tag: `chat-${chat.id}` };
            }).catch((error) => console.error("Message push failed:", error))
        );
    }
    signal([chatTopic(chat.id), inboxTopic(other.id), inboxTopic(sender.id)]);
}
