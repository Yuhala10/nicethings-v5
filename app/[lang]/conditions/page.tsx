import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalPage from "@/components/legal/LegalPage";
import { isLocale } from "@/lib/i18n";
import { TERMS } from "@/lib/legal";
import { paths } from "@/lib/places/paths";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    return { title: TERMS[lang].title, alternates: { canonical: paths.terms(lang) } };
}

export default async function Page({ params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    return <LegalPage doc={TERMS[lang]} />;
}
