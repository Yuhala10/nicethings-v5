import { getSupabaseAdminClient } from "../supabase/admin";
import type { Series } from "./types";

// La série: the weeks in a row a member gave something to the city (a
// review, a photo on a wall, an outing, a way, a live news). Weeks, not
// days: going out every day is not a life, every week is. A week runs from
// Monday to Sunday, Douala time; this week still counts until Sunday night,
// so a série stays alive while there is time to keep it.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// The Monday that starts the week of a moment, in Douala (UTC+1, no
// summer time), as "YYYY-MM-DD".
export function weekOf(ms: number) {
    const local = new Date(ms + HOUR);
    const monday = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - ((local.getUTCDay() + 6) % 7) * DAY;
    return new Date(monday).toISOString().slice(0, 10);
}

const previous = (week: string) => new Date(Date.parse(week) - 7 * DAY).toISOString().slice(0, 10);

export function countSeries(moments: number[], now = Date.now()): Omit<Series, "best"> {
    const weeks = new Set(moments.map(weekOf));
    const current = weekOf(now);
    const thisWeek = weeks.has(current);
    let week = thisWeek ? current : previous(current);
    let count = 0;
    while (weeks.has(week)) {
        count++;
        week = previous(week);
    }
    return { weeks: count, thisWeek };
}

// A member's série, read from what they gave in the last year. Null when
// the tables of the scripts it needs are not there yet.
export async function seriesOf(profileId: string, best = 0): Promise<Series | null> {
    const db = getSupabaseAdminClient();
    const since = new Date(Date.now() - 400 * DAY).toISOString();
    const reads = await Promise.all([
        db.from("nt_reviews").select("created_at").eq("profile_id", profileId).eq("status", "PUBLISHED").gte("created_at", since).limit(1000),
        db.from("nt_spot_posts").select("created_at").eq("profile_id", profileId).eq("status", "APPROVED").gte("created_at", since).limit(1000),
        db.from("nt_outings").select("created_at").eq("profile_id", profileId).eq("status", "PUBLISHED").gte("created_at", since).limit(1000),
        db.from("nt_place_tips").select("created_at").eq("profile_id", profileId).eq("status", "PUBLISHED").gte("created_at", since).limit(1000),
        db.from("nt_place_pulses").select("created_at").eq("profile_id", profileId).gte("created_at", since).limit(1000),
    ]);
    if (reads[0].error) return null;
    const moments = reads.flatMap((read) => (read.error ? [] : (read.data ?? []).map((row) => Date.parse(row.created_at as string))));
    const series = countSeries(moments);
    if (series.weeks > best) {
        // The best ever is kept (script 014); before it, nothing is lost.
        await db.from("nt_profiles").update({ series_best: series.weeks }).eq("id", profileId).lt("series_best", series.weeks);
    }
    return { ...series, best: Math.max(best, series.weeks) };
}
