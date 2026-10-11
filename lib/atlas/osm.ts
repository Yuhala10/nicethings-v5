import { firstPhone } from "../places/display";
import type { AtlasPlace } from "./store";

// Re-checks places that came from OpenStreetMap against the live map, for
// free. The volunteers who keep that map remove what has closed and add
// phone numbers, websites and opening hours as they learn them: this is how
// those corrections reach NiceThings.

type Element = { type: string; id: number; visible?: boolean; timestamp?: string; tags?: Record<string, string> };

const API = "https://api.openstreetmap.org/api/0.6";
const AGENT = "NiceThings-Atlas/1.0 (+https://www.nicethings.site)";
const BATCH = 350; // ids per request: keeps the address well under the server's limit

async function request(kind: string, ids: string[]): Promise<Element[] | null> {
    try {
        const response = await fetch(`${API}/${kind}s.json?${kind}s=${ids.join(",")}`, {
            headers: { "User-Agent": AGENT },
            signal: AbortSignal.timeout(20_000),
            cache: "no-store",
        });
        if (!response.ok) return null;
        return ((await response.json()) as { elements?: Element[] }).elements ?? [];
    } catch {
        return null;
    }
}

// The map answers "not found" for a whole request when one id in it never
// existed: the batch is then split until the odd one is alone and skipped.
async function fetchBatch(kind: string, ids: string[]): Promise<Element[]> {
    const found = await request(kind, ids);
    if (found) return found;
    if (ids.length === 1) return [];
    const half = Math.ceil(ids.length / 2);
    return [...(await fetchBatch(kind, ids.slice(0, half))), ...(await fetchBatch(kind, ids.slice(half)))];
}

// Tags mappers use when a place has stopped: "disused:amenity=restaurant".
const RETIRED = /^(disused|abandoned|was|demolished|removed|razed|closed):/;

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const OSM_DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// "Mo-Sa", "Tu", "Mo-Su,PH" as a list of days; null when a word is not a
// day (public holidays, "PH", are passed over).
function daysOf(text: string) {
    const days: string[] = [];
    for (const token of text.split(",").map((part) => part.trim()).filter(Boolean)) {
        if (token === "PH" || token === "SH") continue;
        const [from, to = from] = token.split("-").map((part) => OSM_DAYS.indexOf(part.trim()));
        if (from < 0 || to < 0) return null;
        for (let i = from; ; i = (i + 1) % 7) {
            days.push(DAY_KEYS[i]);
            if (i === to) break;
        }
    }
    return days.length ? days : null;
}

// Opening hours as the map writes them, when they fit what a listing can
// hold (one time range, on some days): "Mo-Su 08:00-22:00", "17:00-06:00",
// "Mo-Sa 12:00-22:30; Su off", "24/7". Different hours on different days
// are left for a person.
export function readHours(value: string | undefined) {
    if (!value) return null;
    const flags = (open: readonly string[]) => Object.fromEntries(DAY_KEYS.map((day) => [`${day}_open`, open.includes(day)]));
    if (value.trim() === "24/7") return { opening_time: "00:00", closing_time: "23:59", ...flags(DAY_KEYS) };

    // One night written in two halves: "17:00-00:00,00:00-06:00".
    const text = value.trim().replace(/(\d{1,2}:\d{2})\s*-\s*(?:00:00|24:00)\s*,\s*00:00\s*-\s*(\d{1,2}:\d{2})/, "$1-$2");
    const [main, ...rest] = text.split(";").map((part) => part.trim()).filter(Boolean);
    const match = main?.match(/^(?:([A-Za-z][A-Za-z,\s-]*?)\s+)?(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
    if (!match) return null;
    let open: string[] | null = match[1] ? daysOf(match[1]) : [...DAY_KEYS];
    if (!open) return null;
    // "Su off", "Tu closed": days taken out.
    for (const part of rest) {
        const off = part.match(/^([A-Za-z][A-Za-z,\s-]*?)\s+(?:off|closed)$/i);
        const closed = off ? daysOf(off[1]) : null;
        if (!closed) return null;
        open = open.filter((day) => !closed.includes(day));
    }
    if (!open.length) return null;
    const clock = (time: string) => (time === "24:00" ? "00:00" : time.padStart(5, "0"));
    return { opening_time: clock(match[2]), closing_time: clock(match[3]), ...flags(open) };
}

function website(value: string | undefined) {
    if (!value) return null;
    const url = value.trim().slice(0, 300);
    return /^(https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i.test(url) ? url : null;
}

export type OsmFinding = {
    place: AtlasPlace;
    url: string; // the element's page on openstreetmap.org
    // The map no longer shows it (removed, or marked as closed).
    gone: { why: "removed" | "retired"; since: string | null } | null;
    // What the map knows and the listing does not: only empty fields.
    fill: Record<string, unknown> | null;
};

export async function recheckOnMap(places: AtlasPlace[]) {
    const byRef = new Map<string, AtlasPlace>();
    const ids: Record<string, string[]> = { node: [], way: [], relation: [] };
    for (const place of places) {
        const [kind, id] = (place.source_ref ?? "").split("/");
        if (place.source !== "osm" || !(kind in ids) || !/^\d+$/.test(id ?? "")) continue;
        byRef.set(`${kind}/${id}`, place);
        ids[kind].push(id);
    }

    const elements: Element[] = [];
    for (const kind of Object.keys(ids)) {
        for (let from = 0; from < ids[kind].length; from += BATCH) elements.push(...(await fetchBatch(kind, ids[kind].slice(from, from + BATCH))));
    }

    const findings: OsmFinding[] = [];
    for (const element of elements) {
        const place = byRef.get(`${element.type}/${element.id}`);
        if (!place) continue;
        const tags = element.tags ?? {};
        const url = `https://www.openstreetmap.org/${element.type}/${element.id}`;
        const since = element.timestamp?.slice(0, 10) ?? null;

        if (element.visible === false) {
            findings.push({ place, url: `${url}/history`, gone: { why: "removed", since }, fill: null });
            continue;
        }
        if (Object.keys(tags).some((key) => RETIRED.test(key)) || tags.disused === "yes" || tags.abandoned === "yes") {
            findings.push({ place, url, gone: { why: "retired", since }, fill: null });
            continue;
        }

        const fill: Record<string, unknown> = {};
        const phone = tags.phone || tags["contact:phone"];
        if (!place.phone && phone && firstPhone(phone)) fill.phone = phone.trim().slice(0, 60);
        const whatsapp = tags["contact:whatsapp"];
        if (!place.whatsapp && whatsapp && firstPhone(whatsapp)) fill.whatsapp = whatsapp.trim().slice(0, 60);
        const site = website(tags.website || tags["contact:website"]);
        if (!place.website && site) fill.website = site;
        const instagram = tags["contact:instagram"];
        if (!place.instagram && instagram) fill.instagram = instagram.trim().slice(0, 120);
        if (!place.cuisine && tags.cuisine) fill.cuisine = tags.cuisine.trim().slice(0, 120);
        const hours = !place.opening_time && !place.closing_time ? readHours(tags.opening_hours) : null;
        if (hours) Object.assign(fill, hours);

        if (Object.keys(fill).length) findings.push({ place, url, gone: null, fill });
    }

    // When each entry was last touched on the map: an entry nobody has
    // edited for years is the likeliest to describe a place that has gone.
    const edited = new Map<string, string>();
    for (const element of elements) {
        const place = byRef.get(`${element.type}/${element.id}`);
        if (place && element.timestamp) edited.set(place.id, element.timestamp);
    }

    return { asked: byRef.size, answered: elements.length, findings, edited };
}
