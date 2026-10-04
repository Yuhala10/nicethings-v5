import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClaimWizard from "@/components/pro/ClaimWizard";
import { fill, getDictionary, isLocale } from "@/lib/i18n";
import { getPlacesBySlugs } from "@/lib/places/server";

type Props = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang, slug } = await params;
    if (!isLocale(lang)) return {};
    const [place] = await getPlacesBySlugs([slug]).catch(() => []);
    return { title: place ? fill(getDictionary(lang).claim.title, { name: place.name }) : undefined, robots: { index: false, follow: false } };
}

export default async function ClaimPage({ params }: Props) {
    const { lang, slug } = await params;
    if (!isLocale(lang)) notFound();
    const [place] = await getPlacesBySlugs([slug]).catch(() => []);
    if (!place) notFound();
    return <ClaimWizard place={place} />;
}
