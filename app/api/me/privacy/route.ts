import { NextResponse } from "next/server";
import { notInstalled } from "@/lib/atlas/store";
import { deny, peopleByIds, readBody, requireProfile } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ChatPrivacy } from "@/lib/people/types";

// The privacy of one's messages, like on WhatsApp: who may write, whether
// others see one's "vu à" and blue ticks (hiding them hides the others'
// too), and the people one blocked.

export async function GET(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const db = getSupabaseAdminClient();
    try {
        const [row, blocks] = await Promise.all([
            db.from("nt_profiles").select("messages_from,hide_last_seen,hide_read").eq("id", profile.id).single(),
            db.from("nt_blocks").select("blocked_id").eq("blocker_id", profile.id).order("created_at", { ascending: false }),
        ]);
        if (row.error) throw row.error;
        const people = await peopleByIds((blocks.data ?? []).map((block) => block.blocked_id as string));
        const privacy: ChatPrivacy = { messagesFrom: row.data.messages_from, hideLastSeen: row.data.hide_last_seen, hideRead: row.data.hide_read };
        return NextResponse.json({ ok: true, privacy, blocked: [...people.values()] }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
        if (notInstalled(error) || (error as { code?: string }).code === "42703") return deny("closed", 503);
        return deny("failed", 502);
    }
}

export async function POST(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const body = await readBody(request);
    const change: Record<string, unknown> = {};
    if (body.messagesFrom === "everyone" || body.messagesFrom === "following" || body.messagesFrom === "nobody") change.messages_from = body.messagesFrom;
    if (typeof body.hideLastSeen === "boolean") change.hide_last_seen = body.hideLastSeen;
    if (typeof body.hideRead === "boolean") change.hide_read = body.hideRead;
    if (!Object.keys(change).length) return deny("invalid", 400);
    const saved = await getSupabaseAdminClient().from("nt_profiles").update(change).eq("id", profile.id);
    if (saved.error) return deny(saved.error.code === "42703" ? "closed" : "failed", saved.error.code === "42703" ? 503 : 502);
    return NextResponse.json({ ok: true });
}
