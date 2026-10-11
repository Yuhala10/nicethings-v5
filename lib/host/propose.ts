import { rankPlaces } from "../concierge/rank";
import { knownFacts } from "../places/display";
import { distanceMeters, type LatLng } from "../places/geo";
import type { PlaceSummary } from "../places/types";
import { momentCategories, momentQuery, type Moment } from "./moment";

// What the app puts forward by itself: places for the moment, one pick when
// the visitor asks to be surprised, and where to go next after a place.
// Everything comes from the catalogue as it is; nothing is assumed about a
// place beyond what its listing says.

export type Proposal = { place: PlaceSummary; distance: number | null };

// The kinds of places a visitor is taken to, as opposed to errands.
export const OUTING_CATEGORIES = ["Restaurant", "Cafe", "Bar", "Club", "Bakery", "Nature", "Culture", "Entertainment"];

// Places for the moment, best first. The kinds of places take turns (a
// table, then a bar, then a table…) so the row never reads as one list.
export function proposeNow(
    places: PlaceSummary[],
    { moment, now, origin, limit = 8 }: { moment: Moment; now: Date; origin: LatLng | null; limit?: number }
): Proposal[] {
    const ranked = rankPlaces(places, momentQuery(moment), { origin, now });
    const queues = momentCategories(moment).map((category) => ranked.filter((item) => item.place.category === category));
    const picked: Proposal[] = [];
    while (picked.length < limit && queues.some((queue) => queue.length)) {
        for (const queue of queues) {
            const next = queue.shift();
            if (next && picked.length < limit) picked.push({ place: next.place, distance: next.distance });
        }
    }
    return picked;
}

// One pick among the best for the moment, never one already shown this
// visit while others remain. The earlier a place ranks, the likelier it is.
export function surpriseFrom(proposals: Proposal[], seen: ReadonlySet<string>, random: () => number = Math.random): Proposal | null {
    const fresh = proposals.filter((item) => !seen.has(item.place.slug));
    const pool = fresh.length ? fresh : proposals;
    if (!pool.length) return null;
    const weights = pool.map((_, index) => 1 / (index + 2));
    let roll = random() * weights.reduce((sum, weight) => sum + weight, 0);
    for (let index = 0; index < pool.length; index++) {
        roll -= weights[index];
        if (roll <= 0) return pool[index];
    }
    return pool[pool.length - 1];
}

// What follows what: after a table a drink, after a visit a coffee.
const AFTER: Record<string, string[]> = {
    Restaurant: ["Bar", "Cafe", "Club", "Bakery"],
    Bakery: ["Cafe", "Nature", "Culture", "Shopping"],
    Cafe: ["Culture", "Nature", "Restaurant", "Shopping"],
    Bar: ["Club", "Restaurant"],
    Club: ["Restaurant"],
    Hotel: ["Restaurant", "Bar", "Culture", "Nature"],
    Culture: ["Cafe", "Restaurant", "Nature"],
    Nature: ["Cafe", "Restaurant", "Culture"],
    Entertainment: ["Restaurant", "Bar", "Cafe"],
};
const AFTER_DEFAULT = ["Restaurant", "Cafe"];

const NEAR_METERS = 1500;
const FAR_METERS = 3500;

// Where to go next from a place: the kinds of places that follow it, close
// enough to walk or for a short ride, the best documented first.
export function afterStops(place: PlaceSummary, places: PlaceSummary[], limit = 6): Proposal[] {
    const kinds = AFTER[place.category] ?? AFTER_DEFAULT;
    const candidates = places
        .filter((item) => item.slug !== place.slug && kinds.includes(item.category))
        .map((item) => ({ place: item, distance: distanceMeters(place, item) }))
        .filter((item) => item.distance <= FAR_METERS);
    const near = candidates.filter((item) => item.distance <= NEAR_METERS);
    const pool = near.length >= Math.min(limit, 3) ? near : candidates;

    const score = (item: { place: PlaceSummary; distance: number }) =>
        knownFacts(item.place) * 2 + (item.place.cover ? 3 : 0) + (item.place.verified ? 3 : 0) + 6 * (1 - item.distance / FAR_METERS);
    const ranked = pool.sort((a, b) => score(b) - score(a));

    // One of each kind first, in the order they follow, then the rest.
    const firsts = kinds.map((kind) => ranked.find((item) => item.place.category === kind)).filter((item): item is (typeof ranked)[number] => Boolean(item));
    const rest = ranked.filter((item) => !firsts.includes(item));
    return [...firsts, ...rest].slice(0, limit);
}

// The part of a city's catalogue worth proposing from: places people go out
// to, the best documented first. Small enough to send to a phone on 3G.
export function hostPool(places: PlaceSummary[], limit = 240): PlaceSummary[] {
    const richness = (place: PlaceSummary) =>
        knownFacts(place) + (place.hours.opens && place.hours.closes ? 2 : 0) + (place.cover ? 2 : 0) + (place.verified ? 3 : 0) + (place.featured ? 1 : 0);
    return places
        .filter((place) => OUTING_CATEGORIES.includes(place.category))
        .sort((a, b) => richness(b) - richness(a) || a.name.localeCompare(b.name, "fr"))
        .slice(0, limit);
}
