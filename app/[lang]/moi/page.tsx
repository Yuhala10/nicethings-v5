import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MePage from "@/components/people/MePage";
import BackButton from "@/components/site/BackButton";
import { getDictionary, isLocale } from "@/lib/i18n";

// "Moi": one's own profile, or the invitation to make one. The page itself
// is the same for everyone; the browser fills it in.

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    return { title: getDictionary(lang).people.me.title, robots: { index: false, follow: true } };
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    return (
        <div className="mx-auto max-w-3xl px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-28 md:px-6 md:pt-8">
            <BackButton className="mb-4 border border-line !bg-surface !shadow-none !backdrop-blur-none" />
            <MePage />
        </div>
    );
}
