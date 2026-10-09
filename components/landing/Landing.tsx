import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock3, Heart, Languages, MapPin, MessageCircle, Navigation, Plus, Search, Sparkles, Store, Volume2 } from "lucide-react";
import PostCard from "@/components/blog/PostCard";
import EditorialSection from "@/components/editorial/EditorialSection";
import PinCard from "@/components/place/PinCard";
import { LanguageSwitch, Logo } from "@/components/site/SiteChrome";
import { CITIES, type City } from "@/lib/cities";
import { FOUNDER } from "@/lib/founder";
import { SITE_URL, fill, getDictionary, type Locale } from "@/lib/i18n";
import { formatNumber } from "@/lib/i18n/format";
import type { Area } from "@/lib/places/areas";
import type { EditorialRail } from "@/lib/places/editorial";
import { paths } from "@/lib/places/paths";
import type { PlaceSummary } from "@/lib/places/types";
import type { PostSummary } from "@/lib/blog/server";
import Constellation from "./Constellation";
import HeroSearch from "./HeroSearch";

type Demo = { phrase: string; chips: string[] };

// The home page reads like the opening pages of a city guide: a quiet
// headline and one search, then sections drawn from real listings, then
// the cities, the journal, and only at the end how it all works.
export default function Landing({
    locale,
    points,
    labels,
    cityCounts,
    areaCount,
    picks,
    rails,
    coastRail,
    homeCity,
    homeAreas,
    posts,
    demos,
}: {
    locale: Locale;
    points: number[];
    labels: { name: string; x: number; y: number; count: number }[];
    cityCounts: Record<string, number>;
    areaCount: number;
    picks: PlaceSummary[];
    rails: EditorialRail[];
    coastRail: EditorialRail | null;
    homeCity: City;
    homeAreas: Area[];
    posts: PostSummary[];
    demos: Demo[];
}) {
    const t = getDictionary(locale);
    const total = Object.values(cityCounts).reduce((sum, value) => sum + value, 0);
    const cities = CITIES.filter((city) => (cityCounts[city.slug] ?? 0) > 0).sort(
        (a, b) => (cityCounts[b.slug] ?? 0) - (cityCounts[a.slug] ?? 0)
    );
    const otherCities = cities.filter((city) => city.slug !== homeCity.slug);

    const jsonLd = [
        {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: t.landing.faq.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
        },
        // The city guides, so search engines see the site's structure.
        {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: t.landing.citiesTitle,
            itemListElement: cities.map((city, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: fill(t.cities.guideTitle, { city: city.name }),
                url: `${SITE_URL}${paths.city(locale, city.slug)}`,
            })),
        },
    ];

    const features = [
        { icon: Navigation, title: t.landing.f1Title, body: t.landing.f1Body },
        { icon: Volume2, title: t.landing.f2Title, body: t.landing.f2Body },
        { icon: Clock3, title: t.landing.f3Title, body: t.landing.f3Body },
        { icon: MessageCircle, title: t.landing.f4Title, body: t.landing.f4Body },
        { icon: Heart, title: t.landing.f5Title, body: t.landing.f5Body },
        { icon: Languages, title: t.landing.f6Title, body: t.landing.f6Body },
    ];

    const steps = [
        { title: t.landing.s1Title, body: t.landing.s1Body },
        { title: t.landing.s2Title, body: t.landing.s2Body },
        { title: t.landing.s3Title, body: t.landing.s3Body },
    ];

    return (
        <div className="bg-bg">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

            {/* Phone masthead (desktop has the site header). */}
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)] md:hidden">
                <Logo compact />
                <LanguageSwitch />
            </div>

            {/* ---------------- Hero ---------------- */}
            <section className="mx-auto max-w-6xl px-4 pt-10 md:px-6 md:pt-20">
                <div className="grid items-end gap-12 md:grid-cols-[1.25fr_0.75fr] lg:gap-20">
                    <div className="min-w-0">
                        <p className="nt-rise nt-eyebrow">{fill(t.landing.badge, { places: formatNumber(total, locale), cities: cities.length })}</p>
                        <h1 className="nt-rise nt-serif mt-4 text-[2.85rem] leading-[0.98] [animation-delay:60ms] sm:text-[3.6rem] lg:text-[4.75rem]">
                            {t.landing.title1} <em className="block text-brand-600">{t.landing.title2}</em>
                        </h1>
                        <p className="nt-rise mt-5 max-w-lg text-[1.02rem] leading-relaxed text-text-2 [animation-delay:120ms] md:text-[1.1rem]">
                            {t.landing.lead}
                        </p>
                        <div className="nt-rise mt-8 [animation-delay:180ms]">
                            <HeroSearch />
                        </div>
                    </div>

                    {/* A small board of real places, desktop only. */}
                    {picks.length >= 2 && (
                        <ul className="nt-rise hidden grid-cols-2 gap-4 [animation-delay:240ms] md:grid" aria-label={t.landing.picksTitle}>
                            {picks.slice(0, 4).map((place, index) => (
                                <li key={place.id} className={index % 2 === 1 ? "translate-y-10" : ""}>
                                    <PinCard place={place} shape="portrait" priority={index < 2} />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>

            {/* ---------------- The home city, by mood ---------------- */}
            {rails.length > 0 && (
                <div className="pt-16 md:pt-28">
                    <div className="mx-auto max-w-6xl px-4 md:px-6">
                        <div className="nt-reveal border-t border-line pt-8 md:pt-10">
                            <p className="nt-eyebrow">{t.city.collections}</p>
                            <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                                <div className="max-w-2xl">
                                    <h2 className="nt-serif text-[2.3rem] md:text-[3.2rem]">{fill(t.landing.moodTitle, { city: homeCity.name })}</h2>
                                    <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">{t.landing.moodLead}</p>
                                </div>
                                <nav aria-label={t.nav.cities} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.88rem] md:justify-end">
                                    <span className="text-muted">{t.landing.elsewhere}</span>
                                    {otherCities.slice(0, 4).map((city) => (
                                        <Link key={city.slug} href={paths.city(locale, city.slug)} className="nt-link">
                                            {city.name}
                                        </Link>
                                    ))}
                                </nav>
                            </div>
                        </div>
                    </div>
                    {rails.map((rail, index) => (
                        <EditorialSection key={rail.key} rail={rail} locale={locale} priority={index === 0} />
                    ))}

                    {homeAreas.length > 0 && (
                        <section className="nt-reveal mx-auto max-w-6xl px-4 pt-12 md:px-6 md:pt-16">
                            <h2 className="nt-section-title">{fill(t.city.whereToGoIn, { area: homeCity.name })}</h2>
                            <p className="mt-1.5 text-[0.92rem] text-muted">{t.discover.byArea}</p>
                            <ul className="mt-5 flex flex-wrap gap-2">
                                {homeAreas.map((area) => (
                                    <li key={area.slug}>
                                        <Link href={paths.neighborhood(locale, homeCity.slug, area.name)} className="nt-chip">
                                            <MapPin size={14} className="text-muted" />
                                            {area.name}
                                            <span className="font-normal text-muted">{area.count}</span>
                                        </Link>
                                    </li>
                                ))}
                                <li>
                                    <Link href={paths.city(locale, homeCity.slug)} className="nt-chip">
                                        {fill(t.searchPage.guideLink, { city: homeCity.name })}
                                        <ArrowRight size={14} />
                                    </Link>
                                </li>
                            </ul>
                        </section>
                    )}
                </div>
            )}

            {coastRail && (
                <div className="pt-6">
                    <EditorialSection rail={coastRail} locale={locale} />
                </div>
            )}

            {/* ---------------- Cities ---------------- */}
            <section className="mx-auto max-w-6xl px-4 pt-20 md:px-6 md:pt-28">
                <div className="nt-reveal border-t border-line pt-8 md:pt-10">
                    <p className="nt-eyebrow">{t.landing.citiesEyebrow}</p>
                    <h2 className="nt-serif mt-2 text-[2.3rem] md:text-[3.2rem]">{t.landing.citiesTitle}</h2>
                </div>
                <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                    {cities.slice(0, 8).map((city) => (
                        <li key={city.slug} className="nt-reveal">
                            <Link
                                href={paths.city(locale, city.slug)}
                                className="nt-pressable group flex h-full min-h-[9.5rem] flex-col justify-between rounded-[1.25rem] border border-line bg-surface p-4 md:min-h-[11rem] md:p-5"
                            >
                                <span className="text-[0.66rem] font-semibold tracking-[0.12em] text-muted uppercase">{city.region[locale]}</span>
                                <span>
                                    <span className="nt-serif block text-[1.75rem] md:text-[2.1rem]">{city.name}</span>
                                    <span className="mt-1 flex items-center justify-between gap-2 text-[0.8rem] text-muted">
                                        {fill(t.city.placesCount, { count: formatNumber(cityCounts[city.slug] ?? 0, locale) })}
                                        <ArrowRight size={15} className="text-text transition-transform duration-200 group-hover:translate-x-0.5" />
                                    </span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
                {cities.length > 8 && (
                    <p className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[0.9rem]">
                        <span className="text-muted">{t.landing.allCities} :</span>
                        {cities.slice(8).map((city) => (
                            <Link key={city.slug} href={paths.city(locale, city.slug)} className="nt-link">
                                {city.name}
                            </Link>
                        ))}
                    </p>
                )}
            </section>

            {/* ---------------- Journal ---------------- */}
            {posts.length > 0 && (
                <section className="mx-auto max-w-6xl px-4 pt-20 md:px-6 md:pt-28">
                    <div className="nt-reveal flex items-end justify-between gap-4 border-t border-line pt-8 md:pt-10">
                        <div className="max-w-xl">
                            <p className="nt-eyebrow">{t.blog.title}</p>
                            <h2 className="nt-serif mt-2 text-[2.3rem] md:text-[3.2rem]">{t.landing.journalTitle}</h2>
                            <p className="mt-3 text-[0.95rem] text-muted">{t.landing.journalLead}</p>
                        </div>
                        <Link href={paths.blog(locale)} className="nt-btn nt-btn-outline hidden shrink-0 sm:inline-flex">
                            {t.blog.back}
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                    <div className="nt-masonry mt-8 columns-2 md:columns-4">
                        {posts.slice(0, 4).map((post) => (
                            <div key={post.id}>
                                <PostCard post={post} locale={locale} />
                            </div>
                        ))}
                    </div>
                    <Link href={paths.blog(locale)} className="nt-btn nt-btn-outline mt-2 w-full sm:hidden">
                        {t.blog.back}
                        <ArrowRight size={16} />
                    </Link>
                </section>
            )}

            {/* ---------------- Atlas: every place as a point of light ---------------- */}
            <section className="mx-auto max-w-6xl px-4 pt-20 md:px-6 md:pt-28">
                <div className="nt-reveal relative isolate overflow-hidden rounded-[1.6rem] bg-[#15110e] text-white">
                    <Constellation
                        points={points}
                        labels={labels}
                        className="pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-full opacity-40 md:w-[58%] md:opacity-100"
                    />
                    <div className="max-w-xl p-6 py-10 md:p-14">
                        <p className="text-[0.7rem] font-semibold tracking-[0.14em] text-white/50 uppercase">{t.landing.atlasEyebrow}</p>
                        <h2 className="nt-serif mt-3 text-[2.3rem] md:text-[3.4rem]">{t.landing.atlasTitle}</h2>
                        <p className="mt-4 text-[0.98rem] leading-relaxed text-white/70">
                            {fill(t.landing.atlasBody, { places: formatNumber(total, locale), cities: cities.length })}
                        </p>
                        <dl className="mt-8 grid max-w-sm grid-cols-3 gap-6">
                            {[
                                { value: formatNumber(total, locale), label: t.landing.statPlaces },
                                { value: String(cities.length), label: t.landing.statCities },
                                { value: formatNumber(areaCount, locale), label: t.landing.statAreas },
                            ].map((stat) => (
                                <div key={stat.label}>
                                    <dd className="nt-serif text-[2rem] md:text-[2.4rem]">{stat.value}</dd>
                                    <dt className="text-[0.75rem] text-white/50">{stat.label}</dt>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>
            </section>

            {/* ---------------- Natural search + how it works ---------------- */}
            <section className="mx-auto max-w-6xl px-4 pt-20 md:px-6 md:pt-28">
                <div className="grid gap-12 md:grid-cols-2 md:gap-16">
                    <div className="nt-reveal">
                        <p className="nt-eyebrow">{t.landing.conciergeEyebrow}</p>
                        <h2 className="nt-serif mt-2 text-[2.3rem] md:text-[3rem]">{t.landing.conciergeTitle}</h2>
                        <p className="mt-4 max-w-md leading-relaxed text-text-2">{t.landing.conciergeBody}</p>
                        <ol className="mt-8 grid gap-5">
                            {steps.map((step, index) => (
                                <li key={step.title} className="flex gap-4">
                                    <span className="nt-serif w-6 shrink-0 text-[1.6rem] leading-none text-brand-600">{index + 1}</span>
                                    <div>
                                        <h3 className="font-semibold">{step.title}</h3>
                                        <p className="mt-0.5 text-[0.92rem] leading-relaxed text-muted">{step.body}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                    <ul className="flex flex-col gap-3 md:pt-10">
                        {demos.map((demo) => (
                            <li key={demo.phrase} className="nt-reveal">
                                <Link
                                    href={`${paths.searchEntry(locale)}?q=${encodeURIComponent(demo.phrase)}`}
                                    prefetch={false}
                                    className="nt-pressable block rounded-[1.25rem] border border-line bg-surface p-5"
                                >
                                    <p className="flex items-start gap-2.5 text-[0.98rem] font-medium text-text">
                                        <Search size={16} className="mt-1 shrink-0 text-muted" />« {demo.phrase} »
                                    </p>
                                    <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-6">
                                        {demo.chips.map((chip) => (
                                            <span key={chip} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-2">
                                                {chip}
                                            </span>
                                        ))}
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* ---------------- Made for Cameroon ---------------- */}
            <section className="mx-auto max-w-6xl px-4 pt-20 md:px-6 md:pt-28">
                <div className="nt-reveal border-t border-line pt-8 md:pt-10">
                    <p className="nt-eyebrow">{t.landing.featuresEyebrow}</p>
                    <h2 className="nt-serif mt-2 max-w-2xl text-[2.3rem] md:text-[3rem]">{t.landing.featuresTitle}</h2>
                </div>
                <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature) => (
                        <li key={feature.title} className="nt-reveal flex gap-4">
                            <feature.icon size={20} strokeWidth={1.7} className="mt-0.5 shrink-0 text-brand-600" />
                            <div>
                                <h3 className="font-semibold">{feature.title}</h3>
                                <p className="mt-1 text-[0.92rem] leading-relaxed text-muted">{feature.body}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </section>

            {/* ---------------- Trust ---------------- */}
            <section className="mx-auto max-w-6xl px-4 pt-20 md:px-6 md:pt-28">
                <div className="nt-reveal grid gap-8 rounded-[1.6rem] bg-surface-2 p-6 md:grid-cols-[1fr_1.1fr] md:gap-12 md:p-12">
                    <div>
                        <p className="nt-eyebrow">{t.landing.trustEyebrow}</p>
                        <h2 className="nt-serif mt-2 text-[2.1rem] md:text-[2.7rem]">{t.landing.trustTitle}</h2>
                        <p className="mt-4 leading-relaxed text-text-2">{t.landing.trustBody}</p>
                    </div>
                    <ul className="grid gap-5">
                        {[
                            { icon: BadgeCheck, title: t.trust.verifiedTitle, body: t.landing.trustVerified, tone: "text-[#0095f6]" },
                            { icon: Sparkles, title: t.trust.submissionTitle, body: t.landing.trustCommunity, tone: "text-text-2" },
                            { icon: MapPin, title: t.trust.osmTitle, body: t.landing.trustOsm, tone: "text-text-2" },
                        ].map((item) => (
                            <li key={item.title} className="flex gap-4">
                                <item.icon size={22} strokeWidth={1.8} className={`mt-0.5 shrink-0 ${item.tone}`} />
                                <div>
                                    <p className="font-semibold">{item.title}</p>
                                    <p className="mt-0.5 text-[0.92rem] leading-relaxed text-muted">{item.body}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* ---------------- The founder ---------------- */}
            <section className="mx-auto max-w-6xl px-4 pt-20 md:px-6 md:pt-28">
                <Link href={paths.about(locale)} className="nt-reveal group grid items-center gap-6 md:grid-cols-[minmax(0,20rem)_1fr] md:gap-14">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[1.4rem] bg-surface-3 md:aspect-[3/4]">
                        <Image
                            src={FOUNDER.photo}
                            alt={`${FOUNDER.name}, ${FOUNDER.role[locale]}`}
                            fill
                            sizes="(min-width: 768px) 320px, 100vw"
                            className="object-cover object-[50%_16%] transition duration-700 ease-out group-hover:scale-[1.03]"
                        />
                    </div>
                    <div>
                        <p className="nt-eyebrow">{t.about.homeEyebrow}</p>
                        <h2 className="nt-serif mt-2 text-[2.1rem] md:text-[3.2rem]">{fill(t.about.homeTitle, { name: FOUNDER.name })}</h2>
                        <p className="mt-4 max-w-xl leading-relaxed text-text-2">{FOUNDER.lead[locale]}</p>
                        <span className="mt-5 inline-flex items-center gap-1.5 font-semibold">
                            {t.about.readStory}
                            <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                        </span>
                    </div>
                </Link>
            </section>

            {/* ---------------- FAQ ---------------- */}
            <section className="mx-auto max-w-3xl px-4 pt-20 md:px-6 md:pt-28">
                <h2 className="nt-reveal nt-serif mb-6 text-[2.3rem] md:text-[3rem]">{t.landing.faqTitle}</h2>
                <div className="divide-y divide-line border-y border-line">
                    {t.landing.faq.map((item) => (
                        <details key={item.q} className="group py-5">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[1.02rem] font-semibold [&::-webkit-details-marker]:hidden">
                                {item.q}
                                <Plus size={18} strokeWidth={1.8} className="shrink-0 text-muted transition-transform duration-300 group-open:rotate-45" />
                            </summary>
                            <p className="mt-3 leading-relaxed text-text-2">{item.a}</p>
                        </details>
                    ))}
                </div>
            </section>

            {/* ---------------- Add a place / owners ---------------- */}
            <section className="mx-auto grid max-w-6xl gap-3 px-4 pt-20 md:grid-cols-2 md:gap-4 md:px-6 md:pt-28">
                <Link href={paths.submit(locale)} className="nt-reveal nt-pressable group flex flex-col justify-between gap-8 rounded-[1.6rem] border border-line bg-surface p-6 md:p-8">
                    <Plus size={22} strokeWidth={1.7} className="text-brand-600" />
                    <span>
                        <span className="nt-serif block text-[2rem]">{t.landing.addTitle}</span>
                        <span className="mt-2 block text-[0.95rem] text-muted">{t.landing.addBody}</span>
                        <span className="mt-5 inline-flex items-center gap-1.5 font-semibold">
                            {t.nav.suggest}
                            <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                        </span>
                    </span>
                </Link>
                <Link href={paths.pro(locale)} className="nt-reveal nt-pressable group flex flex-col justify-between gap-8 rounded-[1.6rem] bg-[#15110e] p-6 text-white md:p-8">
                    <Store size={22} strokeWidth={1.7} className="text-brand-400" />
                    <span>
                        <span className="nt-serif block text-[2rem]">{t.landing.ownerTitle}</span>
                        <span className="mt-2 block text-[0.95rem] text-white/65">{t.landing.ownerBody}</span>
                        <span className="mt-5 inline-flex items-center gap-1.5 font-semibold">
                            {t.nav.pro}
                            <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                        </span>
                    </span>
                </Link>
            </section>
        </div>
    );
}
