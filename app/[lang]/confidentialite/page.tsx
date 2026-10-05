import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalPage from "@/components/legal/LegalPage";
import { isLocale } from "@/lib/i18n";
import { PRIVACY } from "@/lib/legal";
import { paths } from "@/lib/places/paths";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    // Readable by everyone, but kept out of search results: a legal page
    // should never be what shows up when someone searches for NiceThings.
    return { title: PRIVACY[lang].title, alternates: { canonical: paths.privacy(lang) }, robots: { index: false, follow: true } };
}

export default async function Page({ params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    return <LegalPage doc={PRIVACY[lang]} />;
}
