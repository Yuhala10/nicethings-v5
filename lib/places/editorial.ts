import type { City } from "../cities";
import { fill } from "../i18n";
import type { Locale } from "../i18n/config";
import { COLLECTIONS, MIN_COLLECTION, placesIn, rankForEditorial, type Collection } from "./collections";
import { paths } from "./paths";
import type { PlaceSummary } from "./types";

// The editorial sections of the home page and the city guides, built from
// real data only. A section with too few places is simply left out.

export type EditorialRail = {
    key: string;
    title: string;
    blurb: string;
    href: string | null; // "See all"
    count: number;
    items: PlaceSummary[];
};

type Text = Record<Locale, string>;

const CATEGORY_RAILS: Record<string, { name: Text; blurb: Text }> = {
    Cafe: {
        name: { fr: "Pour un café", en: "For a coffee" },
        blurb: { fr: "Une pause, un rendez-vous, une heure de travail.", en: "A break, a meeting, an hour of work." },
    },
    Nature: {
        name: { fr: "Prendre l'air", en: "Fresh air" },
        blurb: { fr: "Parcs, jardins et coins de verdure.", en: "Parks, gardens and green corners." },
    },
    Culture: {
        name: { fr: "Culture & visites", en: "Culture & sights" },
        blurb: { fr: "Musées, monuments et lieux qui racontent la ville.", en: "Museums, monuments and places that tell the city's story." },
    },
    Restaurant: {
        name: { fr: "Où manger", en: "Where to eat" },
        blurb: { fr: "Des tables pour tous les jours et pour les grandes occasions.", en: "Tables for every day and for big occasions." },
    },
    Bar: {
        name: { fr: "Prendre un verre", en: "For a drink" },
        blurb: { fr: "Bars et lounges, du plus simple au plus soigné.", en: "Bars and lounges, from simple to polished." },
    },
};

const VERIFIED: { name: Text; blurb: Text } = {
    name: { fr: "Vérifié par l'équipe", en: "Checked by our team" },
    blurb: {
        fr: "Nous sommes passés sur place : les infos de ces fiches ont été confirmées.",
        en: "We have been there: the details on these listings were confirmed.",
    },
};

// The order sections are offered in, mixing moods, hours and kinds of place
// so the page never reads like a timetable.
const ORDER = [
    "verified",
    "collection:date",
    "collection:open-late",
    "category:Cafe",
    "collection:quiet",
    "collection:budget",
    "category:Nature",
    "collection:early",
    "collection:terrace",
    "category:Culture",
    "collection:wifi",
    "collection:family",
    "collection:football",
    "category:Restaurant",
    "category:Bar",
];

const PER_RAIL = 8;

export function editorialRails(
    places: PlaceSummary[],
    city: City,
    locale: Locale,
    { limit = 5, withCity = false }: { limit?: number; withCity?: boolean } = {}
): EditorialRail[] {
    const rails: EditorialRail[] = [];
    const used = new Set<string>();
    // A place already shown higher up goes to the back of the next rail, so
    // each section brings new faces.
    const take = (ranked: PlaceSummary[]) => {
        const items = [...ranked.filter((place) => !used.has(place.id)), ...ranked.filter((place) => used.has(place.id))].slice(0, PER_RAIL);
        items.slice(0, 4).forEach((place) => used.add(place.id));
        return items;
    };
    const inCity = (title: string) => (withCity ? `${title} · ${city.name}` : title);

    for (const entry of ORDER) {
        if (rails.length >= limit) break;
        const [kind, key] = entry.split(":");

        if (kind === "verified") {
            const verified = rankForEditorial(places.filter((place) => place.verified));
            if (verified.length < MIN_COLLECTION) continue;
            rails.push({ key: entry, title: inCity(VERIFIED.name[locale]), blurb: VERIFIED.blurb[locale], href: null, count: verified.length, items: take(verified) });
            continue;
        }

        if (kind === "collection") {
            const collection = COLLECTIONS.find((item) => item.key === key) as Collection;
            const matches = placesIn(collection, places);
            if (matches.length < MIN_COLLECTION) continue;
            rails.push({
                key: entry,
                title: withCity ? fill(collection.title[locale], { city: city.name }) : collection.name[locale],
                blurb: collection.blurb[locale],
                href: paths.collection(locale, city.slug, collection),
                count: matches.length,
                items: take(matches),
            });
            continue;
        }

        const copy = CATEGORY_RAILS[key];
        const matches = rankForEditorial(places.filter((place) => place.category === key));
        if (!copy || matches.length < MIN_COLLECTION) continue;
        rails.push({
            key: entry,
            title: inCity(copy.name[locale]),
            blurb: copy.blurb[locale],
            href: paths.category(locale, city.slug, key),
            count: matches.length,
            items: take(matches),
        });
    }
    return rails;
}
