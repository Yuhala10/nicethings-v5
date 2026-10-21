import { NextResponse } from "next/server";
import { UUID_PATTERN, fail, readJson, requireAdmin } from "@/lib/admin-api";
import { notInstalled } from "@/lib/atlas/store";
import { CHAT_BUCKET, chatTopic, signal } from "@/lib/people/chats";
import { peopleByIds } from "@/lib/people/server";

// Reported messages, and only them: the team reads the message that was
// reported (with the two before it, to understand it), then takes it down
// or lets it be. The rest of a conversation stays between the two members.

export async function GET() {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    try {
        const flags = await db.from("nt_flags").select("item_id,reason,created_at").eq("kind", "message").order("created_at", { ascending: false }).limit(200);
        if (flags.error) throw flags.error;
        const counts = new Map<string, { reports: number; reasons: string[]; at: string }>();
        for (const flag of flags.data ?? []) {
            const entry = counts.get(flag.item_id as string) ?? { reports: 0, reasons: [], at: flag.created_at as string };
            entry.reports++;
            if (flag.reason) entry.reasons.push(flag.reason as string);
            counts.set(flag.item_id as string, entry);
        }
        const ids = [...counts.keys()];
        if (!ids.length) return NextResponse.json({ ok: true, setup: false, messages: [] });
        const rows = await db.from("nt_messages").select("id,chat_id,sender_id,kind,body,status,created_at").in("id", ids);
        if (rows.error) throw rows.error;
        const messages = rows.data ?? [];
        // The two messages before each, for context.
        const before = await Promise.all(
            messages.map((message) =>
                db.from("nt_messages").select("id,sender_id,kind,body,status,created_at").eq("chat_id", message.chat_id).lt("created_at", message.created_at).order("created_at", { ascending: false }).limit(2)
            )
        );
        const people = await peopleByIds([...messages.map((message) => message.sender_id as string), ...before.flatMap((read) => (read.data ?? []).map((row) => row.sender_id as string))]);
        return NextResponse.json({
            ok: true,
            setup: false,
            messages: messages.map((message, index) => ({
                id: message.id,
                kind: message.kind,
                body: message.body,
                status: message.status,
                createdAt: message.created_at,
                person: people.get(message.sender_id as string) ?? null,
                ...counts.get(message.id as string)!,
                context: (before[index].data ?? []).reverse().map((row) => ({ person: people.get(row.sender_id as string)?.handle ?? "?", kind: row.kind, body: row.status === "DELETED" ? null : row.body })),
            })),
        });
    } catch (error) {
        if (notInstalled(error)) return NextResponse.json({ ok: true, setup: true, messages: [] });
        return fail(error);
    }
}

// POST { id, action: "delete" | "keep" }
export async function POST(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const body = await readJson(request);
    const id = typeof body?.id === "string" && UUID_PATTERN.test(body.id) ? body.id : null;
    if (!id || (body?.action !== "delete" && body?.action !== "keep")) return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
    try {
        if (body.action === "delete") {
            const found = await db.from("nt_messages").select("chat_id,media_path").eq("id", id).maybeSingle();
            if (found.data?.media_path) await db.storage.from(CHAT_BUCKET).remove([found.data.media_path as string]);
            const now = new Date().toISOString();
            const saved = await db.from("nt_messages").update({ status: "DELETED", body: null, media_path: null, reactions: {}, deleted_at: now, updated_at: now }).eq("id", id);
            if (saved.error) throw saved.error;
            if (found.data) signal([chatTopic(found.data.chat_id as string)]);
        }
        await db.from("nt_flags").delete().eq("kind", "message").eq("item_id", id);
        return NextResponse.json({ ok: true });
    } catch (error) {
        return fail(error);
    }
}
