import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin, Plus } from "lucide-react";
import PostCard from "@/components/blog/PostCard";
import PinCard from "@/components/place/PinCard";
import { getPosts } from "@/lib/blog/server";
import { CITIES } from "@/lib/cities";
import { fill, getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { MIN_COLLECTION, collectionByKey, placesIn } from "@/lib/places/collections";
import { paths } from "@/lib/places/paths";
import { getAllPlaces } from "@/lib/places/server";
import { STREET_CHAPTERS } from "@/lib/street-food";

// "Chroniques de la rue": what the country eats outside, chapter by chapter
// (lib/street-food.ts). Under each chapter, the cities where the catalogue
// holds enough such places to make a selection, and a few of them across the
// country. Then the food articles of the journal. A chapter without places
// keeps its words and simply shows none.

export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

// Places shown under a chapter.
const PER_CHAPTER = 8;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    const t = getDictionary(lang);
    const path = (locale: Locale) => paths.streetFood(locale);
    return {
        title: t.street.metaTitle,
        description: t.street.metaDescription,
        alternates: { canonical: path(lang), languages: { fr: path("fr"), en: path("en"), "x-default": path("fr") } },
        openGraph: { title: t.street.metaTitle, description: t.street.metaDescription, url: path(lang) },
    };
}

export default async function StreetFoodPage({ params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    const t = getDictionary(lang);
    const [places, posts] = await Promise.all([getAllPlaces().catch(() => []), getPosts().catch(() => [])]);

    const chapters = STREET_CHAPTERS.flatMap((chapter) => {
        const collection = collectionByKey(chapter.collection);
        if (!collection) return [];
        const found = placesIn(collection, places);
        // The cities with enough of these places to have their own selection page.
        const cities = CITIES.map((city) => ({ city, count: found.filter((place) => place.city === city.slug).length }))
            .filter(({ count }) => count >= MIN_COLLECTION)
            .sort((a, b) => b.count - a.count);
        // A few places, never two from the same city in a row when another city has some.
        const queues = cities.length > 0 ? cities.map(({ city }) => found.filter((place) => place.city === city.slug)) : [found];
        const mixed: typeof found = [];
        for (let round = 0; mixed.length < PER_CHAPTER && queues.some((queue) => queue[round]); round++) {
            for (const queue of queues) if (queue[round] && mixed.length < PER_CHAPTER) mixed.push(queue[round]);
        }
        return [{ ...chapter, collection, total: found.length, cities, shown: mixed }];
    });
    const stories = posts.filter((post) => post.topic === "food").slice(0, 6);

    return (
        <div className="pb-24">
            <header className="mx-auto max-w-6xl px-4 pt-[max(env(safe-area-inset-top),1rem)] md:px-6 md:pt-10">
                <div className="relative overflow-hidden rounded-[2rem] bg-contrast px-6 py-12 text-on-contrast md:px-12 md:py-20">
                    <p className="text-[0.75rem] font-semibold tracking-[0.16em] uppercase opacity-60">{t.street.eyebrow}</p>
                    <h1 className="nt-serif mt-3 max-w-[14ch] text-[2.75rem] leading-[0.98] md:text-[4.5rem]">{t.street.title}</h1>
                    <p className="mt-5 max-w-xl text-[1.125rem] leading-relaxed opacity-80">{t.street.lead}</p>
                    {/* The chapters, as a table of contents. */}
                    <ol className="mt-8 flex flex-wrap gap-2">
                        {chapters.map((chapter, index) => (
                            <li key={chapter.collection.key}>
                                <a href={`#${chapter.collection.key}`} className="nt-tap inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-[0.875rem] font-semibold transition hover:bg-white/10">
                                    <span className="nt-serif text-[1.125rem] leading-none opacity-60">{index + 1}</span>
                                    {chapter.title[lang]}
                                </a>
                            </li>
                        ))}
                    </ol>
                </div>
            </header>

            {chapters.map((chapter, index) => (
                <section key={chapter.collection.key} id={chapter.collection.key} className="scroll-mt-24 pt-14 md:pt-24">
                    <div className="nt-reveal mx-auto grid max-w-6xl gap-x-12 gap-y-5 px-4 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:px-6">
                        <div>
                            <p className="nt-eyebrow">{fill(t.street.chapter, { n: index + 1 })}</p>
                            <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.05] md:text-[3.5rem]">{chapter.title[lang]}</h2>
                        </div>
                        <div>
                            <p className="text-[1.125rem] leading-relaxed text-text-2">{chapter.body[lang]}</p>
                            {chapter.cities.length > 0 && (
                                <>
                                    <p className="mt-6 text-[0.75rem] font-semibold tracking-[0.12em] text-muted uppercase">{t.street.where}</p>
                                    <ul className="mt-3 flex flex-wrap gap-2">
                                        {chapter.cities.map(({ city, count }) => (
                                            <li key={city.slug}>
                                                <Link href={paths.collection(lang, city.slug, chapter.collection)} className="nt-chip">
                                                    <MapPin size={14} className="text-muted" />
                                                    {city.name}
                                                    <span className="font-normal text-muted">{count}</span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    </div>
                    {chapter.shown.length > 0 && (
                        <div className="mx-auto mt-8 max-w-6xl md:px-6">
                            <ul className="nt-rail">
                                {chapter.shown.map((place, position) => (
                                    <li key={place.id}>
                                        <PinCard place={place} shape="portrait" priority={index === 0 && position < 2} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>
            ))}

            {stories.length > 0 && (
                <section className="mx-auto max-w-6xl px-4 pt-16 md:px-6 md:pt-28">
                    <div className="nt-reveal border-t border-line pt-8 md:pt-10">
                        <p className="nt-eyebrow">{t.street.readEyebrow}</p>
                        <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.05] md:text-[3.5rem]">{t.street.readTitle}</h2>
                    </div>
                    <div className="nt-masonry nt-settle mt-8 columns-2 md:columns-3">
                        {stories.map((post) => (
                            <div key={post.id}>
                                <PostCard post={post} locale={lang} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="mx-auto max-w-6xl px-4 pt-16 md:px-6 md:pt-24">
                <Link href={paths.submit(lang)} className="nt-reveal nt-pressable group flex flex-col justify-between gap-8 rounded-[1.6rem] border border-line bg-surface p-6 md:flex-row md:items-end md:p-8">
                    <span className="max-w-xl">
                        <Plus size={22} strokeWidth={1.7} className="text-brand-600" />
                        <span className="nt-serif mt-5 block text-[2.25rem] leading-[1.05]">{t.street.missingTitle}</span>
                        <span className="mt-2 block text-[1rem] leading-relaxed text-muted">{t.street.missingBody}</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 font-semibold">
                        {t.nav.suggest}
                        <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                </Link>
            </section>
        </div>
    );
}
