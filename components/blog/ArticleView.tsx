import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, Languages } from "lucide-react";
import FounderPortrait from "@/components/site/FounderPortrait";
import { expandBlocks, outline, placesIn, plainText } from "@/lib/blog/blocks";
import { getPosts, localised, type Post } from "@/lib/blog/server";
import { TOPICS, isTopic, topicLabel } from "@/lib/blog/topics";
import { cityBySlug } from "@/lib/cities";
import { FOUNDER, ORGANIZATION_ID, founderJsonLd, isFounder } from "@/lib/founder";
import { SITE_URL, fill, getDictionary, type Locale } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import { getPlacesBySlugs } from "@/lib/places/server";
import type { PlaceSummary } from "@/lib/places/types";
import { postShareImage } from "@/lib/share-image";
import ArticleBody from "./ArticleBody";
import ArticleMap from "./ArticleMap";
import PostCard from "./PostCard";
import ReadingProgress from "./ReadingProgress";
import ShareBar from "./ShareBar";

function formatDate(iso: string, locale: Locale) {
    return new Date(iso).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Douala" });
}

// A full article: immersive cover, contents, live place cards, the map of
// every place mentioned, sharing and related reads.
export default async function ArticleView({ post, lang, preview = false }: { post: Post; lang: Locale; preview?: boolean }) {
    const slug = post.slug;
    const t = getDictionary(lang);

    const { title, excerpt, translated } = localised(post, lang);
    // Text pasted as one block is opened up into paragraphs and titles.
    const blocks = expandBlocks(lang === "en" && post.body.en.length && post.title.en ? post.body.en : post.body.fr);
    const places = await getPlacesBySlugs(placesIn(blocks)).catch((): PlaceSummary[] => []);
    const placeMap = new Map(places.map((place) => [place.slug, place] as const));
    const contents = outline(blocks);
    const tone = isTopic(post.topic) ? TOPICS[post.topic].tone : "#ff5b36";
    const city = cityBySlug(post.city);
    const shareImage = postShareImage(post, lang).url;
    const byFounder = isFounder(post.author);

    const all = await getPosts().catch(() => []);
    const related = all
        .filter((other) => other.id !== post.id)
        .map((other) => ({
            other,
            score: (other.topic === post.topic ? 2 : 0) + (other.city && other.city === post.city ? 2 : 0) + other.places.filter((place) => post.places.includes(place)).length,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map((item) => item.other);

    const url = `${SITE_URL}${paths.post(lang, slug)}`;
    const jsonLd = [
        {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: title,
            description: excerpt || undefined,
            image: post.cover ? [post.cover] : undefined,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt,
            inLanguage: translated && lang === "en" ? "en" : "fr",
            // A person when the founder signed it: search engines then credit
            // the article to them, not to an anonymous team.
            author: byFounder ? founderJsonLd(`${SITE_URL}${paths.about(lang)}`, lang) : { "@type": "Organization", name: post.author },
            publisher: { "@type": "Organization", "@id": ORGANIZATION_ID, name: "NiceThings", logo: { "@type": "ImageObject", url: `${SITE_URL}/icons/icon-512.png` } },
            mainEntityOfPage: url,
            wordCount: blocks.map((block) => ("text" in block ? plainText(block.text) : "")).join(" ").split(/\s+/).filter(Boolean).length,
        },
        places.length > 0 && {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: t.blog.places,
            itemListElement: places.map((place, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: place.name,
                url: `${SITE_URL}${paths.place(lang, place.slug)}`,
            })),
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
                { "@type": "ListItem", position: 1, name: "NiceThings", item: `${SITE_URL}/${lang}` },
                { "@type": "ListItem", position: 2, name: t.blog.title, item: `${SITE_URL}/${lang}/blog` },
                { "@type": "ListItem", position: 3, name: title, item: url },
            ],
        },
    ].filter(Boolean);

    return (
        <article id="article" lang={translated ? lang : "fr"}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
            <ReadingProgress target="article" />
            {preview && (
                <form action="/api/admin/preview-exit" method="post" className="fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 md:bottom-6">
                    <div className="flex items-center gap-3 rounded-full bg-ink py-2 pr-2 pl-4 text-sm font-bold text-white shadow-float">
                        Aperçu{post.publishedAt && new Date(post.publishedAt) > new Date() ? " · programmé" : ""} — visible par l'équipe seulement
                        <button type="submit" className="rounded-full bg-white/15 px-3 py-1.5 hover:bg-white/25">
                            Quitter
                        </button>
                    </div>
                </form>
            )}

            {/* Hero: the cover full-bleed, the title over it. */}
            <header className="relative overflow-hidden bg-ink text-white">
                <div className="relative min-h-[26rem] md:min-h-[34rem]">
                    {post.cover ? (
                        <Image src={post.cover} alt={post.coverAlt ?? title} fill priority sizes="100vw" className="object-cover" />
                    ) : (
                        <div className="absolute inset-0" style={{ background: `linear-gradient(140deg, ${tone}, #17120e 85%)` }} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
                    <div className="relative mx-auto flex min-h-[26rem] max-w-3xl flex-col justify-between px-4 pt-5 pb-8 md:min-h-[34rem] md:px-6 md:pb-12">
                        <Link href={paths.blog(lang)} className="inline-flex w-fit items-center gap-1.5 rounded-full bg-black/30 px-3 py-2 text-sm font-bold backdrop-blur-md hover:bg-black/45">
                            <ArrowLeft size={16} />
                            {t.blog.back}
                        </Link>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full px-3 py-1 text-xs font-extrabold tracking-wide uppercase" style={{ background: tone }}>
                                    {topicLabel(post.topic, lang)}
                                </span>
                                {city && <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur-md">{city.name}</span>}
                            </div>
                            <h1 className="nt-serif mt-4 text-[2.6rem] leading-[1.02] md:text-[4.2rem]">{title}</h1>
                            {excerpt && <p className="mt-4 text-lg leading-relaxed text-white/80 md:text-xl">{excerpt}</p>}
                            <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-white/75">
                                {byFounder ? (
                                    <Link href={paths.about(lang)} rel="author" className="underline decoration-white/40 underline-offset-4 hover:decoration-white">
                                        {fill(t.blog.by, { author: post.author })}
                                    </Link>
                                ) : (
                                    <span>{fill(t.blog.by, { author: post.author })}</span>
                                )}
                                <span className="inline-flex items-center gap-1.5">
                                    <CalendarDays size={15} />
                                    {formatDate(post.publishedAt, lang)}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Clock3 size={15} />
                                    {fill(t.blog.readTime, { n: post.readingMinutes })}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-6xl px-4 md:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-12">
                <div className="mx-auto w-full max-w-2xl pt-8">
                    {!translated && (
                        <p className="mb-6 flex items-center gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-sm font-semibold text-text-2">
                            <Languages size={17} className="shrink-0 text-brand-600" />
                            {t.blog.frenchOnly}
                        </p>
                    )}

                    {contents.length >= 3 && (
                        <nav aria-label={t.blog.contents} className="mb-8 rounded-[1.5rem] border border-line bg-surface p-5 lg:hidden">
                            <p className="nt-eyebrow">{t.blog.contents}</p>
                            <ol className="mt-3 space-y-2 text-[0.95rem] font-semibold">
                                {contents.map((item, index) => (
                                    <li key={item.id} className="flex gap-3">
                                        <span className="text-brand-600 tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                                        <a href={`#${item.id}`} className="hover:text-brand-600">
                                            {item.text}
                                        </a>
                                    </li>
                                ))}
                            </ol>
                        </nav>
                    )}

                    <ArticleBody blocks={blocks} places={placeMap} t={t} />

                    {places.length >= 2 && <ArticleMap places={places} />}

                    <div className="mt-10 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
                        <p className="nt-serif text-[1.6rem]">{t.blog.share}</p>
                        <ShareBar title={title} path={paths.post(lang, slug)} preview={shareImage} />
                    </div>

                    {/* Who wrote it, with the way to their page. */}
                    {byFounder && (
                        <Link href={paths.about(lang)} rel="author" className="nt-pressable group mt-8 flex items-center gap-4 rounded-[1.25rem] bg-surface-2 p-4 md:p-5">
                            <FounderPortrait size={64} className="h-16 w-16" />
                            <span className="min-w-0 flex-1">
                                <span className="nt-eyebrow block">{t.blog.writtenBy}</span>
                                <span className="nt-serif mt-1 block text-[1.5rem]">{FOUNDER.name}</span>
                                <span className="mt-0.5 block text-[0.88rem] text-muted">{FOUNDER.role[lang]}</span>
                            </span>
                            <ArrowRight size={18} className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5" />
                        </Link>
                    )}
                </div>

                {/* Desktop: the contents stay beside the text. */}
                <aside className="hidden pt-8 lg:block">
                    <div className="sticky top-24 space-y-6">
                        {contents.length >= 2 && (
                            <nav aria-label={t.blog.contents}>
                                <p className="nt-eyebrow">{t.blog.contents}</p>
                                <ol className="mt-3 space-y-2.5 border-l-2 border-line pl-4 text-sm font-semibold text-text-2">
                                    {contents.map((item) => (
                                        <li key={item.id}>
                                            <a href={`#${item.id}`} className="hover:text-brand-600">
                                                {item.text}
                                            </a>
                                        </li>
                                    ))}
                                </ol>
                            </nav>
                        )}
                        {places.length > 0 && (
                            <div>
                                <p className="nt-eyebrow">{t.blog.places}</p>
                                <ol className="mt-3 space-y-2 text-sm font-semibold">
                                    {places.map((place, index) => (
                                        <li key={place.slug} className="flex gap-2">
                                            <span className="text-brand-600 tabular-nums">{index + 1}.</span>
                                            <Link href={paths.place(lang, place.slug)} className="hover:text-brand-600">
                                                {place.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {related.length > 0 && (
                <section className="mx-auto mt-16 max-w-6xl px-4 md:px-6">
                    <h2 className="nt-section-title mb-5">{t.blog.related}</h2>
                    <div className="nt-masonry columns-2 sm:columns-3 lg:columns-4">
                        {related.map((other) => (
                            <div key={other.id}>
                                <PostCard post={other} locale={lang} />
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </article>
    );
}
