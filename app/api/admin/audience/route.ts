import { NextResponse } from "next/server";
import { UUID_PATTERN, fail, readJson, requireAdmin } from "@/lib/admin-api";
import { CAMEROON_OFFSET, DAY, summarise, type EventRow } from "@/lib/audience";

// Who visits over the last N days. Visitors, who came back, cities, pages
// and places are counted in the database (nt_audience,
// database/migrations/002_analytics.sql); visits, engagement, busy hours,
// ways in and the path to a place are worked out here from the visit log
// (lib/audience.ts).

type Day = { day: string; views: number; visitors: number; returned: number };
type Place = { slug: string; id: string | null; name: string | null; city: string | null; views: number; visitors: number };

// The log is read newest first, a thousand rows at a time, up to this many.
const MAX_ROWS = 60_000;

export async function GET(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const days = Math.min(90, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 30));

    // Whole days in Cameroon time, today included; and the same number of
    // days just before, to compare with.
    const now = Date.now();
    const today = Math.floor((now + CAMEROON_OFFSET) / DAY) * DAY;
    const first = today - (days - 1) * DAY;
    const since = first - CAMEROON_OFFSET;
    const before = since - days * DAY;

    const { data, error } = await db.rpc("nt_audience", { since: new Date(since).toISOString() });
    if (error) {
        // The table or the function is not there yet: the page explains what to run.
        if (["PGRST202", "PGRST205", "42883", "42P01"].includes(error.code)) return NextResponse.json({ ok: true, setup: true });
        return fail(error);
    }

    try {
        const rows: EventRow[] = [];
        for (let from = 0; from < MAX_ROWS; from += 1000) {
            const page = await db
                .from("nt_events")
                .select("visitor_id,page,path,place,source,created_at")
                .gte("created_at", new Date(before).toISOString())
                .order("id", { ascending: false })
                .range(from, from + 999);
            if (page.error) throw page.error;
            rows.push(...(page.data as EventRow[]));
            if (page.data.length < 1000) break;
        }
        rows.reverse();
        const summary = summarise(rows, { since, before, days, now });

        // Comparing with the days before is only fair when the log covers them.
        const oldest = await db.from("nt_events").select("created_at").order("id", { ascending: true }).limit(1);
        if (oldest.error) throw oldest.error;
        const comparable = Boolean(oldest.data[0]) && Date.parse(oldest.data[0].created_at) <= before;

        // Names for the ways in and the articles (places already have theirs).
        const articleSlugs = [...new Set([...summary.articles.map((article) => article.slug), ...summary.entries.filter((entry) => entry.page === "article").map((entry) => entry.path.split("/")[3])])].filter(Boolean);
        const placeSlugs = [...new Set(summary.entries.map((entry) => entry.place).filter((slug): slug is string => Boolean(slug)))];
        const [posts, spots] = await Promise.all([
            articleSlugs.length ? db.from("nt_posts").select("slug,title_fr").in("slug", articleSlugs) : null,
            placeSlugs.length ? db.from("nt_spots").select("slug,name").in("slug", placeSlugs) : null,
        ]);
        const titles = new Map<string, string>((posts?.data ?? []).map((post) => [post.slug, post.title_fr]));
        const names = new Map<string, string>((spots?.data ?? []).map((spot) => [spot.slug, spot.name]));

        // One entry per day, quiet days included, so the chart has no holes.
        const counted = new Map((data.perDay as Day[]).map((day) => [day.day, day]));
        const perDay = Array.from({ length: days }, (_, index) => {
            const day = new Date(first + index * DAY).toISOString().slice(0, 10);
            return { ...(counted.get(day) ?? { day, views: 0, visitors: 0, returned: 0 }), visits: summary.visitsPerDay.get(day) ?? 0 };
        });

        return NextResponse.json({
            ok: true,
            ...data,
            days,
            visits: summary.totals.visits,
            engaged: summary.totals.engaged,
            seconds: summary.totals.seconds,
            previous: comparable ? summary.previous : null,
            today: summary.today,
            live: summary.live,
            perDay,
            hours: summary.hours,
            funnel: summary.funnel,
            sources: summary.sources,
            entries: summary.entries.map((entry) => ({
                path: entry.path,
                page: entry.page,
                visits: entry.visits,
                label: entry.place ? (names.get(entry.place) ?? null) : entry.page === "article" ? (titles.get(entry.path.split("/")[3]) ?? null) : null,
            })),
            places: (data.places as Place[]).map((place) => ({ ...place, directions: summary.directions.get(place.slug) ?? 0 })),
            articles: summary.articles.map((article) => ({ ...article, title: titles.get(article.slug) ?? null })),
            partial: rows.length >= MAX_ROWS,
        });
    } catch (caught) {
        return fail(caught);
    }
}

// POST /api/admin/audience { visitor } — this browser belongs to the team
// (it has just opened the console): the pages it was counted for before
// signing in are taken out of the statistics.
export async function POST(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const body = await readJson(request);
    const visitor = typeof body?.visitor === "string" && UUID_PATTERN.test(body.visitor) ? body.visitor.toLowerCase() : null;
    if (!visitor) return NextResponse.json({ ok: false, message: "Requête invalide." }, { status: 400 });

    const { error, count } = await db.from("nt_events").delete({ count: "exact" }).eq("visitor_id", visitor);
    if (error) return fail(error);
    return NextResponse.json({ ok: true, removed: count ?? 0 });
}
