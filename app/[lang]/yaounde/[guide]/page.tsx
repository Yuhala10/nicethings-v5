import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import GuideView, { LinkChips, countBy, plural } from "@/components/guide/GuideView";
import { fill, getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { categoryFromSlug, categorySlug, neighborhoodFromSlug, paths } from "@/lib/places/paths";
import { getAllPlaces } from "@/lib/places/server";
import { CATEGORIES, tagLabel } from "@/lib/tags";

// /yaounde/bastos (a neighbourhood) or /yaounde/restaurants (a category).

export const revalidate = 300;
export const dynamicParams = true;

export function generateStaticParams() {
    return [];
}

type Props = { params: Promise<{ lang: string; guide: string }> };

function resolve(slug: string) {
    const area = neighborhoodFromSlug(slug);
    if (area) return { kind: "area", name: area.name } as const;
    const category = categoryFromSlug(slug);
    if (category) return { kind: "category", category } as const;
    return null;
}

function copy(guide: NonNullable<ReturnType<typeof resolve>>, locale: Locale, count: number) {
    const t = getDictionary(locale);
    if (guide.kind === "area") {
        return {
            title: fill(t.city.whereToGoIn, { area: guide.name }),
            intro: fill(t.city.intro, { count, area: guide.name }),
            path: (l: Locale) => paths.neighborhood(l, guide.name),
        };
    }
    return {
        title: fill(t.city.bestOf, { category: plural(guide.category, locale) }),
        intro: fill(t.city.introCategory, { count }),
        path: (l: Locale) => paths.category(l, guide.category),
    };
}

async function load(slug: string) {
    const guide = resolve(slug);
    if (!guide) return null;
    const all = await getAllPlaces();
    const places =
        guide.kind === "area"
            ? all.filter((place) => place.neighborhood === guide.name)
            : all.filter((place) => place.category === guide.category);
    return { guide, all, places };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang, guide: slug } = await params;
    if (!isLocale(lang)) return {};
    const data = await load(slug);
    if (!data) return {};
    const { title, intro, path } = copy(data.guide, lang, data.places.length);
    return {
        title,
        description: intro,
        alternates: { canonical: path(lang), languages: { fr: path("fr"), en: path("en"), "x-default": path("fr") } },
        robots: data.places.length < 3 ? { index: false, follow: true } : undefined,
    };
}

export default async function GuidePage({ params }: Props) {
    const { lang, guide: slug } = await params;
    if (!isLocale(lang)) notFound();
    const data = await load(slug);
    if (!data) notFound();
    const { guide, all, places } = data;

    // A category slug from the other language: send to this language's URL.
    if (guide.kind === "category" && categorySlug(guide.category, lang) !== slug) {
        permanentRedirect(paths.category(lang, guide.category));
    }

    const t = getDictionary(lang);
    const { title, intro } = copy(guide, lang, places.length);

    if (guide.kind === "area") {
        const byCategory = countBy(places, (place) => place.category);
        const otherAreas = countBy(all, (place) => place.neighborhood).filter(([area]) => area !== guide.name);
        return (
            <GuideView
                locale={lang}
                title={title}
                intro={intro}
                crumbs={[{ label: t.city.title, href: paths.city(lang) }, { label: guide.name }]}
                places={places}
                mapQuery={guide.name}
                filters={
                    <ul className="nt-scroll-x -mx-4 gap-2 px-4 md:mx-0 md:flex-wrap md:px-0">
                        {byCategory.map(([category, count]) => (
                            <li key={category}>
                                <Link href={paths.neighborhoodCategory(lang, guide.name, category)} className="nt-chip">
                                    {plural(category, lang)}
                                    <span className="font-medium text-muted">{count}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                }
            >
                <LinkChips
                    title={t.city.otherAreas}
                    links={otherAreas.map(([area, count]) => ({ href: paths.neighborhood(lang, area), label: area, count }))}
                />
            </GuideView>
        );
    }

    const byArea = countBy(places, (place) => place.neighborhood);
    return (
        <GuideView
            locale={lang}
            title={title}
            intro={intro}
            crumbs={[{ label: t.city.title, href: paths.city(lang) }, { label: plural(guide.category, lang) }]}
            places={places}
            mapQuery={tagLabel(CATEGORIES, guide.category, lang)}
            filters={
                <ul className="nt-scroll-x -mx-4 gap-2 px-4 md:mx-0 md:flex-wrap md:px-0">
                    {byArea.map(([area, count]) => (
                        <li key={area}>
                            <Link href={paths.neighborhoodCategory(lang, area, guide.category)} className="nt-chip">
                                {area}
                                <span className="font-medium text-muted">{count}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            }
        />
    );
}
