import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SubmitForm from "@/components/submit/SubmitForm";
import { getDictionary, isLocale } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    const t = getDictionary(lang);
    return {
        title: t.submit.title,
        description: t.submit.lead,
        alternates: { canonical: paths.submit(lang) },
    };
}

export default async function SubmitPage({ params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    const t = getDictionary(lang);

    return (
        <div className="mx-auto max-w-2xl px-4 pt-6 md:px-6 md:pt-10">
            <h1 className="text-[1.9rem] leading-tight font-extrabold md:text-4xl">{t.submit.title}</h1>
            <p className="mt-2 mb-8 text-text-2">{t.submit.lead}</p>
            <SubmitForm />
        </div>
    );
}
