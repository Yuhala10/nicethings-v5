import type { MetadataRoute } from "next";
import { CITIES } from "@/lib/cities";
import { SITE_URL, type Locale } from "@/lib/i18n/config";
import { areasOf } from "@/lib/places/areas";
import { isIndexable } from "@/lib/places/display";
import { paths } from "@/lib/places/paths";
import { getAllPlaces } from "@/lib/places/server";

export const revalidate = 3600;

// Guides with at least this many places are worth indexing.
const MIN_GUIDE_PLACES = 3;

type Localised = (locale: Locale) => string;

function entry(path: Localised, priority: number): MetadataRoute.Sitemap[number] {
    return {
        url: `${SITE_URL}${path("fr")}`,
        priority,
        alternates: { languages: { fr: `${SITE_URL}${path("fr")}`, en: `${SITE_URL}${path("en")}` } },
    };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const places = await getAllPlaces().catch(() => []);
    const entries: MetadataRoute.Sitemap = [entry(paths.home, 1)];

    for (const city of CITIES) {
        const inCity = places.filter((place) => place.city === city.slug);
        if (inCity.length < MIN_GUIDE_PLACES) continue;
        entries.push(entry((l) => paths.city(l, city.slug), 0.9), entry((l) => paths.explore(l, city.slug), 0.8));

        const categories = new Map<string, number>();
        for (const place of inCity) categories.set(place.category, (categories.get(place.category) ?? 0) + 1);
        for (const [category, count] of categories) {
            if (count >= MIN_GUIDE_PLACES && category !== "Other") {
                entries.push(entry((l) => paths.category(l, city.slug, category), 0.7));
            }
        }

        for (const area of areasOf(inCity, MIN_GUIDE_PLACES)) {
            entries.push(entry((l) => paths.neighborhood(l, city.slug, area.name), 0.7));
            const inArea = inCity.filter((place) => place.neighborhood === area.name);
            const areaCategories = new Map<string, number>();
            for (const place of inArea) areaCategories.set(place.category, (areaCategories.get(place.category) ?? 0) + 1);
            for (const [category, count] of areaCategories) {
                if (count >= MIN_GUIDE_PLACES && category !== "Other") {
                    entries.push(entry((l) => paths.neighborhoodCategory(l, city.slug, area.name, category), 0.6));
                }
            }
        }
    }

    // Only place pages that say something beyond a name and a pin.
    for (const place of places) {
        if (isIndexable(place)) entries.push(entry((l) => paths.place(l, place.slug), 0.5));
    }

    return entries;
}
