import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import EditorialSection from "@/components/editorial/EditorialSection";
import GuideView, { CategoryIcon, countBy, plural, sortForGuide } from "@/components/guide/GuideView";
import PinCard from "@/components/place/PinCard";
import { CITIES, cityBySlug } from "@/lib/cities";
import { fill, getDictionary, isLocale } from "@/lib/i18n";
import { areasOf } from "@/lib/places/areas";
import { availableCollections } from "@/lib/places/collections";
import { editorialRails } from "@/lib/places/editorial";
import { paths } from "@/lib/places/paths";
import { getCityPlaces } from "@/lib/places/server";

export const revalidate = 300;
export const dynamicParams = true;

// Every city is built at deploy time (once per language), so the first
// visitor after a deploy never waits; new cities still render on demand.
export function generateStaticParams() {
    return CITIES.map((city) => ({ city: city.slug }));
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
    const rails = editorialRails(places, city, lang, { limit: 6 });
    const collections = availableCollections(places);
    // Small towns without enough for sections still get a board of places.
    const picks =
        rails.length < 2
            ? sortForGuide(places)
                  .slice(0, 24)
                  .sort((a, b) => Number(Boolean(b.cover)) - Number(Boolean(a.cover)))
                  .slice(0, 12)
            : [];

    return (
        <GuideView
            locale={lang}
            city={city.slug}
            eyebrow={`${city.region[lang]}`}
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
            editorial={
                rails.length > 0 && (
                    <div className="pt-6">
                        {rails.map((rail, index) => (
                            <EditorialSection key={rail.key} rail={rail} locale={lang} priority={index === 0} />
                        ))}
                    </div>
                )
            }
            filters={
                <>
                    {collections.length > 0 && (
                        <section className="nt-reveal mt-6">
                            <h2 className="nt-section-title">{fill(t.city.collectionsIn, { city: city.name })}</h2>
                            <p className="mt-1.5 text-[0.92rem] text-muted">{t.city.collectionsLead}</p>
                            <ul className="mt-5 flex flex-wrap gap-2">
                                {collections.map(({ collection, count }) => (
                                    <li key={collection.key}>
                                        <Link href={paths.collection(lang, city.slug, collection)} className="nt-chip">
                                            {collection.name[lang]}
                                            <span className="font-normal text-muted">{count}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {categories.length > 0 && (
                        <section className="nt-reveal mt-14">
                            <h2 className="nt-section-title mb-5">{t.city.categories}</h2>
                            <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
                                {categories.map(([category, count]) => (
                                    <li key={category}>
                                        <Link
                                            href={paths.category(lang, city.slug, category)}
                                            className="nt-pressable flex items-center gap-3 rounded-[1.1rem] border border-line bg-surface p-3"
                                        >
                                            <CategoryIcon category={category} />
                                            <span className="min-w-0">
                                                <span className="block truncate text-[0.9rem] font-semibold">{plural(category, lang)}</span>
                                                <span className="text-xs text-muted">{fill(t.city.placesCount, { count })}</span>
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {areas.length > 0 && (
                        <section className="nt-reveal mt-14">
                            <h2 className="nt-section-title mb-5">{t.city.neighborhoods}</h2>
                            <ul className="flex flex-wrap gap-2">
                                {areas.map((area) => (
                                    <li key={area.name}>
                                        <Link href={paths.neighborhood(lang, city.slug, area.name)} className="nt-chip">
                                            <MapPin size={14} className="text-muted" />
                                            {area.name}
                                            <span className="font-normal text-muted">{area.count}</span>
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
                <section className="nt-reveal mt-14">
                    <h2 className="nt-section-title mb-5">{t.city.ideas}</h2>
                    <ul className="nt-masonry columns-2 md:columns-4">
                        {picks.map((place, index) => (
                            <li key={place.id}>
                                <PinCard place={place} priority={index < 2} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <Link
                href={paths.search(lang, city.slug)}
                className="nt-reveal nt-pressable group mt-14 flex items-center justify-between gap-4 rounded-[1.25rem] border border-line bg-surface p-5"
            >
                <span>
                    <span className="nt-serif block text-[1.6rem]">{fill(t.searchPage.title, { city: city.name })}</span>
                    <span className="mt-1 block text-[0.9rem] text-muted">{fill(t.searchPage.subtitle, { count: places.length, city: city.name })}</span>
                </span>
                <ArrowRight size={20} className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
        </GuideView>
    );
}
