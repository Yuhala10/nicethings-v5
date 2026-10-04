import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import GuideView, { CategoryIcon, countBy, plural, sortForGuide } from "@/components/guide/GuideView";
import PinCard from "@/components/place/PinCard";
import { cityBySlug } from "@/lib/cities";
import { fill, getDictionary, isLocale } from "@/lib/i18n";
import { areasOf } from "@/lib/places/areas";
import { paths } from "@/lib/places/paths";
import { getCityPlaces } from "@/lib/places/server";

export const revalidate = 300;
export const dynamicParams = true;

export function generateStaticParams() {
    return [];
}

type Props = { params: Promise<{ lang: string; city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang, city: slug } = await params;
    const city = cityBySlug(slug);
    if (!isLocale(lang) || !city) return {};
    const t = getDictionary(lang);
    const count = (await getCityPlaces(city.slug)).length;
    const path = (l: "fr" | "en") => paths.city(l, city.slug);
    return {
        title: fill(t.cities.guideTitle, { city: city.name }),
        description: fill(t.cities.guideDescription, { city: city.name, count }),
        alternates: { canonical: path(lang), languages: { fr: path("fr"), en: path("en"), "x-default": path("fr") } },
        robots: count < 3 ? { index: false, follow: true } : undefined,
    };
}

export default async function CityPage({ params }: Props) {
    const { lang, city: slug } = await params;
    const city = cityBySlug(slug);
    if (!isLocale(lang) || !city) notFound();
    const t = getDictionary(lang);
    const places = await getCityPlaces(city.slug);

    const categories = countBy(places, (place) => place.category).filter(([category]) => category !== "Other");
    const areas = areasOf(places, 2);
    // Photos first: they make the board.
    const picks = sortForGuide(places)
        .slice(0, 24)
        .sort((a, b) => Number(Boolean(b.cover)) - Number(Boolean(a.cover)))
        .slice(0, 12);

    return (
        <GuideView
            locale={lang}
            city={city.slug}
            eyebrow={`${city.name} · ${city.region[lang]}`}
            title={fill(t.cities.guideTitle, { city: city.name })}
            intro={`${city.tagline[lang]}. ${fill(t.cities.guideLead, { count: places.length })}`}
            stats={[
                { value: String(places.length), label: t.cities.statPlaces },
                { value: String(areas.length), label: t.cities.statAreas },
                { value: String(categories.length), label: t.cities.statKinds },
            ]}
            crumbs={[{ label: t.nav.home, href: paths.home(lang) }, { label: city.name }]}
            places={null}
            mapQuery=""
            filters={
                <>
                    {categories.length > 0 && (
                        <section className="nt-reveal mt-4">
                            <h2 className="nt-section-title mb-4">{t.city.categories}</h2>
                            <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                                {categories.map(([category, count]) => (
                                    <li key={category}>
                                        <Link
                                            href={paths.category(lang, city.slug, category)}
                                            className="nt-pressable flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card"
                                        >
                                            <CategoryIcon category={category} />
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-bold">{plural(category, lang)}</span>
                                                <span className="text-xs text-muted">{fill(t.city.placesCount, { count })}</span>
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {areas.length > 0 && (
                        <section className="nt-reveal mt-12">
                            <h2 className="nt-section-title mb-4">{t.city.neighborhoods}</h2>
                            <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                                {areas.map((area) => (
                                    <li key={area.name}>
                                        <Link
                                            href={paths.neighborhood(lang, city.slug, area.name)}
                                            className="nt-pressable flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card"
                                        >
                                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-700/25 dark:text-brand-200">
                                                <MapPin size={18} />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-bold">{area.name}</span>
                                                <span className="text-xs text-muted">{fill(t.city.placesCount, { count: area.count })}</span>
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </>
            }
        >
            {picks.length > 0 && (
                <section className="nt-reveal mt-12">
                    <h2 className="nt-section-title mb-4">{t.city.ideas}</h2>
                    <ul className="nt-masonry columns-2 md:columns-4">
                        {picks.map((place, index) => (
                            <li key={place.id}>
                                <PinCard place={place} priority={index < 2} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </GuideView>
    );
}
