import { NextResponse } from "next/server";
import { getPlace } from "@/lib/places/server";
import { UUID } from "@/lib/posts";
import {
    chatsClosed,
    CHAT_BUCKET,
    CHAT_COLUMNS,
    CHAT_TYPES,
    MAX_CHAT_PHOTO_BYTES,
    MAX_MESSAGE,
    MAX_VOICE_BYTES,
    MAX_VOICE_SECONDS,
    MESSAGES_PER_MINUTE,
    cleanWaveform,
    hasVoiceColumns,
    messageColumns,
    NEW_CHATS_PER_DAY,
    REACTIONS,
    TAKE_BACK_MS,
    afterSend,
    baseType,
    chatTopic,
    follows,
    inboxTopic,
    messageViews,
    otherOf,
    pairOf,
    presenceRows,
    signal,
    writeCheck,
    type ChatRow,
    type MessageRow,
} from "@/lib/people/chats";
import { normalizeHandle } from "@/lib/people/rules";
import { deny, readBody, requireProfile } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// Sending a message, and what can be done to one afterwards.

const clean = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\r/g, "").replace(/\n{4,}/g, "\n\n\n").trim().slice(0, max) : "");

// POST { to: handle } or { chat: id }, then the message:
//   { kind: "text", body }
//   { kind: "place", place: slug, body? }
//   { kind: "plan", place: slug, at: ISO time, body? }
//   { kind: "photo" | "voice", media: { type, size, width?, height?, duration? }, body? }
//   and { reply: id } to answer one message.
// A photo or a voice note is written as a draft with a one-time permission
// to send its file; PATCH { id, action: "sent" } puts it out.
export async function POST(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const me = profile.id;
    const body = await readBody(request);
    const db = getSupabaseAdminClient();
    try {
        // Who to.
        let chat: ChatRow | null = null;
        let otherId: string | null = null;
        if (typeof body.chat === "string" && UUID.test(body.chat)) {
            const found = await db.from("nt_chats").select(CHAT_COLUMNS).eq("id", body.chat).maybeSingle();
            chat = found.data as ChatRow | null;
            if (!chat || (chat.a_id !== me && chat.b_id !== me)) return deny("invalid", 404);
            otherId = otherOf(chat, me);
        } else {
            const handle = normalizeHandle(typeof body.to === "string" ? body.to : "");
            if (!handle || handle === profile.handle) return deny("invalid", 400);
            const found = await db.from("nt_profiles").select("id").eq("handle", handle).maybeSingle();
            if (!found.data) return deny("invalid", 404);
            otherId = found.data.id as string;
            const [a, b] = pairOf(me, otherId);
            chat = ((await db.from("nt_chats").select(CHAT_COLUMNS).eq("a_id", a).eq("b_id", b).maybeSingle()).data as ChatRow | null) ?? null;
        }
        const presence = await presenceRows([me, otherId]);
        const other = presence.get(otherId);
        const may = await writeCheck(me, other, chat);
        if (may.ok === false) return deny(may.why, 403);

        // What.
        const kind = ["text", "photo", "voice", "place", "plan"].includes(body.kind as string) ? (body.kind as MessageRow["kind"]) : null;
        if (!kind) return deny("invalid", 400);
        const text = clean(body.body, MAX_MESSAGE);
        const row: Record<string, unknown> = { sender_id: me, kind, body: text || null };
        if (kind === "text" && !text) return deny("empty", 422);
        if (kind === "place" || kind === "plan") {
            const place = typeof body.place === "string" && body.place.length <= 200 ? await getPlace(body.place).catch(() => null) : null;
            if (!place) return deny("place", 422);
            row.spot_id = place.id;
            if (kind === "plan") {
                const at = Date.parse(typeof body.at === "string" ? body.at : "");
                if (!Number.isFinite(at) || at < Date.now() - 3_600_000 || at > Date.now() + 90 * 86_400_000) return deny("when", 422);
                row.plan_at = new Date(at).toISOString();
                row.plan_answers = { [me]: "yes" };
            }
        }
        const request = !chat?.accepted && (!chat || chat.started_by === me);
        let type: { kind: "photo" | "voice"; ext: string } | undefined;
        if (kind === "photo" || kind === "voice") {
            // Files wait until the conversation is accepted.
            if (request && !(otherId && (await follows(otherId, me)))) return deny("request-media", 403);
            const media = (body.media ?? {}) as Record<string, unknown>;
            type = CHAT_TYPES[baseType(media.type)];
            const size = Number(media.size);
            if (!type || type.kind !== kind) return deny("media", 422);
            if (!Number.isFinite(size) || size <= 0 || size > (kind === "photo" ? MAX_CHAT_PHOTO_BYTES : MAX_VOICE_BYTES)) return deny("heavy", 413);
            const duration = Number(media.duration);
            if (kind === "voice" && !(duration > 0 && duration <= MAX_VOICE_SECONDS + 1)) return deny("long", 422);
            row.media_width = Number.isFinite(Number(media.width)) ? Math.round(Number(media.width)) || null : null;
            row.media_height = Number.isFinite(Number(media.height)) ? Math.round(Number(media.height)) || null : null;
            row.duration = kind === "voice" ? Math.round(duration * 10) / 10 : null;
            // The shape of the voice, drawn while recording (script 015).
            if (kind === "voice" && (await hasVoiceColumns())) row.waveform = cleanWaveform(media.waveform);
            row.status = "DRAFT";
        }

        // Not too fast, not too many new people a day.
        const minute = await db.from("nt_messages").select("id", { count: "exact", head: true }).eq("sender_id", me).gte("created_at", new Date(Date.now() - 60_000).toISOString());
        if ((minute.count ?? 0) >= MESSAGES_PER_MINUTE) return deny("many", 429);
        if (!chat) {
            const day = await db.from("nt_chats").select("id", { count: "exact", head: true }).eq("started_by", me).gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
            if ((day.count ?? 0) >= NEW_CHATS_PER_DAY) return deny("many", 429);
            const [a, b] = pairOf(me, otherId);
            const made = await db.from("nt_chats").insert({ a_id: a, b_id: b, started_by: me, accepted: await follows(otherId, me) }).select(CHAT_COLUMNS).single();
            // Two first messages at once: the other one made it.
            chat = (made.data as ChatRow | null) ?? ((await db.from("nt_chats").select(CHAT_COLUMNS).eq("a_id", a).eq("b_id", b).single()).data as ChatRow);
        }
        if (typeof body.reply === "string" && UUID.test(body.reply)) {
            const replied = await db.from("nt_messages").select("id").eq("id", body.reply).eq("chat_id", chat.id).maybeSingle();
            if (replied.data) row.reply_to = body.reply;
        }

        const inserted = await db.from("nt_messages").insert({ ...row, chat_id: chat.id }).select(await messageColumns()).single();
        if (inserted.error) throw inserted.error;
        const message = inserted.data as unknown as MessageRow;
        let upload: { path: string; token: string } | null = null;
        if (type) {
            const path = `${chat.id}/${message.id}.${type.ext}`;
            const signed = await db.storage.from(CHAT_BUCKET).createSignedUploadUrl(path);
            if (signed.error) throw signed.error;
            await db.from("nt_messages").update({ media_path: path }).eq("id", message.id);
            message.media_path = path;
            upload = { path, token: signed.data.token };
        } else {
            await afterSend(chat, message, profile, other!);
        }
        const [view] = await messageViews([message], me);
        return NextResponse.json({ ok: true, message: view, chat: { id: chat.id, key: chatTopic(chat.id) }, upload });
    } catch (error) {
        if (chatsClosed(error)) return deny("closed", 503);
        console.error("Message not sent:", error);
        return deny("failed", 502);
    }
}

