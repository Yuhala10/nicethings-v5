// Turns the raw visit log (nt_events) into what the "Audience" page shows
// on top of the database counts: visits, how engaged they are, when people
// come, where they land and how far they go (place page, then directions).
// Days and hours are counted in Cameroon time.

export const DAY = 86_400_000;
export const CAMEROON_OFFSET = 3_600_000; // UTC+1, no daylight saving

// A visit: pages seen in a row. Half an hour away starts a new one.
const VISIT_GAP = 30 * 60_000;

export type EventRow = {
    visitor_id: string;
    page: string;
    path: string;
    place: string | null;
    source: string | null;
    created_at: string;
};

export type Totals = {
    visitors: number;
    visits: number;
    views: number;
    // Visits that went beyond one page, and their average length in seconds.
    engaged: number;
    seconds: number;
};

type Visit = { visitor: string; start: number; end: number; pages: number; source: string; entry: EventRow };

const localDay = (time: number) => new Date(time + CAMEROON_OFFSET).toISOString().slice(0, 10);

function visitsOf(rows: EventRow[]) {
    const visits: Visit[] = [];
    const open = new Map<string, Visit>();
    for (const row of rows) {
        const time = Date.parse(row.created_at);
        const current = open.get(row.visitor_id);
        if (current && time - current.end <= VISIT_GAP) {
            current.end = time;
            current.pages++;
            continue;
        }
        const visit = { visitor: row.visitor_id, start: time, end: time, pages: 1, source: row.source ?? "direct", entry: row };
        open.set(row.visitor_id, visit);
        visits.push(visit);
    }
    return visits;
}

function totalsOf(rows: EventRow[], visits: Visit[]): Totals {
    const long = visits.filter((visit) => visit.pages > 1);
    return {
        visitors: new Set(rows.map((row) => row.visitor_id)).size,
        visits: visits.length,
        views: rows.length,
        engaged: long.length,
        seconds: long.length ? Math.round(long.reduce((sum, visit) => sum + (visit.end - visit.start), 0) / long.length / 1000) : 0,
    };
}

function ranked<T extends { visits: number }>(groups: Map<string, T>, limit: number) {
    return [...groups.values()].sort((a, b) => b.visits - a.visits).slice(0, limit);
}

// `rows` are the events from `before` (start of the previous period) to
// now, oldest first; `since` is the start of the period shown.
export function summarise(rows: EventRow[], { since, before, days, now }: { since: number; before: number; days: number; now: number }) {
    const visits = visitsOf(rows);
    const inPeriod = (time: number) => time >= since;
    const current = rows.filter((row) => inPeriod(Date.parse(row.created_at)));
    const currentVisits = visits.filter((visit) => inPeriod(visit.start));
    const earlier = rows.filter((row) => !inPeriod(Date.parse(row.created_at)) && Date.parse(row.created_at) >= before);
    const earlierVisits = visits.filter((visit) => !inPeriod(visit.start) && visit.start >= before);

    // Visits started per day, to sit next to the visitors of each day.
    const perDay = new Map<string, number>();
    for (const visit of currentVisits) perDay.set(localDay(visit.start), (perDay.get(localDay(visit.start)) ?? 0) + 1);

    // Pages seen per weekday (Monday first) and hour.
    const hours = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
    for (const row of current) {
        const local = new Date(Date.parse(row.created_at) + CAMEROON_OFFSET);
        hours[(local.getUTCDay() + 6) % 7][local.getUTCHours()]++;
    }

    const sources = new Map<string, { source: string; visits: number }>();
    const entries = new Map<string, { path: string; page: string; place: string | null; visits: number }>();
    for (const visit of currentVisits) {
        const source = sources.get(visit.source) ?? { source: visit.source, visits: 0 };
        source.visits++;
        sources.set(visit.source, source);
        // The same page in French and in English is one way in.
        const key = visit.entry.path.replace(/^\/(fr|en)(?=\/|$)/, "") || "/";
        const entry = entries.get(key) ?? { path: visit.entry.path, page: visit.entry.page, place: visit.entry.place, visits: 0 };
        entry.visits++;
        entries.set(key, entry);
    }

    // How far visitors go: a place page, then its directions.
    const sawPlace = new Set<string>();
    const sawDirections = new Set<string>();
    const searched = new Set<string>();
    const directions = new Map<string, number>();
    const articles = new Map<string, { slug: string; visits: number; readers: Set<string> }>();
    for (const row of current) {
        if (row.page === "place") sawPlace.add(row.visitor_id);
        if (row.page === "search" || row.page === "map") searched.add(row.visitor_id);
        if (row.page === "directions") {
            sawDirections.add(row.visitor_id);
            if (row.place) directions.set(row.place, (directions.get(row.place) ?? 0) + 1);
        }
        if (row.page === "article") {
            const slug = row.path.split("/")[3];
            if (!slug) continue;
            const article = articles.get(slug) ?? { slug, visits: 0, readers: new Set<string>() };
            article.visits++;
            article.readers.add(row.visitor_id);
            articles.set(slug, article);
        }
    }

    const today = current.filter((row) => localDay(Date.parse(row.created_at)) === localDay(now));
    const within = (minutes: number) => new Set(current.filter((row) => now - Date.parse(row.created_at) <= minutes * 60_000).map((row) => row.visitor_id)).size;

    return {
        days,
        totals: totalsOf(current, currentVisits),
        previous: totalsOf(earlier, earlierVisits),
        visitsPerDay: perDay,
        hours,
        sources: ranked(sources, 12),
        entries: ranked(entries, 8),
        funnel: { visitors: new Set(current.map((row) => row.visitor_id)).size, place: sawPlace.size, directions: sawDirections.size, searched: searched.size },
        directions,
        articles: ranked(articles, 8).map((article) => ({ slug: article.slug, views: article.visits, readers: article.readers.size })),
        today: { visitors: new Set(today.map((row) => row.visitor_id)).size, views: today.length },
        live: { now: within(5), recent: within(30) },
    };
}
