import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Compass, MapPin, Navigation, Printer, Send, Users, Wallet } from "lucide-react";
import PostCard from "@/components/blog/PostCard";
import EditorialSection from "@/components/editorial/EditorialSection";
import PinCard from "@/components/place/PinCard";
import { getPosts } from "@/lib/blog/server";
import { CITIES, cityBySlug, type City } from "@/lib/cities";
import { fill, getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { formatNumber } from "@/lib/i18n/format";
import { MIN_COLLECTION, collectionByKey, placesIn } from "@/lib/places/collections";
import type { EditorialRail } from "@/lib/places/editorial";
import { paths } from "@/lib/places/paths";
import { getAllPlaces, getStoryPlaces } from "@/lib/places/server";
import { isWide, todaysStories } from "@/lib/places/stories";
import type { PlaceSummary } from "@/lib/places/types";
import { pollsReady } from "@/lib/polls-server";

// "De retour au pays": the page for people coming home, for a holiday, a
// wedding, or for good. It is the one a poster in a hotel, a travel agency
// or an airport taxi leads to (./affiche, "?ref=aeroport"). Everything on it
// comes from the catalogue: the two cities most flights land in, the tables
// people miss, where to meet everyone again, and the country to see again.
// A part with nothing to show is left out.

export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

// Most international flights land in one of these two.
const ARRIVALS = ["douala", "yaounde"];
// What people coming home ask for first, then where to take the family.
const FIRST_NIGHT = ["local", "braise"];
const TOGETHER = ["family"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    const t = getDictionary(lang);
    const path = (locale: Locale) => paths.homecoming(locale);
    return {
        title: t.homecoming.metaTitle,
        description: t.homecoming.metaDescription,
        alternates: { canonical: path(lang), languages: { fr: path("fr"), en: path("en"), "x-default": path("fr") } },
        openGraph: { title: t.homecoming.metaTitle, description: t.homecoming.metaDescription, url: path(lang) },
    };
}

export default async function HomecomingPage({ params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    const t = getDictionary(lang);
    const [places, storyPlaces, posts, canVote] = await Promise.all([
        getAllPlaces().catch(() => [] as PlaceSummary[]),
        getStoryPlaces().catch(() => []),
        getPosts().catch(() => []),
        pollsReady().catch(() => false),
    ]);

    const counts = new Map(CITIES.map((city) => [city.slug, places.filter((place) => place.city === city.slug).length]));
    const arrivals = ARRIVALS.map((slug) => cityBySlug(slug)).filter((city): city is City => Boolean(city) && (counts.get(city!.slug) ?? 0) > 0);
    const elsewhere = CITIES.filter((city) => !ARRIVALS.includes(city.slug) && (counts.get(city.slug) ?? 0) >= 20).sort((a, b) => (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0));

    // One selection of one city, as a rail; null when the city has too few such places.
    const rail = (city: City, key: string): EditorialRail | null => {
        const collection = collectionByKey(key);
        if (!collection) return null;
        const found = placesIn(collection, places.filter((place) => place.city === city.slug));
        if (found.length < MIN_COLLECTION) return null;
        return {
            key: `${city.slug}-${key}`,
            title: fill(collection.title[lang], { city: city.name }),
            blurb: collection.blurb[lang],
            href: paths.collection(lang, city.slug, collection),
            count: found.length,
            items: found.slice(0, 8),
        };
    };
    const railsOf = (keys: string[]) => keys.flatMap((key) => arrivals.map((city) => rail(city, key))).filter((item): item is EditorialRail => item !== null);
    const firstNight = railsOf(FIRST_NIGHT);
    const together = railsOf(TOGETHER);
    const stories = todaysStories(storyPlaces, 6);

    const how = [Wallet, Navigation, Send];

    return (
        <div className="pb-24">
            <header className="mx-auto max-w-6xl px-4 pt-[max(env(safe-area-inset-top),1rem)] md:px-6 md:pt-10">
                <div className="relative overflow-hidden rounded-[2rem] bg-contrast px-6 py-12 text-on-contrast md:px-12 md:py-20">
                    <p className="text-[0.75rem] font-semibold tracking-[0.16em] uppercase opacity-60">{t.homecoming.eyebrow}</p>
                    <h1 className="nt-serif mt-3 max-w-[11ch] text-[2.75rem] leading-[0.98] md:text-[4.5rem]">{t.homecoming.title}</h1>
                    <p className="mt-5 max-w-xl text-[1.125rem] leading-relaxed opacity-80">{t.homecoming.lead}</p>
                    <Link href={paths.map(lang)} className="nt-btn nt-btn-primary mt-8">
                        <Compass size={18} />
                        {t.homecoming.openMap}
                    </Link>
                </div>
            </header>

            {/* ---------------- Where do you land? ---------------- */}
            {arrivals.length > 0 && (
                <section className="mx-auto max-w-6xl px-4 pt-14 md:px-6 md:pt-20">
                    <div className="nt-reveal max-w-2xl">
                        <p className="nt-eyebrow">{t.homecoming.landEyebrow}</p>
                        <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.05] md:text-[3.5rem]">{t.homecoming.landTitle}</h2>
                        <p className="mt-3 text-[1rem] leading-relaxed text-muted">{t.homecoming.landLead}</p>
                    </div>
                    <ul className="nt-settle mt-8 grid gap-3 sm:grid-cols-2 md:gap-4">
                        {arrivals.map((city) => (
                            <li key={city.slug}>
                                <Link href={paths.city(lang, city.slug)} className="nt-pressable group flex h-full flex-col justify-between gap-10 rounded-[1.6rem] border border-line bg-surface p-6 md:p-8">
                                    <span className="text-[0.875rem] font-semibold text-muted">{fill(t.homecoming.placesCount, { count: formatNumber(counts.get(city.slug) ?? 0, lang) })}</span>
                                    <span>
                                        <span className="nt-serif block text-[2.75rem] leading-none md:text-[3.5rem]">{city.name}</span>
                                        <span className="mt-2 block text-[1rem] text-muted">{city.tagline[lang]}</span>
                                        <span className="mt-5 inline-flex items-center gap-1.5 font-semibold">
                                            {fill(t.searchPage.guideLink, { city: city.name })}
                                            <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                    {elsewhere.length > 0 && (
                        <div className="mt-6">
                            <p className="text-[0.875rem] text-muted">{t.homecoming.otherCities}</p>
                            <ul className="mt-3 flex flex-wrap gap-2">
                                {elsewhere.map((city) => (
                                    <li key={city.slug}>
                                        <Link href={paths.city(lang, city.slug)} className="nt-chip">
                                            <MapPin size={14} className="text-muted" />
                                            {city.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>
            )}

            {/* ---------------- The first evening ---------------- */}
            {firstNight.length > 0 && (
                <div className="pt-16 md:pt-28">
                    <div className="nt-reveal mx-auto max-w-6xl px-4 md:px-6">
                        <div className="max-w-2xl border-t border-line pt-8 md:pt-10">
                            <p className="nt-eyebrow">{t.homecoming.firstEyebrow}</p>
                            <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.05] md:text-[3.5rem]">{t.homecoming.firstTitle}</h2>
                            <p className="mt-3 text-[1rem] leading-relaxed text-muted">{t.homecoming.firstLead}</p>
                        </div>
                    </div>
                    {firstNight.map((item, index) => (
                        <EditorialSection key={item.key} rail={item} locale={lang} priority={index === 0} />
                    ))}
                    <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
                        <Link href={paths.streetFood(lang)} className="nt-btn nt-btn-outline w-full sm:w-auto">
                            {t.street.eyebrow}
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            )}

            {/* ---------------- Seeing everyone again ---------------- */}
            {(canVote || together.length > 0) && (
                <div className="pt-16 md:pt-28">
                    <div className="nt-reveal mx-auto max-w-6xl px-4 md:px-6">
                        <div className="max-w-2xl border-t border-line pt-8 md:pt-10">
                            <p className="nt-eyebrow">{t.homecoming.togetherEyebrow}</p>
                            <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.05] md:text-[3.5rem]">{t.homecoming.togetherTitle}</h2>
                            <p className="mt-3 text-[1rem] leading-relaxed text-muted">{t.homecoming.togetherLead}</p>
                        </div>
                        {canVote && (
                            <div className="mt-8 flex flex-col gap-4 rounded-[1.6rem] bg-surface-2 p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
                                <div className="min-w-0">
                                    <p className="nt-serif text-[1.5rem] leading-tight">{t.poll.start}</p>
                                    <p className="mt-1.5 max-w-xl text-[1rem] leading-relaxed text-text-2">{t.homecoming.voteBody}</p>
                                </div>
                                <Link href={paths.saved(lang)} className="nt-btn nt-btn-primary shrink-0">
                                    <Users size={17} />
                                    {t.homecoming.voteCta}
                                </Link>
                            </div>
                        )}
                    </div>
                    {together.map((item) => (
                        <EditorialSection key={item.key} rail={item} locale={lang} />
                    ))}
                </div>
            )}

            {/* ---------------- The country, while you are here ---------------- */}
            {stories.length > 0 && (
                <section className="mx-auto max-w-6xl px-4 pt-16 md:px-6 md:pt-28">
                    <div className="nt-reveal max-w-2xl border-t border-line pt-8 md:pt-10">
                        <p className="nt-eyebrow">{t.homecoming.countryEyebrow}</p>
                        <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.05] md:text-[3.5rem]">{t.homecoming.countryTitle}</h2>
                        <p className="mt-3 text-[1rem] leading-relaxed text-muted">{t.homecoming.countryLead}</p>
                    </div>
                    <ul className="nt-settle mt-8 grid grid-flow-dense grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                        {stories.map((place, index) => (
                            <li key={place.id} className={isWide(index) ? "col-span-2" : ""}>
                                <PinCard place={place} shape={isWide(index) ? "wide" : "portrait"} />
                            </li>
                        ))}
                    </ul>
                    <Link href={paths.culture(lang)} className="nt-btn nt-btn-outline mt-6 w-full sm:w-auto">
                        {t.culture.homeLink}
                        <ArrowRight size={16} />
                    </Link>
                </section>
            )}

            {/* ---------------- What is being told ---------------- */}
            {posts.length > 0 && (
                <section className="mx-auto max-w-6xl px-4 pt-16 md:px-6 md:pt-28">
                    <div className="nt-reveal max-w-2xl border-t border-line pt-8 md:pt-10">
                        <p className="nt-eyebrow">{t.homecoming.readEyebrow}</p>
                        <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.05] md:text-[3.5rem]">{t.homecoming.readTitle}</h2>
                    </div>
                    <div className="nt-masonry nt-settle mt-8 columns-2 md:columns-4">
                        {posts.slice(0, 4).map((post) => (
                            <div key={post.id}>
                                <PostCard post={post} locale={lang} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ---------------- How it works, in three lines ---------------- */}
            <section className="mx-auto max-w-6xl px-4 pt-16 md:px-6 md:pt-28">
                <ul className="nt-reveal grid gap-px overflow-hidden rounded-[1.6rem] border border-line bg-line md:grid-cols-3">
                    {t.homecoming.how.map((item, index) => {
                        const Icon = how[index] ?? Wallet;
                        return (
                            <li key={item.title} className="bg-bg p-6 md:p-8">
                                <Icon size={22} strokeWidth={1.7} className="text-brand-600" />
                                <p className="nt-serif mt-5 text-[1.5rem] leading-tight">{item.title}</p>
                                <p className="mt-2 text-[1rem] leading-relaxed text-muted">{item.body}</p>
                            </li>
                        );
                    })}
                </ul>
            </section>

            {/* ---------------- The poster, for those who welcome travellers ---------------- */}
            <section className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
                <Link href={paths.homecomingPoster(lang)} className="nt-reveal nt-pressable group flex flex-col justify-between gap-8 rounded-[1.6rem] bg-[#15110e] p-6 text-white md:flex-row md:items-end md:p-8">
                    <span className="max-w-xl">
                        <Printer size={22} strokeWidth={1.7} className="text-brand-400" />
                        <span className="nt-serif mt-5 block text-[2.25rem] leading-[1.05]">{t.homecoming.posterTitle}</span>
                        <span className="mt-2 block text-[1rem] leading-relaxed text-white/65">{t.homecoming.posterBody}</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 font-semibold">
                        {t.homecoming.posterCta}
                        <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                </Link>
            </section>
        </div>
    );
}
