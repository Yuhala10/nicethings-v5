import type { Metadata } from "next";
import { notFound } from "next/navigation";
import OwnerDashboard from "@/components/pro/OwnerDashboard";
import { getDictionary, isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    return { title: getDictionary(lang).pro.title, robots: { index: false, follow: false } };
}

export default async function ManagePage({ params }: Props) {
    const { lang, slug } = await params;
    if (!isLocale(lang) || !/^[a-z0-9-]{1,200}$/.test(slug)) notFound();
    return <OwnerDashboard slug={slug} />;
}
