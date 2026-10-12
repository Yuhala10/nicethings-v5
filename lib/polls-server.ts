import { notInstalled } from "./atlas/store";
import { getPlacesBySlugs } from "./places/server";
import type { PollState } from "./polls";
import { getSupabaseAdminClient } from "./supabase/admin";

// Reading a vote among friends (server only). `visitor` is the reader's own
// browser id, to tell them which place they voted for.

// Whether database script 007 has been run: the feature shows only then.
export async function pollsReady() {
    const { error } = await getSupabaseAdminClient().from("nt_polls").select("id", { head: true, count: "exact" }).limit(1);
    if (error && !notInstalled(error)) throw error;
    return !error;
}

export async function readPoll(code: string, visitor: string | null): Promise<PollState | null> {
    const db = getSupabaseAdminClient();
    const found = await db.from("nt_polls").select("id,code,title,slugs").eq("code", code).maybeSingle();
    if (found.error) {
        if (notInstalled(found.error)) return null;
        throw found.error;
    }
    if (!found.data) return null;
    const poll = found.data as { id: string; code: string; title: string | null; slugs: string[] };

    const [places, votes] = await Promise.all([
        getPlacesBySlugs(poll.slugs),
        db.from("nt_poll_votes").select("visitor_id,slug,name,created_at").eq("poll_id", poll.id).order("created_at", { ascending: true }).limit(500),
    ]);
    if (votes.error) throw votes.error;
    const rows = (votes.data ?? []) as { visitor_id: string; slug: string; name: string | null }[];

    // The places in the order they were proposed; one that has since left the site drops out.
    const options = poll.slugs
        .map((slug) => places.find((place) => place.slug === slug))
        .filter((place) => place !== undefined)
        .map((place) => {
            const mine = rows.filter((row) => row.slug === place.slug);
            return { place, votes: mine.length, voters: mine.map((row) => row.name).filter((name): name is string => Boolean(name)) };
        });
    return {
        code: poll.code,
        title: poll.title,
        options,
        total: options.reduce((sum, option) => sum + option.votes, 0),
        mine: visitor ? (rows.find((row) => row.visitor_id === visitor)?.slug ?? null) : null,
    };
}
