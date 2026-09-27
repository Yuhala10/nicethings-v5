import { DAY_KEYS, type DayKey, type PlaceSummary } from "./types";

// The explorer ships the whole catalogue to the phone for instant search.
// This wire format keeps it small on 3G: short keys, defaults omitted,
// coordinates rounded to ~1 m, and the slug doubling as the id.

export type CompactPlace = {
    s: string; // slug (also used as id)
    n: string; // name
    c: string; // category
    a: number; // lat
    o: number; // lng
    h?: string; // neighbourhood
    u?: string; // cuisine
    p?: [number | null, number | null]; // price min/max
    r?: [number, number]; // rating, review count
    v?: string[];
    g?: string[];
    m?: string[];
    t?: [string, string, number?]; // opens, closes, closed-days bitmask
    f?: 1 | 2 | 3; // 1 verified, 2 featured, 3 both
    i?: string; // cover image
    x?: string; // source, when not OpenStreetMap
};

const round = (value: number) => Math.round(value * 1e5) / 1e5;

export function compactPlaces(places: PlaceSummary[]): CompactPlace[] {
    return places.map((place) => {
        const item: CompactPlace = { s: place.slug, n: place.name, c: place.category, a: round(place.lat), o: round(place.lng) };
        if (place.neighborhood) item.h = place.neighborhood;
        if (place.cuisine) item.u = place.cuisine;
        if (place.priceMin || place.priceMax) item.p = [place.priceMin, place.priceMax];
        if (place.reviewCount) item.r = [place.rating, place.reviewCount];
        if (place.vibes.length) item.v = place.vibes;
        if (place.goodFor.length) item.g = place.goodFor;
        if (place.amenities.length) item.m = place.amenities;
        if (place.hours.opens && place.hours.closes) {
            const closed = DAY_KEYS.reduce((mask, day, index) => (place.hours.days.includes(day) ? mask : mask | (1 << index)), 0);
            item.t = closed ? [place.hours.opens, place.hours.closes, closed] : [place.hours.opens, place.hours.closes];
        }
        const flags = (place.verified ? 1 : 0) | (place.featured ? 2 : 0);
        if (flags) item.f = flags as 1 | 2 | 3;
        if (place.cover) item.i = place.cover;
        if (place.source !== "osm") item.x = place.source;
        return item;
    });
}

export function expandPlaces(items: CompactPlace[]): PlaceSummary[] {
    return items.map((item) => {
        const closed = item.t?.[2] ?? 0;
        const days: DayKey[] = DAY_KEYS.filter((_, index) => !(closed & (1 << index)));
        return {
            id: item.s,
            slug: item.s,
            name: item.n,
            category: item.c,
            cuisine: item.u ?? null,
            neighborhood: item.h ?? null,
            lat: item.a,
            lng: item.o,
            priceMin: item.p?.[0] ?? null,
            priceMax: item.p?.[1] ?? null,
            rating: item.r?.[0] ?? 0,
            reviewCount: item.r?.[1] ?? 0,
            vibes: item.v ?? [],
            goodFor: item.g ?? [],
            amenities: item.m ?? [],
            hours: { opens: item.t?.[0] ?? null, closes: item.t?.[1] ?? null, days },
            verified: Boolean((item.f ?? 0) & 1),
            featured: Boolean((item.f ?? 0) & 2),
            cover: item.i ?? null,
            source: item.x ?? "osm",
        };
    });
}
