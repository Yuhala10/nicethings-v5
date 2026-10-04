import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import GuideView from "@/components/guide/GuideView";
import { cityBySlug } from "@/lib/cities";
import { fill, getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { availableCollections, placesIn } from "@/lib/places/collections";
import { paths } from "@/lib/places/paths";
import { getCityPlaces } from "@/lib/places/server";

// Every collection a city can fill: /fr/yaounde/selection.

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
    const count = availableCollections(await getCityPlaces(city.slug)).length;
    const path = (l: Locale) => paths.collections(l, city.slug);
    return {
        title: fill(t.city.collectionsIn, { city: city.name }),
        description: t.city.collectionsLead,
        alternates: { canonical: path(lang), languages: { fr: path("fr"), en: path("en"), "x-default": path("fr") } },
        robots: count === 0 ? { index: false, follow: true } : undefined,
    };
}

export default async function CollectionsPage({ params }: Props) {
    const { lang, city: slug } = await params;
    const city = cityBySlug(slug);
    if (!isLocale(lang) || !city) notFound();
    const t = getDictionary(lang);
    const places = await getCityPlaces(city.slug);
    const collections = availableCollections(places);

    return (
        <GuideView
            locale={lang}
            city={city.slug}
            eyebrow={city.name}
            title={fill(t.city.collectionsIn, { city: city.name })}
            intro={t.city.collectionsLead}
            crumbs={[{ label: city.name, href: paths.city(lang, city.slug) }, { label: t.city.collections }]}
            places={null}
            mapQuery=""
        >
            {collections.length === 0 ? (
                <div className="mt-4 rounded-[1.6rem] border border-dashed border-line-strong px-6 py-14 text-center">
                    <p className="nt-serif text-[1.7rem]">{t.city.emptyTitle}</p>
                    <Link href={paths.city(lang, city.slug)} className="nt-btn nt-btn-outline mt-6">
                        {fill(t.searchPage.guideLink, { city: city.name })}
                    </Link>
                </div>
            ) : (
                <ul className="mt-2 grid gap-3 md:grid-cols-2">
                    {collections.map(({ collection, count }) => {
                        const sample = placesIn(collection, places).slice(0, 3);
                        return (
                            <li key={collection.key}>
                                <Link
                                    href={paths.collection(lang, city.slug, collection)}
                                    className="nt-pressable group flex h-full flex-col justify-between gap-6 rounded-[1.25rem] border border-line bg-surface p-5"
                                >
                                    <span>
                                        <span className="nt-serif block text-[1.75rem]">{collection.name[lang]}</span>
                                        <span className="mt-1.5 block text-[0.9rem] leading-relaxed text-muted">{collection.blurb[lang]}</span>
                                    </span>
                                    <span className="flex items-end justify-between gap-4 text-[0.82rem]">
                                        <span className="min-w-0 truncate text-text-2">{sample.map((place) => place.name).join(" · ")}</span>
                                        <span className="flex shrink-0 items-center gap-1.5 font-semibold">
                                            {fill(t.city.placesCount, { count })}
                                            <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </GuideView>
    );
}
