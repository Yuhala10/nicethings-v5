import type { Metadata } from "next";
import SavedList from "@/components/saved/SavedList";
import { getDictionary, isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    // Personal page: nothing for search engines.
    return { title: getDictionary(lang).saved.title, robots: { index: false, follow: true } };
}

export default function SavedPage() {
    return <SavedList />;
}
