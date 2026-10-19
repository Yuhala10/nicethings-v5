import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { cleanText } from "@/lib/feedback";
import { UUID } from "@/lib/posts";
import { reviewsTag } from "@/lib/people/reviews";
import { currentProfile, deny, foreign, readBody, robot } from "@/lib/people/server";
import { talkTag, type Target } from "@/lib/people/talk";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// "Signaler": a comment, a review or a profile that should not be there.
// One flag per person (or phone); at three, a comment or a review steps
// aside until the team has looked.
const HIDE_AT = 3;

export async function POST(request: Request) {
    const body = await readBody(request);
    if (robot(request, body) || foreign(request)) return deny("invalid", 400);
    const kind = body.kind === "comment" || body.kind === "review" || body.kind === "profile" ? body.kind : null;
    const id = typeof body.id === "string" && UUID.test(body.id) ? body.id : null;
    if (!kind || !id) return deny("invalid", 400);
    const profile = await currentProfile().catch(() => null);
    const reporter = profile?.id ?? (typeof body.v === "string" && UUID.test(body.v) ? `v:${body.v.toLowerCase()}` : null);
    if (!reporter) return deny("invalid", 400);

    const db = getSupabaseAdminClient();
    const flagged = await db.from("nt_flags").upsert({ kind, item_id: id, reporter, reason: cleanText(body.reason, 200) }, { onConflict: "kind,item_id,reporter", ignoreDuplicates: true });
    if (flagged.error) return deny("failed", 502);
    const { count } = await db.from("nt_flags").select("item_id", { count: "exact", head: true }).eq("kind", kind).eq("item_id", id);

    if (kind !== "profile") {
        const table = kind === "comment" ? "nt_comments" : "nt_reviews";
        const hide = (count ?? 0) >= HIDE_AT;
        const updated = await db
            .from(table)
            .update(hide ? { reports: count ?? 0, status: "HIDDEN" } : { reports: count ?? 0 })
            .eq("id", id)
            .select(kind === "comment" ? "target,target_id" : "spot_id")
            .maybeSingle();
        const row = updated.data as { target?: Target; target_id?: string; spot_id?: string } | null;
        if (hide && row?.target && row.target_id) revalidateTag(talkTag(row.target, row.target_id), { expire: 0 });
        if (hide && row?.spot_id) revalidateTag(reviewsTag(row.spot_id), { expire: 0 });
    }
    return NextResponse.json({ ok: true });
}
