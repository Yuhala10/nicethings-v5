import { unstable_cache } from "next/cache";
import { getSupabaseAdminClient } from "../supabase/admin";
import { peopleByIds } from "./server";
import type { CommentView } from "./types";

// Comments with a name and a face: under an article (a guest's book is the
// comments of their notebooks), under a photo or video of a wall, and in
// answer to a review. One table, three kinds of things to talk about.

export const TARGETS = ["article", "wall", "review", "outing"] as const;
export type Target = (typeof TARGETS)[number];

export const talkTag = (target: Target, id: string) => `talk:${target}:${id}`;

type Row = { id: string; target_id: string; profile_id: string; body: string; status: string; created_at: string };

// The thing being talked about must exist and be public.
export async function targetExists(target: Target, id: string) {
    const db = getSupabaseAdminClient();
    const query =
        target === "article"
            ? db.from("nt_posts").select("id").eq("id", id).eq("status", "PUBLISHED")
            : target === "wall"
              ? db.from("nt_spot_posts").select("id").eq("id", id).eq("status", "APPROVED")
              : target === "outing"
                ? db.from("nt_outings").select("id").eq("id", id).eq("status", "PUBLISHED")
                : db.from("nt_reviews").select("id").eq("id", id).eq("status", "PUBLISHED");
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return Boolean(data);
}

// Counted again after each change, so the number on a photo or a review
// cannot drift.
export async function recount(target: Target, id: string) {
    if (target === "article") return;
    const db = getSupabaseAdminClient();
    const { count } = await db.from("nt_comments").select("id", { count: "exact", head: true }).eq("target", target).eq("target_id", id).eq("status", "PUBLISHED");
    if (target === "wall") await db.from("nt_spot_posts").update({ comments: count ?? 0 }).eq("id", id);
    else if (target === "outing") await db.from("nt_outings").update({ comments: count ?? 0 }).eq("id", id);
    else await db.from("nt_reviews").update({ replies: count ?? 0 }).eq("id", id);
}

export async function loadTalk(target: Target, ids: string[], viewer: string | null): Promise<CommentView[]> {
    if (!ids.length) return [];
    const db = getSupabaseAdminClient();
    const columns = "id,target_id,profile_id,body,status,created_at";
    const [published, own] = await Promise.all([
        db.from("nt_comments").select(columns).eq("target", target).in("target_id", ids).eq("status", "PUBLISHED").order("created_at", { ascending: true }).limit(300),
        viewer ? db.from("nt_comments").select(columns).eq("target", target).in("target_id", ids).eq("profile_id", viewer).eq("status", "PENDING") : null,
    ]);
    if (published.error) throw published.error;
    const rows = [...((published.data ?? []) as Row[]), ...((own?.data ?? []) as Row[])].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const people = await peopleByIds(rows.map((row) => row.profile_id));
    return rows
        .filter((row) => people.has(row.profile_id))
        .map((row) => ({ id: row.id, person: people.get(row.profile_id)!, body: row.body, createdAt: row.created_at, pending: row.status !== "PUBLISHED", mine: row.profile_id === viewer }));
}

// What everyone sees under an article or a guest's book, cached until
// someone writes. `null` while comments are not open (script 011 not run).
export async function getTalk(target: Target, ids: string[]): Promise<CommentView[] | null> {
    if (!ids.length) return [];
    return unstable_cache(
        () => loadTalk(target, ids, null).catch(() => null),
        ["talk:v1", target, ...ids],
        { revalidate: 600, tags: ids.map((id) => talkTag(target, id)) }
    )();
}
