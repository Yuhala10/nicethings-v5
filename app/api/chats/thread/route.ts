import { NextResponse } from "next/server";
import {
    chatsClosed,
    CHAT_COLUMNS,
    messageColumns,
    chatTopic,
    field,
    flameOf,
    inboxTopic,
    messageViews,
    noteActive,
    otherSide,
    pairOf,
    presenceOf,
    presenceRows,
    requestOf,
    sideOf,
    signal,
    writeCheck,
    type ChatRow,
    type MessageRow,
} from "@/lib/people/chats";
import { normalizeHandle } from "@/lib/people/rules";
import { deny, peopleByIds, requireProfile } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ChatThread } from "@/lib/people/types";

// One conversation, by the other's @name:
//   (nothing)       → the last 40 messages, who they are, whether one may write
//   ?before=<time>  → 40 older ones
//   ?since=<time>   → only what changed since (new, reacted, taken back)
// &read=1 when the conversation is on screen: it is marked as read.

const PAGE = 40;
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const me = profile.id;
    const query = new URL(request.url).searchParams;
    const handle = normalizeHandle(query.get("handle") ?? "");
    if (!handle || handle === profile.handle) return deny("invalid", 400);
    const db = getSupabaseAdminClient();
    try {
        const found = await db.from("nt_profiles").select("id").eq("handle", handle).maybeSingle();
        if (found.error) throw found.error;
        if (!found.data) return deny("invalid", 404);
        const otherId = found.data.id as string;
        const [a, b] = pairOf(me, otherId);
        const [chatRead, presence, people] = await Promise.all([
            db.from("nt_chats").select(CHAT_COLUMNS).eq("a_id", a).eq("b_id", b).maybeSingle(),
            presenceRows([me, otherId]),
            peopleByIds([otherId]),
            noteActive(me).catch(() => {}),
        ]);
        if (chatRead.error) throw chatRead.error;
        const chat = chatRead.data as ChatRow | null;
        const person = people.get(otherId);
        const mine = presence.get(me);
        const theirs = presence.get(otherId);
        if (!person || !theirs || theirs.status !== "ACTIVE") return deny("invalid", 404);

        const side = chat ? sideOf(chat, me) : "a";
        const cleared = chat ? field(chat, side, "cleared_at") : null;
        let rows: MessageRow[] = [];
        let more = false;
        if (chat) {
            let ask = db.from("nt_messages").select(await messageColumns()).eq("chat_id", chat.id).or(`status.neq.DRAFT,sender_id.eq.${me}`);
            if (cleared) ask = ask.gt("created_at", cleared);
            const since = query.get("since");
            const before = query.get("before");
            if (since && !Number.isNaN(Date.parse(since))) {
                const changed = await ask.gt("updated_at", since).order("created_at", { ascending: true }).limit(200);
                if (changed.error) throw changed.error;
                rows = (changed.data ?? []) as unknown as MessageRow[];
            } else {
                if (before && !Number.isNaN(Date.parse(before))) ask = ask.lt("created_at", before);
                const page = await ask.order("created_at", { ascending: false }).limit(PAGE + 1);
                if (page.error) throw page.error;
                const list = (page.data ?? []) as unknown as MessageRow[];
                more = list.length > PAGE;
                rows = list.slice(0, PAGE).reverse();
            }
        }

        // On screen: read now. The other's phone learns it at once (blue ticks).
        if (chat && query.get("read") && rows.some((row) => row.sender_id !== me)) {
            const readAt = field(chat, side, "read_at");
            const newest = rows.filter((row) => row.sender_id !== me).at(-1)!.created_at;
            if (!readAt || newest > readAt) {
                await db.from("nt_chats").update({ [`${side}_read_at`]: new Date().toISOString() }).eq("id", chat.id);
                signal([chatTopic(chat.id), inboxTopic(me)], "r");
            }
        }

        const hideRead = Boolean(mine?.hide_read || theirs.hide_read);
        const thread: ChatThread = {
            chat: chat
                ? {
                      id: chat.id,
                      key: chatTopic(chat.id),
                      accepted: chat.accepted,
                      request: requestOf(chat, me),
                      pinned: Boolean(field(chat, side, "pinned")),
                      muted: Boolean(field(chat, side, "muted")),
                      archived: Boolean(field(chat, side, "archived")),
                      flame: flameOf(chat),
                  }
                : null,
            person,
            presence: presenceOf(theirs, mine),
            write: await writeCheck(me, theirs, chat),
            blocked: false,
            theirRead: chat && !hideRead ? field(chat, otherSide(side), "read_at") : null,
            theirActive: theirs.active_at ?? theirs.last_seen_at,
            messages: await messageViews(rows, me),
            more,
        };
        thread.blocked = thread.write.ok === false && thread.write.why === "blocked";
        return NextResponse.json({ ok: true, ...thread }, { headers: NO_STORE });
    } catch (error) {
        if (chatsClosed(error)) return deny("closed", 503);
        console.error("Conversation not read:", error);
        return deny("failed", 502);
    }
}
