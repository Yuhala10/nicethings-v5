import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Poster from "@/components/poster/Poster";
import PosterPage from "@/components/poster/PosterPage";
import { SITE_URL, fill, getDictionary, isLocale } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import { getPlace } from "@/lib/places/server";

// A place's poster: its name, its QR code, ready to print and put at the
// counter. For the owner of the place and for the team; not for search
// engines.

export const revalidate = 300;

type Props = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang, slug } = await params;
    if (!isLocale(lang)) return {};
    const place = await getPlace(slug);
    if (!place) return {};
    return { title: fill(getDictionary(lang).poster.metaTitle, { name: place.name }), robots: { index: false, follow: false } };
}

export default async function PlacePosterPage({ params }: Props) {
    const { lang, slug } = await params;
    if (!isLocale(lang)) notFound();
    const place = await getPlace(slug);
    if (!place) notFound();
    const t = getDictionary(lang);

    return (
        <PosterPage title={t.poster.placeTitle} lead={t.poster.placeLead} print={t.poster.print} tips={t.poster.tips} back={{ href: paths.place(lang, slug), label: t.poster.back }}>
            <Poster
                link={`${SITE_URL}${paths.place(lang, slug)}?ref=affiche`}
                eyebrow={t.poster.placeEyebrow}
                title={place.name}
                verified={place.verified ? t.poster.verified : null}
                scan={t.poster.placeScan}
                tagline={t.poster.tagline}
                free={t.poster.free}
            />
        </PosterPage>
    );
}
