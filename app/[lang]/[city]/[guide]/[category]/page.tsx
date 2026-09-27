import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import GuideView, { LinkChips, countBy, plural } from "@/components/guide/GuideView";
import { cityBySlug } from "@/lib/cities";
import { fill, getDictionary, isLocale } from "@/lib/i18n";
import { areaBySlug, areasOf } from "@/lib/places/areas";
import { categoryFromSlug, categorySlug, paths } from "@/lib/places/paths";
import { getCityPlaces } from "@/lib/places/server";
import { CATEGORIES, tagLabel } from "@/lib/tags";

// /douala/akwa/bars — one kind of place in one neighbourhood.

export const revalidate = 300;
export const dynamicParams = true;

export function generateStaticParams() {
    return [];
}

type Props = { params: Promise<{ lang: string; city: string; guide: string; category: string }> };

async function load(citySlug: string, areaSlug: string, categoryValue: string) {
    const city = cityBySlug(citySlug);
    const category = categoryFromSlug(categoryValue);
    if (!city || !category) return null;
    const all = await getCityPlaces(city.slug);
    const area = areaBySlug(areasOf(all), areaSlug);
    if (!area) return null;
    const inArea = all.filter((place) => place.neighborhood === area.name);
    return { city, area: area.name, category, inArea, places: inArea.filter((place) => place.category === category) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang, city, guide, category } = await params;
    if (!isLocale(lang)) return {};
    const data = await load(city, guide, category);
    if (!data) return {};
    const t = getDictionary(lang);
    const title = `${fill(t.city.placesIn, { category: plural(data.category, lang), area: data.area })}, ${data.city.name}`;
    const path = (l: "fr" | "en") => paths.neighborhoodCategory(l, data.city.slug, data.area, data.category);
    return {
        title,
        description: fill(t.city.introBoth, { count: data.places.length, area: `${data.area}, ${data.city.name}` }),
        alternates: { canonical: path(lang), languages: { fr: path("fr"), en: path("en"), "x-default": path("fr") } },
        robots: data.places.length < 3 ? { index: false, follow: true } : undefined,
    };
}

export default async function AreaCategoryPage({ params }: Props) {
    const { lang, city: citySlug, guide, category: categoryParam } = await params;
    if (!isLocale(lang)) notFound();
    const data = await load(citySlug, guide, categoryParam);
    if (!data) notFound();
    const { city } = data;
    if (categorySlug(data.category, lang) !== categoryParam) {
        permanentRedirect(paths.neighborhoodCategory(lang, city.slug, data.area, data.category));
    }

    const t = getDictionary(lang);
    const others = countBy(data.inArea, (place) => place.category).filter(([category]) => category !== data.category);

    return (
        <GuideView
            locale={lang}
            city={city.slug}
            eyebrow={`${data.area} · ${city.name}`}
            title={fill(t.city.placesIn, { category: plural(data.category, lang), area: data.area })}
            intro={fill(t.city.introBoth, { count: data.places.length, area: `${data.area}, ${city.name}` })}
            crumbs={[
                { label: city.name, href: paths.city(lang, city.slug) },
                { label: data.area, href: paths.neighborhood(lang, city.slug, data.area) },
                { label: plural(data.category, lang) },
            ]}
            places={data.places}
            mapQuery={`${tagLabel(CATEGORIES, data.category, lang)} ${data.area}`}
        >
            <LinkChips
                title={fill(t.city.otherCategories, { area: data.area })}
                links={others.map(([category, count]) => ({
                    href: paths.neighborhoodCategory(lang, city.slug, data.area, category),
                    label: plural(category, lang),
                    count,
                }))}
            />
        </GuideView>
    );
}
