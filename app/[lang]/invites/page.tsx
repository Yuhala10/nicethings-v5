import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Camera, MapPin, PenLine } from "lucide-react";
import PostCard from "@/components/blog/PostCard";
import { isGuest } from "@/lib/blog/guest";
import { getPosts, type PostSummary } from "@/lib/blog/server";
import { fill, getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";

// "Carnets d'invités": the notebooks of people outside the team (a chef, a
// creator, a traveller), each under their own name. It is also the page sent
// to someone invited to write one: what they bring, and what the site does
// with it. Until the first notebook is out, the invitation is the page.

export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    const t = getDictionary(lang);
    const path = (locale: Locale) => paths.guests(locale);
    return {
        title: t.guest.metaTitle,
        description: t.guest.metaDescription,
        alternates: { canonical: path(lang), languages: { fr: path("fr"), en: path("en"), "x-default": path("fr") } },
        openGraph: { title: t.guest.metaTitle, description: t.guest.metaDescription, url: path(lang) },
    };
}

export default async function GuestsPage({ params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    const t = getDictionary(lang);
    const notebooks = (await getPosts().catch(() => [])).filter(isGuest);

    // Each guest's notebooks together, the guest who wrote last first.
    const guests = new Map<string, PostSummary[]>();
    for (const post of notebooks) guests.set(post.author, [...(guests.get(post.author) ?? []), post]);
    const steps = [MapPin, Camera, PenLine];

    return (
        <div className="pb-24">
            <header className="mx-auto max-w-6xl px-4 pt-[max(env(safe-area-inset-top),1rem)] md:px-6 md:pt-10">
                <div className="relative overflow-hidden rounded-[2rem] bg-contrast px-6 py-12 text-on-contrast md:px-12 md:py-20">
                    <p className="text-[0.75rem] font-semibold tracking-[0.16em] uppercase opacity-60">{t.guest.pageEyebrow}</p>
                    <h1 className="nt-serif mt-3 max-w-[13ch] text-[2.75rem] leading-[0.98] md:text-[4.5rem]">{t.guest.pageTitle}</h1>
                    <p className="mt-5 max-w-xl text-[1.125rem] leading-relaxed opacity-80">{t.guest.pageLead}</p>
                </div>
            </header>

            {[...guests].map(([author, posts]) => (
                <section key={author} className="mx-auto max-w-6xl px-4 pt-14 md:px-6 md:pt-20">
                    <div className="nt-reveal border-t border-line pt-8 md:pt-10">
                        <p className="nt-eyebrow">{fill(posts.length === 1 ? t.guest.notebookOne : t.guest.notebookMany, { count: posts.length })}</p>
                        <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.05] md:text-[3.5rem]">{author}</h2>
                    </div>
                    <div className="nt-masonry nt-settle mt-8 columns-2 md:columns-4">
                        {posts.map((post) => (
                            <div key={post.id}>
                                <PostCard post={post} locale={lang} />
                            </div>
                        ))}
                    </div>
                </section>
            ))}

            {/* ---------------- For someone invited to write one ---------------- */}
            <section className="mx-auto max-w-6xl px-4 pt-14 md:px-6 md:pt-24">
                <div className="nt-reveal max-w-2xl">
                    <p className="nt-eyebrow">{t.guest.howEyebrow}</p>
                    <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.05] md:text-[3.5rem]">{t.guest.howTitle}</h2>
                    <p className="mt-3 text-[1rem] leading-relaxed text-muted">{t.guest.howLead}</p>
                </div>
                <ol className="nt-reveal mt-8 grid gap-px overflow-hidden rounded-[1.6rem] border border-line bg-line md:grid-cols-3">
                    {t.guest.steps.map((step, index) => {
                        const Icon = steps[index] ?? PenLine;
                        return (
                            <li key={step.title} className="bg-bg p-6 md:p-8">
                                <span className="flex items-center gap-3 text-brand-600">
                                    <span className="nt-serif text-[1.5rem] leading-none">{index + 1}</span>
                                    <Icon size={20} strokeWidth={1.7} />
                                </span>
                                <p className="nt-serif mt-5 text-[1.5rem] leading-tight">{step.title}</p>
                                <p className="mt-2 text-[1rem] leading-relaxed text-muted">{step.body}</p>
                            </li>
                        );
                    })}
                </ol>
                <div className="nt-reveal mt-4 flex flex-col justify-between gap-6 rounded-[1.6rem] bg-surface-2 p-6 md:flex-row md:items-center md:p-8">
                    <p className="max-w-xl text-[1rem] leading-relaxed text-text-2">{t.guest.rule}</p>
                    <Link href={`${paths.about(lang)}#contact`} className="nt-btn nt-btn-primary shrink-0">
                        {t.guest.propose}
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </section>
        </div>
    );
}
