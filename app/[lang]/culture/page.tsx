import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import PostCard from "@/components/blog/PostCard";
import PinCard from "@/components/place/PinCard";
import { getPosts } from "@/lib/blog/server";
import { fill, getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import { getStoryPlaces } from "@/lib/places/server";
import { asMosaic, isWide } from "@/lib/places/stories";

// The culture zone: where NiceThings tells where things come from. The
// articles filed under "culture" (peoples, dishes and their origins, places
// and their past) and the places that carry a story, apart from the food
// and going-out articles of the blog. Each part shows only when it has
// something to show.

export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    const t = getDictionary(lang);
    const path = (locale: Locale) => paths.culture(locale);
    return {
        title: t.culture.metaTitle,
        description: t.culture.metaDescription,
        alternates: { canonical: path(lang), languages: { fr: path("fr"), en: path("en"), "x-default": path("fr") } },
        openGraph: { title: t.culture.metaTitle, description: t.culture.metaDescription, url: path(lang) },
    };
}

export default async function CulturePage({ params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    const t = getDictionary(lang);
    const [posts, places] = await Promise.all([getPosts().catch(() => []), getStoryPlaces().catch(() => [])]);
    const stories = posts.filter((post) => post.topic === "culture");

    return (
        <div className="pb-24">
            {/* The zone opens in ink: a different room from the rest of the site. */}
            <header className="mx-auto max-w-6xl px-4 pt-[max(env(safe-area-inset-top),1rem)] md:px-6 md:pt-10">
                <div className="relative overflow-hidden rounded-[2rem] bg-contrast px-6 py-12 text-on-contrast md:px-12 md:py-20">
                    <p className="text-[0.75rem] font-semibold tracking-[0.16em] uppercase opacity-60">{t.culture.eyebrow}</p>
                    <h1 className="nt-serif mt-3 max-w-[12ch] text-[2.75rem] leading-[0.98] md:text-[4.5rem]">{t.culture.title}</h1>
                    <p className="mt-5 max-w-xl text-[1.125rem] leading-relaxed opacity-80">{t.culture.lead}</p>
                    {(stories.length > 0 || places.length > 0) && (
                        <p className="mt-8 text-[0.875rem] font-semibold opacity-70">
                            {[stories.length > 0 && fill(stories.length === 1 ? t.culture.storyOne : t.culture.storyMany, { count: stories.length }), places.length > 0 && fill(places.length === 1 ? t.culture.placeOne : t.culture.placeMany, { count: places.length })]
                                .filter(Boolean)
                                .join(" · ")}
                        </p>
                    )}
                </div>
            </header>

            <section className="mx-auto max-w-6xl px-4 pt-14 md:px-6 md:pt-20">
                <p className="nt-eyebrow">{t.culture.storiesEyebrow}</p>
                <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.05] md:text-[3.5rem]">{t.culture.storiesTitle}</h2>
                <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-muted">{t.culture.storiesLead}</p>
                {stories.length > 0 ? (
                    <div className="nt-masonry nt-settle mt-8 columns-2 md:columns-3">
                        {stories.map((post, index) => (
                            <div key={post.id}>
                                <PostCard post={post} locale={lang} priority={index < 2} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mt-8 rounded-[1.25rem] border border-dashed border-line-strong px-6 py-10 text-center text-[1rem] text-muted">{t.culture.storiesEmpty}</p>
                )}
            </section>

            {places.length > 0 && (
                <section className="mx-auto max-w-6xl px-4 pt-16 md:px-6 md:pt-24">
                    <p className="nt-eyebrow">{t.culture.placesEyebrow}</p>
                    <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.05] md:text-[3.5rem]">{t.culture.placesTitle}</h2>
                    <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-muted">{t.culture.placesLead}</p>
                    {/* One wide tile, then two side by side. */}
                    <ul className="nt-settle mt-8 grid grid-flow-dense grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                        {asMosaic(places).map((place, index) => (
                            <li key={place.id} className={isWide(index) ? "col-span-2" : ""}>
                                <PinCard place={place} shape={isWide(index) ? "wide" : "portrait"} priority={index < 2} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className="mx-auto mt-16 flex max-w-6xl flex-col gap-3 px-4 sm:flex-row md:mt-24 md:px-6">
                <Link href={paths.blog(lang)} className="nt-btn nt-btn-outline">
                    {t.culture.toBlog}
                    <ArrowRight size={16} />
                </Link>
                <Link href={paths.submit(lang)} className="nt-btn nt-btn-soft">
                    {t.culture.suggest}
                </Link>
            </section>
        </div>
    );
}
