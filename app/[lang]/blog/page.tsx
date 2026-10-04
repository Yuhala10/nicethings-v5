import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock3, Newspaper, Rss } from "lucide-react";
import BlogIndex from "@/components/blog/BlogIndex";
import PostCard from "@/components/blog/PostCard";
import { getPosts, localised } from "@/lib/blog/server";
import { TOPICS, isTopic, topicLabel } from "@/lib/blog/topics";
import { paths } from "@/lib/places/paths";
import { SITE_URL, fill, getDictionary, isLocale } from "@/lib/i18n";

export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    const t = getDictionary(lang);
    return {
        title: { absolute: t.blog.metaTitle },
        description: t.blog.lead,
        alternates: {
            canonical: paths.blog(lang),
            languages: { fr: "/fr/blog", en: "/en/blog", "x-default": "/fr/blog" },
            types: { "application/rss+xml": `/${lang}/blog/rss.xml` },
        },
    };
}

export default async function BlogPage({ params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    const t = getDictionary(lang);
    const posts = await getPosts().catch(() => []);
    const lead = posts.find((post) => post.featured) ?? posts[0];
    const rest = posts.filter((post) => post !== lead);
    const cards = Object.fromEntries(rest.map((post, index) => [post.id, <PostCard key={post.id} post={post} locale={lang} priority={index < 4} />]));

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Blog",
        name: t.blog.metaTitle,
        url: `${SITE_URL}/${lang}/blog`,
        inLanguage: lang === "fr" ? "fr-CM" : "en-CM",
        blogPost: posts.slice(0, 20).map((post) => ({
            "@type": "BlogPosting",
            headline: localised(post, lang).title,
            url: `${SITE_URL}${paths.post(lang, post.slug)}`,
            datePublished: post.publishedAt,
            image: post.cover ?? undefined,
        })),
    };

    return (
        <div className="mx-auto max-w-6xl px-4 pt-[max(env(safe-area-inset-top),1.5rem)] md:px-6 md:pt-12">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

            <header className="mb-8 flex items-end justify-between gap-4 md:mb-10">
                <div>
                    <p className="nt-eyebrow">NiceThings</p>
                    <h1 className="nt-serif mt-2 text-[3rem] leading-none md:text-[5rem]">{t.blog.title}</h1>
                    <p className="mt-4 max-w-xl leading-relaxed text-text-2">{t.blog.lead}</p>
                </div>
                <a href={`/${lang}/blog/rss.xml`} className="hidden items-center gap-1.5 rounded-full border border-line-strong px-3 py-2 text-xs font-semibold text-muted hover:text-text sm:inline-flex">
                    <Rss size={14} />
                    {t.blog.rss}
                </a>
            </header>

            {lead && (
                <Link href={paths.post(lang, lead.slug)} className="group relative mb-10 block overflow-hidden rounded-[1.6rem] bg-[#15110e] text-white">
                    <div className="relative aspect-[4/5] sm:aspect-[16/9] md:aspect-[21/9]">
                        {lead.cover ? (
                            <Image
                                src={lead.cover}
                                alt={lead.coverAlt ?? localised(lead, lang).title}
                                fill
                                priority
                                sizes="(min-width: 1152px) 1152px, 100vw"
                                className="object-cover transition duration-700 group-hover:scale-[1.03]"
                            />
                        ) : (
                            <div className="nt-art absolute inset-0" style={{ "--tone": isTopic(lead.topic) ? TOPICS[lead.topic].tone : "#c0471b" } as React.CSSProperties} />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-white px-3 py-1 text-[0.66rem] font-semibold tracking-[0.1em] text-[#1b1612] uppercase">{t.blog.featured}</span>
                                <span className="rounded-full border border-white/30 px-3 py-1 text-[0.66rem] font-semibold tracking-[0.1em] uppercase">{topicLabel(lead.topic, lang)}</span>
                            </div>
                            <h2 className="nt-serif mt-4 max-w-3xl text-[2.3rem] leading-[1.02] md:text-[3.8rem]">
                                {localised(lead, lang).title}
                            </h2>
                            {localised(lead, lang).excerpt && <p className="mt-3 line-clamp-2 max-w-2xl text-white/80 md:text-lg">{localised(lead, lang).excerpt}</p>}
                            <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
                                <Clock3 size={15} />
                                {fill(t.blog.readTime, { n: lead.readingMinutes })}
                                <span className="ml-2 inline-flex items-center gap-1 text-white">
                                    {t.blog.readMore}
                                    <ArrowRight size={15} className="transition group-hover:translate-x-1" />
                                </span>
                            </p>
                        </div>
                    </div>
                </Link>
            )}

            {rest.length > 0 && <BlogIndex posts={rest} cards={cards} />}
            {!lead && (
                <div className="rounded-[1.6rem] border border-dashed border-line-strong px-6 py-16 text-center">
                    <Newspaper size={24} strokeWidth={1.6} className="mx-auto text-muted" />
                    <p className="nt-serif mx-auto mt-4 max-w-md text-[1.9rem] leading-tight">{t.blog.empty}</p>
                    <Link href={paths.city(lang, "yaounde")} className="nt-btn nt-btn-outline mt-7">
                        {fill(t.searchPage.guideLink, { city: "Yaoundé" })}
                        <ArrowRight size={17} />
                    </Link>
                </div>
            )}
        </div>
    );
}
