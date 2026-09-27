import type { Metadata } from "next";
import Explorer from "@/components/explore/Explorer";
import { getDictionary, isLocale } from "@/lib/i18n";
import { compactPlaces } from "@/lib/places/compact";
import { getAllPlaces } from "@/lib/places/server";

export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    const t = getDictionary(lang);
    return { title: { absolute: t.meta.defaultTitle }, description: t.meta.defaultDescription };
}

export default async function ExplorePage({ params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) return null;
    const places = await getAllPlaces();

    return <Explorer places={compactPlaces(places)} />;
}
