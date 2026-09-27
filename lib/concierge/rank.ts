import { knownFacts } from "../places/display";
import { distanceMeters, type LatLng } from "../places/geo";
import { getOpenState, isOpenDuring } from "../places/hours";
import type { PlaceSummary } from "../places/types";
import { YAOUNDE_NEIGHBORHOODS } from "../tags";
import type { DiscoveryQuery } from "./query";

// Scores every place against a query and a context. Hard constraints
// (category, budget, open) filter; soft preferences (vibe, good-for,
// distance, quality) order what is left.

export type RankContext = {
    origin?: LatLng | null; // visitor position or chosen neighbourhood centre
    now?: Date | null;
};

export type RankedPlace = {
    place: PlaceSummary;
    score: number;
    distance: number | null;
};

export type SortMode = "best" | "distance" | "price" | "rating";

function normalizeWord(text: string) {
    return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// When someone asks for a mood or an occasion but no type of place, only
// consider the kinds of places that can serve it. Places explicitly tagged
// for it always qualify, whatever their category.
const OCCASION_CATEGORIES: Record<string, string[]> = {
    date: ["Restaurant", "Cafe", "Bar", "Nature", "Culture", "Entertainment"],
    friends: ["Restaurant", "Bar", "Club", "Cafe", "Entertainment", "Nature"],
    family: ["Restaurant", "Nature", "Entertainment", "Culture", "Bakery"],
    study: ["Cafe", "Bakery", "Hotel"],
    business: ["Restaurant", "Cafe", "Hotel"],
    solo: ["Cafe", "Restaurant", "Culture", "Nature", "Bakery"],
    party: ["Bar", "Club"],
    football: ["Bar", "Restaurant"],
    celebration: ["Restaurant", "Bar", "Club"],
};
const VIBE_CATEGORIES: Record<string, string[]> = {
    calm: ["Cafe", "Nature", "Culture", "Bakery"],
    casual: ["Cafe", "Bar", "Bakery"],
    outdoor: ["Nature", "Bar"],
    lively: ["Bar", "Club"],
    romantic: ["Restaurant", "Cafe", "Nature"],
    chic: ["Restaurant", "Bar", "Hotel"],
    local: ["Restaurant", "Bar"],
    trendy: ["Bar", "Cafe", "Club"],
};

function occasionCategories(query: DiscoveryQuery) {
    if (query.categories?.length) return null;
    if (query.goodFor?.length) {
        return new Set(query.goodFor.flatMap((key) => OCCASION_CATEGORIES[key] ?? []));
    }
    if (query.vibes?.length) return new Set(query.vibes.flatMap((key) => VIBE_CATEGORIES[key] ?? []));
    return null;
}

// "chez wou" matches "Chez Wou Wou"; "biniou" matches "Le Biniou".
function keywordHits(keywords: string[], haystack: string) {
    return keywords.filter((word) => haystack.includes(word)).length;
}

function overlap(a: string[] | undefined, b: string[]) {
    if (!a?.length) return 0;
    return a.filter((value) => b.includes(value)).length / a.length;
}

export function rankPlaces(
    places: PlaceSummary[],
    query: DiscoveryQuery,
    context: RankContext = {},
    sort: SortMode = "best"
): RankedPlace[] {
    // null = time not known yet (server render, before hydration): skip
    // everything time-based so server and browser agree on the order.
    const now = context.now === undefined ? new Date() : context.now;
    const area = query.neighborhood
        ? YAOUNDE_NEIGHBORHOODS.find((item) => item.name === query.neighborhood)
        : null;
    const origin = area ? { lat: area.lat, lng: area.lng } : context.origin ?? null;
    const keywords = (query.keywords ?? []).map(normalizeWord);
    const occasion = occasionCategories(query);
    // Only words and nothing structured ("Le Biniou", "ndolé"): the visitor
    // is looking for something by name, so non-matches are left out.
    const nameSearch =
        keywords.length > 0 &&
        !query.categories?.length &&
        !query.vibes?.length &&
        !query.goodFor?.length &&
        !query.amenities?.length &&
        !query.neighborhood;

    const results: (RankedPlace & { hits: number })[] = [];

    for (const place of places) {
        // --- hard filters -------------------------------------------------
        const haystack = normalizeWord(`${place.name} ${place.cuisine ?? ""} ${place.neighborhood ?? ""}`);
        const hits = keywords.length ? keywordHits(keywords, haystack) : 0;
        if (nameSearch && hits === 0) continue;

        // Keyword hits (e.g. "pizza" on a Bar that serves pizza) can rescue.
        if (query.categories?.length && !query.categories.includes(place.category) && hits === 0) continue;

        if (occasion && !occasion.has(place.category)) {
            const tagged =
                overlap(query.goodFor, place.goodFor) > 0 || overlap(query.vibes, place.vibes) > 0;
            if (!tagged) continue;
        }

        if (query.budgetMax && place.priceMin && place.priceMin > query.budgetMax * 1.15) continue;
        if (query.budgetMin && place.priceMax && place.priceMax < query.budgetMin * 0.85) continue;

        const openState = now ? getOpenState(place.hours, now) : ({ status: "unknown" } as const);
        // "Open now" means known to be open: unknown hours are not a promise.
        if (query.openNow && openState.status !== "open") continue;
        if (query.when && query.when.label !== "now" && !isOpenDuring(place.hours, query.when.day, query.when.from, query.when.to)) {
            continue;
        }

        const distance = origin ? distanceMeters(origin, place) : null;
        // In the neighbourhood itself, or unlabelled but clearly nearby.
        if (area && place.neighborhood !== area.name && (place.neighborhood || (distance ?? 0) > 1500)) continue;

        // --- soft score (0..~100) -----------------------------------------
        let score = 0;

        score += overlap(query.vibes, place.vibes) * 22;
        score += overlap(query.goodFor, place.goodFor) * 22;
        score += overlap(query.amenities, place.amenities) * 12;

        score += hits * (nameSearch ? 30 : 10);
        if (nameSearch && normalizeWord(place.name).startsWith(keywords[0])) score += 15;

        // Proximity: full points within 800 m, fading to zero at ~8 km.
        if (distance !== null) {
            score += Math.max(0, 18 * (1 - Math.max(0, distance - 800) / 7200));
        }

        // Quality, with a prior so one 5★ review doesn't beat twenty 4.5★.
        const prior = 3.8;
        const weight = 5;
        const bayes = (place.rating * place.reviewCount + prior * weight) / (place.reviewCount + weight);
        score += (bayes - 3) * 5;

        // Budget fit: reward places comfortably inside the budget.
        if (query.budgetMax && place.priceMin) {
            score += place.priceMin <= query.budgetMax ? 6 : -4;
        }
        if (!place.priceMin && !place.priceMax) score -= 3; // unknown price

        if (openState.status === "open") score += openState.closingSoon ? 2 : 6;
        if (openState.status === "unknown" && now) score -= 1;
        // Listings we know more about are more useful to show first.
        score += knownFacts(place) * 2.5;
        if (place.cover) score += 3;
        if (place.verified) score += 4;
        if (place.featured) score += 3;

        results.push({ place, score, distance, hits });
    }

    // A dish or word that several places actually match ("pizza", "grill"):
    // show those places rather than every restaurant.
    const matching = keywords.length ? results.filter((result) => result.hits > 0) : [];
    const kept = matching.length >= 3 ? matching : results;

    const byScore = (a: RankedPlace, b: RankedPlace) => b.score - a.score;
    const comparators: Record<SortMode, (a: RankedPlace, b: RankedPlace) => number> = {
        best: byScore,
        distance: (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity) || byScore(a, b),
        price: (a, b) => (a.place.priceMin ?? Infinity) - (b.place.priceMin ?? Infinity) || byScore(a, b),
        rating: (a, b) => b.place.rating - a.place.rating || b.place.reviewCount - a.place.reviewCount,
    };

    return kept.map(({ place, score, distance }) => ({ place, score, distance })).sort(comparators[sort]);
}
