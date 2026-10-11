import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { POSTS_TAG } from "./server";

// What readers say under an article. A comment is read by the team before
// it shows (database script 006); the public only ever reads approved ones.

export type Comment = { id: string; name: string | null; body: string; createdAt: string };

// `null` while comments are not open (the script has not been run): the
// article then shows no comment section at all.
async function loadComments(postId: string): Promise<Comment[] | null> {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.from("nt_post_comments").select("id,name,body,created_at").eq("post_id", postId).eq("status", "APPROVED").order("created_at", { ascending: true }).limit(200);
    if (error) return null;
    return (data ?? []).map((row) => ({ id: row.id as string, name: (row.name as string | null) ?? null, body: row.body as string, createdAt: row.created_at as string }));
}

export const getComments = unstable_cache(loadComments, ["posts:comments:v1"], { revalidate: 300, tags: [POSTS_TAG] });
