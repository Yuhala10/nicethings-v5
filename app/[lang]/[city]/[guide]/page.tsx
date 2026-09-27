import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import GuideView, { LinkChips, countBy, plural } from "@/components/guide/GuideView";
import { cityBySlug, type City } from "@/lib/cities";
import { fill, getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { areaBySlug, areasOf } from "@/lib/places/areas";
import { categoryFromSlug, categorySlug, paths } from "@/lib/places/paths";
import { getCityPlaces } from "@/lib/places/server";
import { CATEGORIES, tagLabel } from "@/lib/tags";

// /douala/akwa (a neighbourhood) or /douala/restaurants (a category).

export const revalidate = 300;
export const dynamicParams = true;

export function generateStaticParams() {
    return [];
}

type Props = { params: Promise<{ lang: string; city: string; guide: string }> };

async function load(citySlug: string, slug: string) {
    const city = cityBySlug(citySlug);
    if (!city) return null;
    const all = await getCityPlaces(city.slug);
    const areas = areasOf(all);
    const area = areaBySlug(areas, slug);
    if (area) return { city, all, areas, guide: { kind: "area", name: area.name } as const, places: all.filter((p) => p.neighborhood === area.name) };
    const category = categoryFromSlug(slug);
    if (category) return { city, all, areas, guide: { kind: "category", category } as const, places: all.filter((p) => p.category === category) };
    return null;
}

type Loaded = NonNullable<Awaited<ReturnType<typeof load>>>;

function copy({ city, guide, places }: Loaded, locale: Locale) {
    const t = getDictionary(locale);
    if (guide.kind === "area") {
        return {
            title: fill(t.city.whereToGoIn, { area: guide.name }),
            intro: fill(t.city.intro, { count: places.length, area: `${guide.name}, ${city.name}` }),
            path: (l: Locale) => paths.neighborhood(l, city.slug, guide.name),
        };
    }
    return {
        title: fill(t.city.placesIn, { category: plural(guide.category, locale), area: city.name }),
        intro: fill(t.cities.introCategory, { count: places.length, city: city.name }),
        path: (l: Locale) => paths.category(l, city.slug, guide.category),
    };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang, city, guide } = await params;
    if (!isLocale(lang)) return {};
    const data = await load(city, guide);
    if (!data) return {};
    const { title, intro, path } = copy(data, lang);
    return {
        title,
        description: intro,
        alternates: { canonical: path(lang), languages: { fr: path("fr"), en: path("en"), "x-default": path("fr") } },
        robots: data.places.length < 3 ? { index: false, follow: true } : undefined,
    };
}

function Chips({ links }: { links: { href: string; label: string; count: number }[] }) {
    return (
        <ul className="nt-scroll-x -mx-4 gap-2 px-4 md:mx-0 md:flex-wrap md:px-0">
            {links.map((link) => (
                <li key={link.href}>
                    <Link href={link.href} className="nt-chip">
                        {link.label}
                        <span className="font-medium text-muted">{link.count}</span>
                    </Link>
                </li>
            ))}
        </ul>
    );
}

export default async function GuidePage({ params }: Props) {
    const { lang, city: citySlug, guide: slug } = await params;
    if (!isLocale(lang)) notFound();
    const data = await load(citySlug, slug);
    if (!data) notFound();
    const { city, all, areas, guide, places } = data;

    // A category slug from the other language: send to this language's URL.
    if (guide.kind === "category" && categorySlug(guide.category, lang) !== slug) {
        permanentRedirect(paths.category(lang, city.slug, guide.category));
    }

    const t = getDictionary(lang);
    const { title, intro } = copy(data, lang);
    const cityCrumb = { label: city.name, href: paths.city(lang, city.slug) };

    if (guide.kind === "area") {
        return (
            <GuideView
                locale={lang}
                city={city.slug}
                eyebrow={city.name}
                title={title}
                intro={intro}
                crumbs={[cityCrumb, { label: guide.name }]}
                places={places}
                mapQuery={guide.name}
                filters={
                    <Chips
                        links={countBy(places, (p) => p.category).map(([category, count]) => ({
                            href: paths.neighborhoodCategory(lang, city.slug, guide.name, category),
                            label: plural(category, lang),
                            count,
                        }))}
                    />
                }
            >
                <LinkChips
                    title={t.city.otherAreas}
                    links={areas
                        .filter((area) => area.name !== guide.name)
                        .map((area) => ({ href: paths.neighborhood(lang, city.slug, area.name), label: area.name, count: area.count }))}
                />
            </GuideView>
        );
    }

    return (
        <GuideView
            locale={lang}
            city={city.slug}
            eyebrow={city.name}
            title={title}
            intro={intro}
            crumbs={[cityCrumb, { label: plural(guide.category, lang) }]}
            places={places}
            mapQuery={tagLabel(CATEGORIES, guide.category, lang)}
            filters={
                <Chips
                    links={countBy(places, (p) => p.neighborhood).map(([area, count]) => ({
                        href: paths.neighborhoodCategory(lang, city.slug, area, guide.category),
                        label: area,
                        count,
                    }))}
                />
            }
        >
            <LinkChips
                title={fill(t.city.otherCategories, { area: city.name })}
                links={countBy(all, (p) => p.category)
                    .filter(([category]) => category !== guide.category && category !== "Other")
                    .map(([category, count]) => ({ href: paths.category(lang, city.slug, category), label: plural(category, lang), count }))}
            />
        </GuideView>
    );
}
