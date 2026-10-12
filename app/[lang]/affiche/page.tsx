import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Poster from "@/components/poster/Poster";
import PosterPage from "@/components/poster/PosterPage";
import { LOCALES, SITE_URL, getDictionary, isLocale } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";

// The poster of NiceThings itself, for a notice board, a campus, a shop
// window: a question, a QR code, the address.

type Props = { params: Promise<{ lang: string }> };

export function generateStaticParams() {
    return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    return { title: getDictionary(lang).poster.generalMetaTitle, robots: { index: false, follow: false } };
}

export default async function GeneralPosterPage({ params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    const t = getDictionary(lang);

    return (
        <PosterPage title={t.poster.generalTitle} lead={t.poster.generalLead} print={t.poster.print} tips={t.poster.tips}>
            <Poster
                link={`${SITE_URL}${paths.home(lang)}?ref=affiche`}
                eyebrow={t.poster.generalEyebrow}
                title={t.poster.question1}
                accent={t.poster.question2}
                scan={t.poster.generalScan}
                tagline={t.poster.tagline}
                free={t.poster.free}
            />
        </PosterPage>
    );
}
