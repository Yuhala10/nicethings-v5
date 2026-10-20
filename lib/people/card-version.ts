import type { Stats } from "./rules";
import type { Person } from "./types";

// The version in a member card's address (lib/people/card.tsx): built from
// everything drawn on it, so a change gives a fresh picture and the same
// card stays cached. Shared by the page that announces it and the button
// that sends it.
export function cardVersion(card: { person: Person; stats: Stats; top: { slug: string }[]; bio?: string | null }) {
    const { person, stats } = card;
    const parts = [person.name, person.handle, person.face, person.level, person.role, person.memberNo, person.verified, person.area, person.city, stats.reviews, stats.photos, stats.cheers, card.top.map((place) => place.slug).join(","), card.bio ?? null];
    let hash = 7;
    for (const char of JSON.stringify(parts)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return hash.toString(36);
}

export function cardUrl(handle: string, lang: string, version: string, story = false) {
    return `/api/share/person/${handle}?l=${lang}${story ? "&f=story" : ""}&v=${version}`;
}
