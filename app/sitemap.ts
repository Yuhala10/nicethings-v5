import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/i18n/config";
import { isIndexable } from "@/lib/places/display";
import { paths } from "@/lib/places/paths";
import { getAllPlaces } from "@/lib/places/server";
import { YAOUNDE_NEIGHBORHOODS } from "@/lib/tags";

export const revalidate = 3600;

// Guides with at least this many places are worth indexing.
const MIN_GUIDE_PLACES = 3;

type Localised = (locale: "fr" | "en") => string;

function entry(path: Localised, priority: number, lastModified?: Date): MetadataRoute.Sitemap[number] {
    return {
        url: `${SITE_URL}${path("fr")}`,
        lastModified,
        priority,
        alternates: { languages: { fr: `${SITE_URL}${path("fr")}`, en: `${SITE_URL}${path("en")}` } },
    };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const places = await getAllPlaces().catch(() => []);
    const entries: MetadataRoute.Sitemap = [entry(paths.explore, 1), entry(paths.city, 0.9)];

    const counts = new Map<string, number>();
    const bump = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);
    for (const place of places) {
        bump(`c:${place.category}`);
        if (place.neighborhood) {
            bump(`n:${place.neighborhood}`);
            bump(`nc:${place.neighborhood}:${place.category}`);
        }
    }

    const categories = [...new Set(places.map((place) => place.category))];
    for (const category of categories) {
        if ((counts.get(`c:${category}`) ?? 0) >= MIN_GUIDE_PLACES) {
            entries.push(entry((locale) => paths.category(locale, category), 0.8));
        }
    }
    for (const area of YAOUNDE_NEIGHBORHOODS) {
        if ((counts.get(`n:${area.name}`) ?? 0) < MIN_GUIDE_PLACES) continue;
        entries.push(entry((locale) => paths.neighborhood(locale, area.name), 0.8));
        for (const category of categories) {
            if ((counts.get(`nc:${area.name}:${category}`) ?? 0) >= MIN_GUIDE_PLACES) {
                entries.push(entry((locale) => paths.neighborhoodCategory(locale, area.name, category), 0.6));
            }
        }
    }

    // Only place pages that say something beyond a name and a pin.
    for (const place of places) {
        if (isIndexable(place)) {
            entries.push(entry((locale) => paths.place(locale, place.slug), 0.5));
        }
    }

    return entries;
}
