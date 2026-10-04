import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/blog/server";
import { CITIES } from "@/lib/cities";
import { SITE_URL, type Locale } from "@/lib/i18n/config";
import { areasOf } from "@/lib/places/areas";
import { availableCollections } from "@/lib/places/collections";
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

        // Editorial collections ("open late", "open on Sunday"…), only once
        // enough places qualify.
        const collections = availableCollections(inCity);
        if (collections.length) entries.push(entry((l) => paths.collections(l, city.slug), 0.6));
        for (const { collection } of collections) {
            entries.push(entry((l) => paths.collection(l, city.slug, collection), 0.7));
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

    // Only place pages that say something beyond a name and a pin. Their
    // photo goes in too, so places can show up in Google Images.
    for (const place of places) {
        if (!isIndexable(place)) continue;
        const item = entry((l) => paths.place(l, place.slug), place.verified ? 0.6 : 0.5);
        if (place.cover) item.images = [place.cover];
        entries.push(item);
    }

    // The page inviting businesses to claim their listing.
    entries.push(entry(paths.pro, 0.4));

    // The blog, and each article (English only when it is translated).
    const posts = await getPosts().catch(() => []);
    if (posts.length) entries.push(entry(paths.blog, 0.8));
    for (const post of posts) {
        const fr = `${SITE_URL}${paths.post("fr", post.slug)}`;
        const en = `${SITE_URL}${paths.post("en", post.slug)}`;
        entries.push({
            url: fr,
            lastModified: post.updatedAt,
            priority: 0.7,
            alternates: { languages: post.title.en ? { fr, en } : { fr } },
            ...(post.cover && { images: [post.cover] }),
        });
    }

    return entries;
}
