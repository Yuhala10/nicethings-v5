import { slugify } from "./paths";
import type { PlaceSummary } from "./types";

// Neighbourhoods come from the data itself: each one is centred on the
// average position of its places, so every city gets them for free.

export type Area = { name: string; slug: string; lat: number; lng: number; count: number };

export function areasOf(places: PlaceSummary[], minCount = 1): Area[] {
    const groups = new Map<string, { lat: number; lng: number; count: number }>();
    for (const place of places) {
        if (!place.neighborhood) continue;
        const group = groups.get(place.neighborhood) ?? { lat: 0, lng: 0, count: 0 };
        group.lat += place.lat;
        group.lng += place.lng;
        group.count += 1;
        groups.set(place.neighborhood, group);
    }
    return [...groups.entries()]
        .filter(([, group]) => group.count >= minCount)
        .map(([name, group]) => ({
            name,
            slug: slugify(name),
            lat: group.lat / group.count,
            lng: group.lng / group.count,
            count: group.count,
        }))
        .sort((a, b) => b.count - a.count);
}

export function areaBySlug(areas: Area[], slug: string) {
    return areas.find((area) => area.slug === slug) ?? null;
}
