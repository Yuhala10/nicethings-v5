import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KwatPage } from "@/components/people/KwatFeed";
import BackButton from "@/components/site/BackButton";
import { getDictionary, isLocale } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";

// "Ça bouge au kwat": everything members give, as it happens. The page is
// the same for everyone; the browser fills it with the visitor's city.

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    const words = getDictionary(lang).people.kwat;
    return { title: words.metaTitle, description: words.lead, alternates: { canonical: paths.kwat(lang) } };
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    return (
        <div className="mx-auto max-w-3xl px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-28 md:px-6 md:pt-8">
            <BackButton className="mb-4 border border-line !bg-surface !shadow-none !backdrop-blur-none" />
            <KwatPage />
        </div>
    );
}
