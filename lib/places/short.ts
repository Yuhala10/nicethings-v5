import type { Locale } from "../i18n/config";

// The short address of a place, for sharing: /l/chepele-3fa85f.
//
// A conversation prints the address of a shared link under its card, so it
// should be short and still say what it is. The first word or two of the
// place's own address are there for the reader; what finds the place is the
// start of its identifier, which never changes, so a link shared today still
// works after a place is renamed. English adds "-en": the card is then drawn
// in English (app/l/[code]/route.ts).

const ID_LENGTH = 6;
const CODE = new RegExp(`^(?:([a-z0-9-]*?)-)?([0-9a-f]{${ID_LENGTH}})(-en)?$`);

export function shortPath(place: { id: string; slug: string }, locale: Locale) {
    // Enough of the name to be recognised: whole words, six letters or more.
    let head = "";
    for (const word of place.slug.split("-")) {
        head = head ? `${head}-${word}` : word;
        if (head.length >= 6) break;
    }
    return `/l/${head.slice(0, 18)}-${place.id.slice(0, ID_LENGTH)}${locale === "en" ? "-en" : ""}`;
}

// Reads a short address back. `head` only settles the rare case of two
// places whose identifiers start alike.
export function readShort(code: string) {
    const found = CODE.exec(code.toLowerCase());
    return found ? { head: found[1] ?? "", id: found[2], english: Boolean(found[3]) } : null;
}

export function findByShort<Place extends { id: string; slug: string }>(places: Place[], short: { head: string; id: string }) {
    const alike = places.filter((place) => place.id.startsWith(short.id));
    return alike.find((place) => place.slug.startsWith(short.head)) ?? alike[0] ?? null;
}
