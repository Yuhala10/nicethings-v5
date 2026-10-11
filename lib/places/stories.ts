import type { StoryPlace } from "./server";

// How the places that carry a story are laid out as a mosaic: one wide tile,
// then two side by side. The wide tiles go to the strongest stories with a
// picture for as long as there are some: the more a place matters, the
// bigger its tile.
export const isWide = (index: number) => index % 3 === 0;

export function asMosaic(places: StoryPlace[]) {
    const leads = places.filter((place) => place.standing === 2 && place.cover);
    const others = places.filter((place) => !(place.standing === 2 && place.cover));
    const ordered: StoryPlace[] = [];
    while (leads.length > 0 || others.length > 0) {
        const wide = leads.shift() ?? others.shift();
        if (wide) ordered.push(wide);
        for (let pair = 0; pair < 2; pair++) {
            const next = others.shift() ?? leads.pop();
            if (next) ordered.push(next);
        }
    }
    return ordered;
}

// The few shown on the home page: only places with a picture, one city after
// another so the mosaic travels across the country, starting from a
// different point each day so the page never looks the same for long.
export function todaysStories(places: StoryPlace[], count = 9) {
    const day = Math.floor(Date.now() / 86_400_000);
    const turn = <T>(list: T[]) => (list.length ? [...list.slice(day % list.length), ...list.slice(0, day % list.length)] : list);
    const byCity = new Map<string, StoryPlace[]>();
    for (const place of places) {
        if (place.cover) byCity.set(place.city, [...(byCity.get(place.city) ?? []), place]);
    }
    const cities = turn([...byCity.values()].map(turn));
    const picked: StoryPlace[] = [];
    for (let round = 0; picked.length < count && cities.some((list) => list.length > round); round++) {
        for (const list of cities) if (list[round] && picked.length < count) picked.push(list[round]);
    }
    return asMosaic(picked);
}