// PATCH { id, action }:
//   "sent"                → its file is there: out it goes
//   "react", emoji | null → one reaction per person (null takes it back)
//   "answer", "yes"|"no"  → the answer to an "on y va ?"
//   "delete"              → taken back for everyone (own messages, within a day)
//   "listened"            → the other person played the voice note (script 015)
export async function PATCH(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const me = profile.id;
    const body = await readBody(request);
    const id = typeof body.id === "string" && UUID.test(body.id) ? body.id : null;
    if (!id) return deny("invalid", 400);
    const db = getSupabaseAdminClient();
    try {
        const columns = await messageColumns();
        const found = await db.from("nt_messages").select(columns).eq("id", id).maybeSingle();
        const message = found.data as unknown as MessageRow | null;
        if (!message) return deny("invalid", 404);
        const chat = (await db.from("nt_chats").select(CHAT_COLUMNS).eq("id", message.chat_id).single()).data as ChatRow;
        if (chat.a_id !== me && chat.b_id !== me) return deny("invalid", 404);
        const otherId = otherOf(chat, me);
        const now = new Date().toISOString();
        let change: Record<string, unknown> | null = null;

        if (body.action === "sent") {
            if (message.sender_id !== me || message.status !== "DRAFT") return deny("invalid", 409);
            const saved = await db.from("nt_messages").update({ status: "SENT", created_at: now, updated_at: now }).eq("id", id).select(columns).single();
            if (saved.error) throw saved.error;
            const presence = await presenceRows([otherId]);
            await afterSend(chat, saved.data as unknown as MessageRow, profile, presence.get(otherId)!);
            const [view] = await messageViews([saved.data as unknown as MessageRow], me);
            return NextResponse.json({ ok: true, message: view });
        }
        if (message.status !== "SENT") return deny("invalid", 409);
        if (body.action === "react") {
            const emoji = typeof body.emoji === "string" && (REACTIONS as readonly string[]).includes(body.emoji) ? body.emoji : null;
            const reactions = { ...(message.reactions ?? {}) };
            if (emoji) reactions[me] = emoji;
            else delete reactions[me];
            change = { reactions };
        } else if (body.action === "answer" && message.kind === "plan") {
            const answer = body.answer === "yes" || body.answer === "no" ? body.answer : null;
            if (!answer) return deny("invalid", 400);
            change = { plan_answers: { ...(message.plan_answers ?? {}), [me]: answer } };
        } else if (body.action === "listened") {
            if (message.kind !== "voice" || message.sender_id === me || !(await hasVoiceColumns())) return deny("invalid", 409);
            if (message.listened_at) {
                const [view] = await messageViews([message], me);
                return NextResponse.json({ ok: true, message: view });
            }
            change = { listened_at: now };
        } else if (body.action === "delete") {
            if (message.sender_id !== me) return deny("own", 403);
            if (Date.now() - Date.parse(message.created_at) > TAKE_BACK_MS) return deny("late", 409);
            if (message.media_path) await db.storage.from(CHAT_BUCKET).remove([message.media_path]);
            change = { status: "DELETED", body: null, media_path: null, reactions: {}, plan_answers: {}, deleted_at: now };
        } else {
            return deny("invalid", 400);
        }
        const saved = await db.from("nt_messages").update({ ...change, updated_at: now }).eq("id", id).select(columns).single();
        if (saved.error) throw saved.error;
        signal([chatTopic(chat.id), inboxTopic(otherId)]);
        const [view] = await messageViews([saved.data as unknown as MessageRow], me);
        return NextResponse.json({ ok: true, message: view });
    } catch (error) {
        if (chatsClosed(error)) return deny("closed", 503);
        console.error("Message not changed:", error);
        return deny("failed", 502);
    }
}
