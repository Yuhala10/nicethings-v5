import type { IntentKey } from "./query";
import { knownFacts } from "../places/display";
import { distanceMeters, type LatLng } from "../places/geo";
import { cityNow, getOpenState } from "../places/hours";
import type { PlaceSummary } from "../places/types";

// Home-screen discovery rails, built only from what the data actually says.
// A rail appears once enough places qualify, so "Open right now" or
// "Checked by NiceThings" show up by themselves as listings get richer.

export type RailKey = "near" | "open" | "featured" | "verified" | "eat" | "coffee" | "drinks" | "stay" | "outing";

export type Rail = {
    key: RailKey;
    items: { place: PlaceSummary; distance: number | null }[];
    // What "See all" does in the explorer.
    action: { intent?: IntentKey; openNow?: boolean; sortByDistance?: boolean; categories?: string[] };
};

const MIN_ITEMS = 3;
const PER_RAIL = 12;
const OUTING = ["Club", "Culture", "Nature", "Entertainment"];
const NEAR_EXCLUDED = new Set(["Shopping", "Beauty", "Other"]);

// Stable within a day, different the next: the same good places don't sit
// at the front forever, and the list doesn't jump around between visits.
function dailyJitter(slug: string, day: number) {
    let hash = day * 2654435761;
    for (let i = 0; i < slug.length; i++) hash = Math.imul(hash ^ slug.charCodeAt(i), 16777619);
    return ((hash >>> 0) % 1000) / 1000;
}

export function buildRails(
    places: PlaceSummary[],
    { origin, now }: { origin: LatLng | null; now: Date }
): Rail[] {
    const day = Math.floor(now.getTime() / 86_400_000);
    const withDistance = places.map((place) => ({
        place,
        distance: origin ? distanceMeters(origin, place) : null,
    }));

    const score = ({ place, distance }: (typeof withDistance)[number]) => {
        let value = knownFacts(place) * 3 + dailyJitter(place.slug, day) * 4;
        if (place.cover) value += 4;
        if (place.verified) value += 4;
        if (place.featured) value += 3;
        if (distance !== null) value += Math.max(0, 8 * (1 - distance / 6000));
        return value;
    };

    const top = (list: typeof withDistance) =>
        [...list].sort((a, b) => score(b) - score(a)).slice(0, PER_RAIL);

    const byCategory = (categories: string[]) =>
        top(withDistance.filter(({ place }) => categories.includes(place.category)));

    const rails: Rail[] = [];
    const push = (rail: Rail) => {
        if (rail.items.length >= MIN_ITEMS) rails.push(rail);
    };

    if (origin) {
        push({
            key: "near",
            items: withDistance
                .filter(({ place, distance }) => distance !== null && distance < 2500 && !NEAR_EXCLUDED.has(place.category))
                .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
                .slice(0, PER_RAIL),
            action: { sortByDistance: true },
        });
    }

    push({
        key: "open",
        items: top(withDistance.filter(({ place }) => getOpenState(place.hours, now).status === "open")),
        action: { openNow: true },
    });
    push({ key: "featured", items: top(withDistance.filter(({ place }) => place.featured)), action: {} });
    push({ key: "verified", items: top(withDistance.filter(({ place }) => place.verified)), action: {} });

    // Lead with what fits the hour: coffee in the morning, drinks at night.
    const hour = cityNow(now).minutes / 60;
    const categoryRails: Rail[] = [
        { key: "eat", items: byCategory(["Restaurant"]), action: { intent: "eat" } },
        { key: "coffee", items: byCategory(["Cafe", "Bakery"]), action: { intent: "coffee" } },
        { key: "drinks", items: byCategory(["Bar"]), action: { intent: "drinks" } },
        { key: "outing", items: byCategory(OUTING), action: { categories: OUTING } },
        { key: "stay", items: byCategory(["Hotel"]), action: { intent: "stay" } },
    ];
    const order: RailKey[] =
        hour >= 5 && hour < 11
            ? ["coffee", "eat", "outing", "drinks", "stay"]
            : hour >= 17 || hour < 5
              ? ["drinks", "eat", "outing", "coffee", "stay"]
              : ["eat", "coffee", "outing", "drinks", "stay"];
    for (const key of order) push(categoryRails.find((rail) => rail.key === key)!);

    return rails;
}
