import { NextResponse } from "next/server";
import { chatsClosed, CHAT_COLUMNS, field, flameOf, inboxTopic, noteActive, otherOf, presenceOf, presenceRows, requestOf, sideOf, type ChatRow, type MessageRow } from "@/lib/people/chats";
import { deny, peopleByIds, requireProfile } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ChatSummary } from "@/lib/people/types";

// The inbox: one's conversations, newest first (pinned ones on top), the
// requests from people one does not follow, and what is unread.
// ?count=1 → only the numbers, for the badge on the tab.

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const me = profile.id;
    const query = new URL(request.url).searchParams;
    const db = getSupabaseAdminClient();
    try {
        const read = await db.from("nt_chats").select(CHAT_COLUMNS).or(`a_id.eq.${me},b_id.eq.${me}`).not("last_message_id", "is", null).order("last_at", { ascending: false }).limit(200);
        if (read.error) throw read.error;
        // A conversation emptied by its owner shows again with the next message.
        const chats = ((read.data ?? []) as ChatRow[]).filter((chat) => {
            const cleared = field(chat, sideOf(chat, me), "cleared_at");
            return !cleared || chat.last_at > cleared;
        });
        const lastIds = chats.map((chat) => chat.last_message_id!);
        const lasts = lastIds.length ? await db.from("nt_messages").select("id,chat_id,sender_id,kind,body,status,created_at").in("id", lastIds) : { data: [] };
        const lastOf = new Map(((lasts.data ?? []) as MessageRow[]).map((row) => [row.chat_id, row]));

        const unreadIn = (chat: ChatRow) => {
            const last = lastOf.get(chat.id);
            const readAt = field(chat, sideOf(chat, me), "read_at");
            return Boolean(last && last.sender_id !== me && last.status !== "DRAFT" && (!readAt || last.created_at > readAt));
        };

        if (query.get("count")) {
            await noteActive(me).catch(() => {});
            const open = chats.filter((chat) => requestOf(chat, me) !== "incoming" && !field(chat, sideOf(chat, me), "archived"));
            return NextResponse.json(
                { ok: true, unread: open.filter(unreadIn).length, requests: chats.filter((chat) => requestOf(chat, me) === "incoming").length, key: inboxTopic(me) },
                { headers: NO_STORE }
            );
        }

        // How many unread in each: the messages from the other since one last read.
        const counts = new Map<string, number>();
        const waiting = chats.filter(unreadIn);
        if (waiting.length) {
            const oldest = waiting.map((chat) => field(chat, sideOf(chat, me), "read_at") ?? chat.created_at).sort()[0];
            const rows = await db.from("nt_messages").select("chat_id,created_at").in("chat_id", waiting.map((chat) => chat.id)).neq("sender_id", me).eq("status", "SENT").gt("created_at", oldest).limit(3000);
            for (const row of rows.data ?? []) {
                const chat = waiting.find((item) => item.id === row.chat_id)!;
                const readAt = field(chat, sideOf(chat, me), "read_at");
                if (!readAt || (row.created_at as string) > readAt) counts.set(chat.id, (counts.get(chat.id) ?? 0) + 1);
            }
        }

        const others = chats.map((chat) => otherOf(chat, me));
        const [people, presence, blocks] = await Promise.all([
            peopleByIds(others),
            presenceRows([me, ...others]),
            db.from("nt_blocks").select("blocked_id").eq("blocker_id", me),
            noteActive(me).catch(() => {}),
        ]);
        const blocked = new Set((blocks.data ?? []).map((row) => row.blocked_id as string));
        const summaries: ChatSummary[] = [];
        for (const chat of chats) {
            const side = sideOf(chat, me);
            const other = otherOf(chat, me);
            const person = people.get(other);
            if (!person) continue;
            const last = lastOf.get(chat.id);
            summaries.push({
                id: chat.id,
                person,
                last: last ? { kind: last.kind, body: last.status === "DELETED" ? null : last.body, mine: last.sender_id === me, at: last.created_at, deleted: last.status === "DELETED" } : null,
                unread: counts.get(chat.id) ?? (unreadIn(chat) ? 1 : 0),
                flame: flameOf(chat),
                pinned: Boolean(field(chat, side, "pinned")),
                muted: Boolean(field(chat, side, "muted")),
                archived: Boolean(field(chat, side, "archived")),
                request: requestOf(chat, me),
                presence: presenceOf(presence.get(other), presence.get(me)),
                blocked: blocked.has(other),
            });
        }
        const inbox = summaries.filter((chat) => chat.request !== "incoming");
        const pinnedFirst = (list: ChatSummary[]) => [...list.filter((chat) => chat.pinned), ...list.filter((chat) => !chat.pinned)];
        return NextResponse.json(
            {
                ok: true,
                chats: pinnedFirst(inbox.filter((chat) => !chat.archived)),
                archived: inbox.filter((chat) => chat.archived),
                requests: summaries.filter((chat) => chat.request === "incoming"),
                key: inboxTopic(me),
            },
            { headers: NO_STORE }
        );
    } catch (error) {
        if (chatsClosed(error)) return deny("closed", 503);
        console.error("Inbox not read:", error);
        return deny("failed", 502);
    }
}
