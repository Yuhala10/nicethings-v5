import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Poster from "@/components/poster/Poster";
import PosterPage from "@/components/poster/PosterPage";
import { LOCALES, SITE_URL, getDictionary, isLocale } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";

// The poster for people who have just landed: a hotel desk, a furnished
// flat, a travel agency, the back seat of an airport taxi. Its code opens
// "De retour au pays" with "?ref=aeroport", so every scan is counted as
// coming from there.

type Props = { params: Promise<{ lang: string }> };

export function generateStaticParams() {
    return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    return { title: getDictionary(lang).homecoming.poster.metaTitle, robots: { index: false, follow: false } };
}

export default async function HomecomingPosterPage({ params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    const t = getDictionary(lang);
    const words = t.homecoming.poster;

    return (
        <PosterPage title={words.title} lead={words.lead} print={t.poster.print} tips={words.tips} back={{ href: paths.homecoming(lang), label: t.homecoming.eyebrow }}>
            <Poster
                link={`${SITE_URL}${paths.homecoming(lang)}?ref=aeroport`}
                eyebrow={words.eyebrow}
                title={words.question1}
                accent={words.question2}
                scan={words.scan}
                tagline={t.poster.tagline}
                free={t.poster.free}
            />
        </PosterPage>
    );
}
