import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ChatView from "@/components/chat/ChatView";
import { getDictionary, isLocale } from "@/lib/i18n";
import { normalizeHandle } from "@/lib/people/rules";

// A conversation with one member, on the whole screen (no tab bar: see
// components/site/SiteChrome.tsx). Filled in by the browser.

type Props = { params: Promise<{ lang: string; handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang, handle } = await params;
    if (!isLocale(lang)) return {};
    return { title: `@${normalizeHandle(decodeURIComponent(handle))} · ${getDictionary(lang).people.chat.title}`, robots: { index: false, follow: false } };
}

export default async function Page({ params }: Props) {
    const { lang, handle } = await params;
    if (!isLocale(lang)) notFound();
    const name = normalizeHandle(decodeURIComponent(handle));
    if (!name) notFound();
    return <ChatView handle={name} />;
}
