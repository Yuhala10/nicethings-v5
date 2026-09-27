import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import GuideView, { CategoryIcon, countBy, plural, sortForGuide } from "@/components/guide/GuideView";
import PlaceCard from "@/components/place/PlaceCard";
import { fill, getDictionary, isLocale } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import { getAllPlaces } from "@/lib/places/server";
import { notFound } from "next/navigation";

export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    const t = getDictionary(lang);
    return {
        title: t.city.heroTitle,
        description: t.city.heroLead,
        alternates: { canonical: paths.city(lang), languages: { fr: paths.city("fr"), en: paths.city("en"), "x-default": paths.city("fr") } },
    };
}

export default async function CityPage({ params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    const t = getDictionary(lang);
    const places = await getAllPlaces();

    const categories = countBy(places, (place) => place.category).filter(([category]) => category !== "Other");
    const areas = countBy(places, (place) => place.neighborhood);
    const picks = sortForGuide(places).slice(0, 8);

    return (
        <GuideView
            locale={lang}
            title={t.city.heroTitle}
            intro={`${t.city.heroLead} ${fill(t.city.placesCount, { count: places.length })}.`}
            crumbs={[{ label: t.nav.home, href: paths.explore(lang) }, { label: t.city.title }]}
            places={null}
            mapQuery=""
            filters={
                <>
                    <section className="mt-8">
                        <h2 className="nt-section-title mb-3">{t.city.categories}</h2>
                        <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                            {categories.map(([category, count]) => (
                                <li key={category}>
                                    <Link
                                        href={paths.category(lang, category)}
                                        className="nt-pressable flex items-center gap-3 rounded-2xl border border-line bg-surface p-3"
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

                    <section className="mt-10">
                        <h2 className="nt-section-title mb-3">{t.city.neighborhoods}</h2>
                        <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                            {areas.map(([area, count]) => (
                                <li key={area}>
                                    <Link
                                        href={paths.neighborhood(lang, area)}
                                        className="nt-pressable flex items-center gap-3 rounded-2xl border border-line bg-surface p-3"
                                    >
                                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-700/20">
                                            <MapPin size={18} />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-bold">{area}</span>
                                            <span className="text-xs text-muted">{fill(t.city.placesCount, { count })}</span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                </>
            }
        >
            {picks.length > 0 && (
                <section className="mt-12">
                    <h2 className="nt-section-title mb-4">{t.city.ideas}</h2>
                    <ul className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-4 md:gap-x-5">
                        {picks.map((place) => (
                            <li key={place.id}>
                                <PlaceCard place={place} className="w-full" />
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </GuideView>
    );
}
