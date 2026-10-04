import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import ProHome from "@/components/pro/ProHome";
import { getDictionary, isLocale } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    const t = getDictionary(lang);
    return {
        title: { absolute: t.pro.metaTitle },
        description: t.pro.heroLead,
        alternates: { canonical: paths.pro(lang), languages: { fr: paths.pro("fr"), en: paths.pro("en") } },
    };
}

export default async function ProPage({ params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    return (
        <Suspense>
            <ProHome />
        </Suspense>
    );
}
