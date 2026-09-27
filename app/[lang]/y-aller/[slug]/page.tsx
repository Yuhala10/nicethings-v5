import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Directions from "@/components/route/Directions";
import { getDictionary, isLocale } from "@/lib/i18n";
import { getPlace } from "@/lib/places/server";

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

    return (
        <Directions
            place={{
                id: place.id,
                name: place.name,
                lat: place.lat,
                lng: place.lng,
                neighborhood: place.neighborhood,
                landmark: place.landmark,
            }}
        />
    );
}
