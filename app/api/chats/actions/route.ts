import { NextResponse } from "next/server";
import { UUID } from "@/lib/posts";
import { chatsClosed, CHAT_COLUMNS, chatTopic, inboxTopic, otherOf, sideOf, signal, type ChatRow } from "@/lib/people/chats";
import { normalizeHandle } from "@/lib/people/rules";
import { deny, readBody, requireProfile } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// What one does to a conversation, for oneself, or to the other person:
//   { chat, action: "read" | "accept" | "decline" | "archive" | "unarchive" | "mute" | "unmute" | "pin" | "unpin" | "clear" }
//   { handle, action: "block" | "unblock" }
//   { message, action: "report", reason? }   → the team reads it (and only it)

const PINNED_MAX = 3;

export async function POST(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const me = profile.id;
    const body = await readBody(request);
    const action = typeof body.action === "string" ? body.action : "";
    const db = getSupabaseAdminClient();
    const now = new Date().toISOString();
    try {
        if (action === "block" || action === "unblock") {
            const found = await db.from("nt_profiles").select("id").eq("handle", normalizeHandle(typeof body.handle === "string" ? body.handle : "")).maybeSingle();
            if (!found.data || found.data.id === me) return deny("invalid", 404);
            const change =
                action === "block"
                    ? await db.from("nt_blocks").upsert({ blocker_id: me, blocked_id: found.data.id }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true })
                    : await db.from("nt_blocks").delete().eq("blocker_id", me).eq("blocked_id", found.data.id);
            if (change.error) throw change.error;
            // Blocking also ends following, both ways.
            if (action === "block") await db.from("nt_follows").delete().or(`and(follower_id.eq.${me},followed_id.eq.${found.data.id}),and(follower_id.eq.${found.data.id},followed_id.eq.${me})`);
            return NextResponse.json({ ok: true, blocked: action === "block" });
        }

        if (action === "report") {
            const id = typeof body.message === "string" && UUID.test(body.message) ? body.message : null;
            if (!id) return deny("invalid", 400);
            const message = await db.from("nt_messages").select("chat_id,sender_id").eq("id", id).maybeSingle();
            if (!message.data || message.data.sender_id === me) return deny("invalid", 404);
            const chat = await db.from("nt_chats").select("a_id,b_id").eq("id", message.data.chat_id).single();
            if (chat.data?.a_id !== me && chat.data?.b_id !== me) return deny("invalid", 404);
            const reason = typeof body.reason === "string" ? body.reason.slice(0, 200) : null;
            const flagged = await db.from("nt_flags").upsert({ kind: "message", item_id: id, reporter: me, reason }, { onConflict: "kind,item_id,reporter", ignoreDuplicates: true });
            if (flagged.error) throw flagged.error;
            return NextResponse.json({ ok: true });
        }

        const id = typeof body.chat === "string" && UUID.test(body.chat) ? body.chat : null;
        if (!id) return deny("invalid", 400);
        const found = await db.from("nt_chats").select(CHAT_COLUMNS).eq("id", id).maybeSingle();
        const chat = found.data as ChatRow | null;
        if (!chat || (chat.a_id !== me && chat.b_id !== me)) return deny("invalid", 404);
        const side = sideOf(chat, me);
        const own = (key: string, value: unknown) => ({ [`${side}_${key}`]: value });
        let change: Record<string, unknown>;
        switch (action) {
            case "read":
                change = own("read_at", now);
                break;
            case "accept":
                if (chat.started_by === me) return deny("invalid", 409);
                change = { accepted: true, ...own("read_at", now) };
                break;
            // A request one does not want: it goes away; written again, it comes back.
            case "decline":
                if (chat.accepted || chat.started_by === me) return deny("invalid", 409);
                change = own("cleared_at", now);
                break;
            case "archive":
            case "unarchive":
                change = own("archived", action === "archive");
                break;
            case "mute":
            case "unmute":
                change = own("muted", action === "mute");
                break;
            case "pin":
            case "unpin": {
                if (action === "pin") {
                    const pinned = await db.from("nt_chats").select("id", { count: "exact", head: true }).or(`and(a_id.eq.${me},a_pinned.eq.true),and(b_id.eq.${me},b_pinned.eq.true)`);
                    if ((pinned.count ?? 0) >= PINNED_MAX) return deny("pinned", 409);
                }
                change = own("pinned", action === "pin");
                break;
            }
            // "Vider la discussion": gone for oneself, still there for the other.
            case "clear":
                change = { ...own("cleared_at", now), ...own("read_at", now) };
                break;
            default:
                return deny("invalid", 400);
        }
        const saved = await db.from("nt_chats").update(change).eq("id", id);
        if (saved.error) throw saved.error;
        signal(action === "accept" || action === "read" ? [chatTopic(id), inboxTopic(me), inboxTopic(otherOf(chat, me))] : [inboxTopic(me)], action === "read" ? "r" : "m");
        return NextResponse.json({ ok: true });
    } catch (error) {
        if (chatsClosed(error)) return deny("closed", 503);
        console.error("Conversation action failed:", error);
        return deny("failed", 502);
    }
}
