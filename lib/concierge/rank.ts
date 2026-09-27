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
    now?: Date;
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
    const now = context.now ?? new Date();
    const area = query.neighborhood
        ? YAOUNDE_NEIGHBORHOODS.find((item) => item.name === query.neighborhood)
        : null;
    const origin = area ? { lat: area.lat, lng: area.lng } : context.origin ?? null;
    const keywords = (query.keywords ?? []).map(normalizeWord);

    const results: RankedPlace[] = [];

    for (const place of places) {
        // --- hard filters -------------------------------------------------
        if (query.categories?.length && !query.categories.includes(place.category)) {
            // Keyword hits (e.g. "pizza" on a Bar that serves pizza) can rescue.
            const haystack = normalizeWord(`${place.name} ${place.cuisine ?? ""}`);
            if (!keywords.some((word) => haystack.includes(word))) continue;
        }

        if (query.budgetMax && place.priceMin && place.priceMin > query.budgetMax * 1.15) continue;
        if (query.budgetMin && place.priceMax && place.priceMax < query.budgetMin * 0.85) continue;

        const openState = getOpenState(place.hours, now);
        if (query.openNow && openState.status === "closed") continue;
        if (query.when && query.when.label !== "now" && !isOpenDuring(place.hours, query.when.day, query.when.from, query.when.to)) {
            continue;
        }

        const distance = origin ? distanceMeters(origin, place) : null;
        if (area && distance !== null && distance > 4000) continue;

        // --- soft score (0..~100) -----------------------------------------
        let score = 0;

        score += overlap(query.vibes, place.vibes) * 22;
        score += overlap(query.goodFor, place.goodFor) * 22;
        score += overlap(query.amenities, place.amenities) * 12;

        if (keywords.length) {
            const haystack = normalizeWord(`${place.name} ${place.cuisine ?? ""} ${place.neighborhood ?? ""}`);
            score += keywords.filter((word) => haystack.includes(word)).length * 10;
        }

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
        if (openState.status === "unknown") score -= 1;
        if (place.cover) score += 5; // photos convert; lists look alive
        if (place.verified) score += 4;
        if (place.featured) score += 3;

        results.push({ place, score, distance });
    }

    const byScore = (a: RankedPlace, b: RankedPlace) => b.score - a.score;
    const comparators: Record<SortMode, (a: RankedPlace, b: RankedPlace) => number> = {
        best: byScore,
        distance: (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity) || byScore(a, b),
        price: (a, b) => (a.place.priceMin ?? Infinity) - (b.place.priceMin ?? Infinity) || byScore(a, b),
        rating: (a, b) => b.place.rating - a.place.rating || b.place.reviewCount - a.place.reviewCount,
    };

    return results.sort(comparators[sort]);
}
