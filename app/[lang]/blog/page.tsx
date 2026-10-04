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
        <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6 md:pt-10">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

            <header className="mb-6 flex items-end justify-between gap-4">
                <div>
                    <p className="nt-eyebrow">NiceThings</p>
                    <h1 className="mt-1 font-display text-[2.4rem] leading-none font-extrabold tracking-tight md:text-6xl">
                        <span className="nt-sunset-text">{t.blog.title}</span>
                    </h1>
                    <p className="mt-3 max-w-xl text-text-2">{t.blog.lead}</p>
                </div>
                <a href={`/${lang}/blog/rss.xml`} className="hidden items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-bold text-muted hover:text-text sm:inline-flex">
                    <Rss size={14} />
                    {t.blog.rss}
                </a>
            </header>

            {lead && (
                <Link href={paths.post(lang, lead.slug)} className="group relative mb-8 block overflow-hidden rounded-[2rem] bg-ink text-white shadow-float">
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
                            <div className="nt-sunset absolute inset-0" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-ink uppercase">{t.blog.featured}</span>
                                <span
                                    className="rounded-full px-3 py-1 text-xs font-extrabold uppercase"
                                    style={{ background: isTopic(lead.topic) ? TOPICS[lead.topic].tone : "#ff5b36" }}
                                >
                                    {topicLabel(lead.topic, lang)}
                                </span>
                            </div>
                            <h2 className="mt-3 max-w-3xl font-display text-[1.9rem] leading-[1.05] font-extrabold tracking-tight md:text-5xl">
                                {localised(lead, lang).title}
                            </h2>
                            {localised(lead, lang).excerpt && <p className="mt-3 line-clamp-2 max-w-2xl text-white/80 md:text-lg">{localised(lead, lang).excerpt}</p>}
                            <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold">
                                <Clock3 size={15} />
                                {fill(t.blog.readTime, { n: lead.readingMinutes })}
                                <span className="ml-2 inline-flex items-center gap-1 text-brand-400">
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
                <div className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-14 text-center text-white">
                    <div className="nt-sunset absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full opacity-40 blur-3xl" aria-hidden />
                    <span className="nt-sunset relative mx-auto grid h-14 w-14 place-items-center rounded-2xl">
                        <Newspaper size={26} />
                    </span>
                    <p className="relative mt-4 font-display text-xl font-extrabold">{t.blog.empty}</p>
                    <Link href={paths.city(lang, "yaounde")} className="nt-btn relative mt-6 bg-white text-ink">
                        {fill(t.searchPage.guideLink, { city: "Yaoundé" })}
                        <ArrowRight size={17} />
                    </Link>
                </div>
            )}
        </div>
    );
}
