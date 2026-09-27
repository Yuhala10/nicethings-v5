import type { Metadata } from "next";
import Explorer from "@/components/explore/Explorer";
import { getDictionary, isLocale } from "@/lib/i18n";
import { compactPlaces } from "@/lib/places/compact";
import { getAllPlaces } from "@/lib/places/server";

type Props = {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
    const { lang } = await params;
    const { q } = await searchParams;
    if (!isLocale(lang)) return {};
    const t = getDictionary(lang);
    return {
        title: q ? `${t.search.resultsFor} « ${q} »` : t.nav.search,
        // Search result pages are infinite and thin: keep them out of Google.
        robots: { index: false, follow: true },
    };
}

export default async function SearchPage({ params, searchParams }: Props) {
    const { lang } = await params;
    const { q = "" } = await searchParams;
    if (!isLocale(lang)) return null;
    const places = await getAllPlaces();

    return <Explorer places={compactPlaces(places)} initialText={q.slice(0, 200)} autoFocusSearch={!q} />;
}
