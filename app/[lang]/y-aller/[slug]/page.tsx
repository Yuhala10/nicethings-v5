import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Navigator from "@/components/route/Navigator";
import { DEFAULT_CITY, cityBySlug } from "@/lib/cities";
import { getDictionary, isLocale } from "@/lib/i18n";
import { areasOf } from "@/lib/places/areas";
import { getCityPlaces, getPlace } from "@/lib/places/server";

export const revalidate = 300;
export const dynamicParams = true;

export function generateStaticParams() {
    return [];
}

type Props = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang, slug } = await params;
    if (!isLocale(lang)) return {};
    const place = await getPlace(slug);
    if (!place) return {};
    return {
        title: `${getDictionary(lang).route.title} · ${place.name}`,
        robots: { index: false, follow: true },
    };
}

export default async function DirectionsPage({ params }: Props) {
    const { lang, slug } = await params;
    if (!isLocale(lang)) notFound();
    const place = await getPlace(slug);
    if (!place) notFound();
    const city = cityBySlug(place.city) ?? DEFAULT_CITY;
    const areas = areasOf(await getCityPlaces(city.slug), 2).map(({ name, lat, lng }) => ({ name, lat, lng }));

    return (
        <Suspense>
            <Navigator
                place={{
                    id: place.id,
                    slug: place.slug,
                    name: place.name,
                    category: place.category,
                    lat: place.lat,
                    lng: place.lng,
                    neighborhood: place.neighborhood,
                    landmark: place.landmark,
                }}
                city={city}
                areas={areas}
            />
        </Suspense>
    );
}
