import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import GuideView, { LinkChips, countBy, plural } from "@/components/guide/GuideView";
import { fill, getDictionary, isLocale } from "@/lib/i18n";
import { categoryFromSlug, categorySlug, neighborhoodFromSlug, paths } from "@/lib/places/paths";
import { getAllPlaces } from "@/lib/places/server";
import { CATEGORIES, tagLabel } from "@/lib/tags";

// /yaounde/bastos/bars — one kind of place in one neighbourhood.

export const revalidate = 300;
export const dynamicParams = true;

export function generateStaticParams() {
    return [];
}

type Props = { params: Promise<{ lang: string; guide: string; category: string }> };

async function load(areaSlug: string, categorySlugValue: string) {
    const area = neighborhoodFromSlug(areaSlug);
    const category = categoryFromSlug(categorySlugValue);
    if (!area || !category) return null;
    const all = await getAllPlaces();
    const inArea = all.filter((place) => place.neighborhood === area.name);
    return { area: area.name, category, inArea, places: inArea.filter((place) => place.category === category) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang, guide, category } = await params;
    if (!isLocale(lang)) return {};
    const data = await load(guide, category);
    if (!data) return {};
    const t = getDictionary(lang);
    const title = fill(t.city.placesIn, { category: plural(data.category, lang), area: data.area });
    const path = (l: "fr" | "en") => paths.neighborhoodCategory(l, data.area, data.category);
    return {
        title,
        description: fill(t.city.introBoth, { count: data.places.length, area: data.area }),
        alternates: { canonical: path(lang), languages: { fr: path("fr"), en: path("en"), "x-default": path("fr") } },
        robots: data.places.length < 3 ? { index: false, follow: true } : undefined,
    };
}

export default async function AreaCategoryPage({ params }: Props) {
    const { lang, guide, category: categoryParam } = await params;
    if (!isLocale(lang)) notFound();
    const data = await load(guide, categoryParam);
    if (!data) notFound();
    if (categorySlug(data.category, lang) !== categoryParam) {
        permanentRedirect(paths.neighborhoodCategory(lang, data.area, data.category));
    }

    const t = getDictionary(lang);
    const others = countBy(data.inArea, (place) => place.category).filter(([category]) => category !== data.category);

    return (
        <GuideView
            locale={lang}
            title={fill(t.city.placesIn, { category: plural(data.category, lang), area: data.area })}
            intro={fill(t.city.introBoth, { count: data.places.length, area: data.area })}
            crumbs={[
                { label: t.city.title, href: paths.city(lang) },
                { label: data.area, href: paths.neighborhood(lang, data.area) },
                { label: plural(data.category, lang) },
            ]}
            places={data.places}
            mapQuery={`${tagLabel(CATEGORIES, data.category, lang)} ${data.area}`}
        >
            <LinkChips
                title={fill(t.city.otherCategories, { area: data.area })}
                links={others.map(([category, count]) => ({
                    href: paths.neighborhoodCategory(lang, data.area, category),
                    label: plural(category, lang),
                    count,
                }))}
            />
        </GuideView>
    );
}
