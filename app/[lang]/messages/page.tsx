import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Inbox from "@/components/chat/Inbox";
import BackButton from "@/components/site/BackButton";
import { getDictionary, isLocale } from "@/lib/i18n";

// "Messages": one's conversations. The page is the same for everyone; the
// browser fills it in for the member signed in.

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    return { title: getDictionary(lang).people.chat.title, robots: { index: false, follow: false } };
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    const words = getDictionary(lang).people.chat;
    return (
        <div className="mx-auto max-w-2xl px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-28 md:px-6 md:pt-8">
            <BackButton className="mb-4 border border-line !bg-surface !shadow-none !backdrop-blur-none" />
            <h1 className="nt-serif text-[2.4rem] leading-none">{words.title}</h1>
            <p className="mt-2 text-text-2">{words.lead}</p>
            <Inbox />
        </div>
    );
}
