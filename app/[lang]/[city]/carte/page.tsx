import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import MapScreen from "@/components/map/MapScreen";
import { CITIES, cityBySlug } from "@/lib/cities";
import { fill, getDictionary, isLocale } from "@/lib/i18n";
import { areasOf } from "@/lib/places/areas";
import { compactPlaces } from "@/lib/places/compact";
import { paths } from "@/lib/places/paths";
import { getCityCounts, getCityPlaces } from "@/lib/places/server";

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
    return {
        title: fill(t.cities.mapTitle, { city: city.name }),
        description: fill(t.cities.mapDescription, { city: city.name }),
        alternates: {
            canonical: paths.explore(lang, city.slug),
            languages: { fr: paths.explore("fr", city.slug), en: paths.explore("en", city.slug), "x-default": paths.explore("fr", city.slug) },
        },
    };
}

export default async function CityMapPage({ params }: Props) {
    const { lang, city: slug } = await params;
    const city = cityBySlug(slug);
    if (!isLocale(lang) || !city) notFound();

    const [places, counts] = await Promise.all([getCityPlaces(city.slug), getCityCounts()]);
    // The ?q= query is read in the browser, so this page stays cached.
    return (
        <Suspense>
            <MapScreen
                places={compactPlaces(places)}
                city={city}
                areas={areasOf(places, 2)}
                cityCounts={counts}
            />
        </Suspense>
    );
}
