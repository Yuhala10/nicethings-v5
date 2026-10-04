import Link from "next/link";
import {
    ArrowRight,
    BadgeCheck,
    Clock3,
    Heart,
    Languages,
    Map as MapIcon,
    MessageCircle,
    Navigation,
    Plus,
    Search,
    Sparkles,
    Volume2,
} from "lucide-react";
import PostCard from "@/components/blog/PostCard";
import PinCard from "@/components/place/PinCard";
import { LanguageSwitch, Logo } from "@/components/site/SiteChrome";
import { CITIES, type City } from "@/lib/cities";
import { fill, getDictionary, type Locale } from "@/lib/i18n";
import { formatNumber } from "@/lib/i18n/format";
import { paths } from "@/lib/places/paths";
import type { PlaceSummary } from "@/lib/places/types";
import type { PostSummary } from "@/lib/blog/server";
import Constellation from "./Constellation";
import HeroSearch from "./HeroSearch";

// City card colours: each city gets its own sunset.
const CITY_GRADIENTS = [
    "linear-gradient(140deg,#ff8a1f,#eb3a6f)",
    "linear-gradient(140deg,#7c3aed,#ec4899)",
    "linear-gradient(140deg,#0891b2,#2563eb)",
    "linear-gradient(140deg,#16a34a,#0891b2)",
    "linear-gradient(140deg,#f59e0b,#dc2626)",
    "linear-gradient(140deg,#db2777,#7c3aed)",
    "linear-gradient(140deg,#0f766e,#84cc16)",
    "linear-gradient(140deg,#ea580c,#a16207)",
];

type Demo = { phrase: string; chips: string[] };

export default function Landing({
    locale,
    points,
    labels,
    cityCounts,
    areaCount,
    picks,
    posts,
    demos,
}: {
    locale: Locale;
    points: number[];
    labels: { name: string; x: number; y: number; count: number }[];
    cityCounts: Record<string, number>;
    areaCount: number;
    picks: PlaceSummary[];
    posts: PostSummary[];
    demos: Demo[];
}) {
    const t = getDictionary(locale);
    const total = Object.values(cityCounts).reduce((sum, value) => sum + value, 0);
    const cities = CITIES.filter((city) => (cityCounts[city.slug] ?? 0) > 0).sort(
        (a, b) => (cityCounts[b.slug] ?? 0) - (cityCounts[a.slug] ?? 0)
    );

    const faqJsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: t.landing.faq.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
    };

    const features = [
        { icon: Navigation, title: t.landing.f1Title, body: t.landing.f1Body },
        { icon: Volume2, title: t.landing.f2Title, body: t.landing.f2Body },
        { icon: Clock3, title: t.landing.f3Title, body: t.landing.f3Body },
        { icon: MessageCircle, title: t.landing.f4Title, body: t.landing.f4Body },
        { icon: Heart, title: t.landing.f5Title, body: t.landing.f5Body },
        { icon: Languages, title: t.landing.f6Title, body: t.landing.f6Body },
    ];

    const steps = [
        { icon: Search, title: t.landing.s1Title, body: t.landing.s1Body },
        { icon: Sparkles, title: t.landing.s2Title, body: t.landing.s2Body },
        { icon: Navigation, title: t.landing.s3Title, body: t.landing.s3Body },
    ];

    return (
        <div className="bg-bg">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />

            {/* ---------------- Hero ---------------- */}
            <section className="relative isolate overflow-hidden bg-[#0b0806] text-white">
                <div className="nt-sunset pointer-events-none absolute -top-48 left-1/2 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full opacity-30 blur-[110px] md:left-[70%]" />
                <div className="pointer-events-none absolute -bottom-40 -left-20 -z-10 h-96 w-96 rounded-full bg-[#7c3aed] opacity-25 blur-[100px]" />
                <div
                    className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
                    style={{ backgroundImage: "radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)", backgroundSize: "24px 24px" }}
                />
                <Constellation
                    points={points}
                    labels={labels}
                    className="pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-full opacity-35 md:w-[52%] md:opacity-100"
                />

                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)] md:px-6 md:pt-6">
                    <Logo light />
                    <div className="flex items-center gap-2">
                        <Link href={paths.map(locale)} className="nt-btn nt-btn-glass hidden h-10 px-4 text-sm md:inline-flex">
                            <MapIcon size={16} />
                            {t.nav.map}
                        </Link>
                        <LanguageSwitch className="h-10 border-white/20 bg-white/10 text-white hover:border-white/40 hover:text-white" />
                    </div>
                </div>

                <div className="mx-auto max-w-6xl px-4 pt-14 pb-16 md:px-6 md:pt-24 md:pb-28">
                    <div className="max-w-2xl">
                        <p className="nt-rise mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[0.78rem] font-bold text-white/85 backdrop-blur">
                            <span className="nt-open-dot" />
                            {fill(t.landing.badge, { places: formatNumber(total, locale), cities: cities.length })}
                        </p>
                        <h1 className="nt-rise text-[2.7rem] leading-[0.98] font-extrabold tracking-[-0.035em] [animation-delay:80ms] md:text-[4.6rem]">
                            {t.landing.title1} <span className="nt-sunset-text">{t.landing.title2}</span>
                        </h1>
                        <p className="nt-rise mt-5 max-w-xl text-[1.05rem] leading-relaxed text-white/72 [animation-delay:160ms] md:text-xl">
                            {t.landing.lead}
                        </p>
                        <div className="nt-rise mt-8 [animation-delay:240ms]">
                            <HeroSearch />
                        </div>
                    </div>

                    <dl className="nt-rise mt-14 grid max-w-xl grid-cols-3 gap-3 [animation-delay:320ms]">
                        {[
                            { value: formatNumber(total, locale), label: t.landing.statPlaces },
                            { value: String(cities.length), label: t.landing.statCities },
                            { value: formatNumber(areaCount, locale), label: t.landing.statAreas },
                        ].map((stat) => (
                            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur">
                                <dd className="font-display text-2xl font-extrabold md:text-3xl">{stat.value}</dd>
                                <dt className="mt-0.5 text-[0.75rem] font-semibold text-white/55">{stat.label}</dt>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            {/* ---------------- Cities ---------------- */}
            <section className="mx-auto max-w-6xl px-4 pt-16 md:px-6 md:pt-24">
                <div className="nt-reveal mb-6 flex items-end justify-between gap-4">
                    <div>
                        <p className="nt-eyebrow mb-2">{t.landing.citiesEyebrow}</p>
                        <h2 className="text-3xl leading-tight font-extrabold md:text-5xl">{t.landing.citiesTitle}</h2>
                    </div>
                </div>
                <ul className="nt-scroll-x -mx-4 gap-3 px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
                    {cities.map((city: City, index) => (
                        <li key={city.slug} className="nt-reveal w-[15.5rem] shrink-0 md:w-auto">
                            <Link
                                href={paths.explore(locale, city.slug)}
                                className="nt-pressable group relative flex h-44 flex-col justify-end overflow-hidden rounded-[1.6rem] p-4 text-white shadow-card"
                                style={{ background: CITY_GRADIENTS[index % CITY_GRADIENTS.length] }}
                            >
                                <div
                                    className="pointer-events-none absolute inset-0 opacity-20"
                                    style={{ backgroundImage: "radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)", backgroundSize: "14px 14px" }}
                                />
                                <span className="absolute top-4 right-4 rounded-full bg-black/20 px-2.5 py-1 text-[0.72rem] font-bold backdrop-blur">
                                    {fill(t.city.placesCount, { count: formatNumber(cityCounts[city.slug] ?? 0, locale) })}
                                </span>
                                <span className="relative text-[0.72rem] font-bold tracking-[0.1em] text-white/75 uppercase">{city.region[locale]}</span>
                                <span className="relative font-display text-[1.7rem] leading-tight font-extrabold">{city.name}</span>
                                <span className="relative line-clamp-1 text-[0.82rem] text-white/85">{city.tagline[locale]}</span>
                                <ArrowRight
                                    size={20}
                                    className="absolute right-4 bottom-4 transition duration-300 group-hover:translate-x-1"
                                />
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>

            {/* ---------------- Concierge demo ---------------- */}
            <section className="mx-auto max-w-6xl px-4 pt-20 md:px-6 md:pt-28">
                <div className="grid items-center gap-10 md:grid-cols-2">
                    <div className="nt-reveal">
                        <p className="nt-eyebrow mb-2">{t.landing.conciergeEyebrow}</p>
                        <h2 className="text-3xl leading-tight font-extrabold md:text-5xl">{t.landing.conciergeTitle}</h2>
                        <p className="mt-4 max-w-md text-text-2 md:text-lg">{t.landing.conciergeBody}</p>
                        <Link href={paths.map(locale)} className="nt-btn nt-btn-primary mt-7">
                            {t.landing.tryIt}
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                    <ul className="flex flex-col gap-3">
                        {demos.map((demo) => (
                            <li key={demo.phrase} className="nt-reveal">
                                <Link
                                    href={paths.map(locale, demo.phrase)}
                                    className="nt-pressable block rounded-[1.5rem] border border-line bg-surface p-4 shadow-card"
                                >
                                    <p className="flex items-start gap-2 font-semibold text-text">
                                        <Search size={17} className="mt-0.5 shrink-0 text-brand-500" />« {demo.phrase} »
                                    </p>
                                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                        <span className="text-[0.7rem] font-bold tracking-wide text-brand-600 uppercase">{t.search.understood}</span>
                                        {demo.chips.map((chip) => (
                                            <span
                                                key={chip}
                                                className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 dark:bg-brand-700/25 dark:text-brand-200"
                                            >
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

            {/* ---------------- How it works ---------------- */}
            <section className="mx-auto max-w-6xl px-4 pt-20 md:px-6 md:pt-28">
                <div className="nt-reveal mb-8 max-w-2xl">
                    <p className="nt-eyebrow mb-2">{t.landing.howEyebrow}</p>
                    <h2 className="text-3xl leading-tight font-extrabold md:text-5xl">{t.landing.howTitle}</h2>
                </div>
                <ol className="grid gap-3 md:grid-cols-3">
                    {steps.map((step, index) => (
                        <li key={step.title} className="nt-reveal relative overflow-hidden rounded-[1.6rem] border border-line bg-surface p-6 shadow-card">
                            <span className="pointer-events-none absolute -top-4 -right-2 font-display text-[6rem] leading-none font-extrabold text-surface-2">
                                {index + 1}
                            </span>
                            <span className="nt-sunset relative mb-5 grid h-12 w-12 place-items-center rounded-2xl text-white shadow-[var(--nt-glow)]">
                                <step.icon size={22} />
                            </span>
                            <h3 className="relative text-xl font-extrabold">{step.title}</h3>
                            <p className="relative mt-2 text-text-2">{step.body}</p>
                        </li>
                    ))}
                </ol>
            </section>

            {/* ---------------- Picks ---------------- */}
            {picks.length > 0 && (
                <section className="pt-20 md:pt-28">
                    <div className="nt-reveal mx-auto mb-6 max-w-6xl px-4 md:px-6">
                        <p className="nt-eyebrow mb-2">{t.landing.picksEyebrow}</p>
                        <h2 className="text-3xl leading-tight font-extrabold md:text-5xl">{t.landing.picksTitle}</h2>
                    </div>
                    <div className="mx-auto max-w-6xl px-4 md:px-6">
                        <ul className="nt-masonry columns-2 md:columns-3 lg:columns-4">
                            {picks.map((place) => (
                                <li key={place.id}>
                                    <PinCard place={place} />
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            )}

            {/* ---------------- Blog ---------------- */}
            {posts.length > 0 && (
                <section className="mx-auto max-w-6xl px-4 pt-20 md:px-6 md:pt-28">
                    <div className="nt-reveal mb-6 flex items-end justify-between gap-4">
                        <div>
                            <p className="nt-eyebrow mb-2">{t.blog.title}</p>
                            <h2 className="text-3xl leading-tight font-extrabold md:text-5xl">{t.blog.lead.split(".")[0]}.</h2>
                        </div>
                        <Link href={paths.blog(locale)} className="nt-btn nt-btn-soft hidden shrink-0 sm:inline-flex">
                            {t.blog.back}
                            <ArrowRight size={17} />
                        </Link>
                    </div>
                    <div className="nt-masonry columns-2 md:columns-4">
                        {posts.slice(0, 4).map((post) => (
                            <div key={post.id}>
                                <PostCard post={post} locale={locale} />
                            </div>
                        ))}
                    </div>
                    <Link href={paths.blog(locale)} className="nt-btn nt-btn-soft mt-2 w-full sm:hidden">
                        {t.blog.back}
                        <ArrowRight size={17} />
                    </Link>
                </section>
            )}

            {/* ---------------- Features ---------------- */}
            <section className="mx-auto max-w-6xl px-4 pt-20 md:px-6 md:pt-28">
                <div className="nt-reveal relative overflow-hidden rounded-[2.2rem] bg-[#0b0806] p-6 text-white md:p-12">
                    <div className="nt-sunset pointer-events-none absolute -right-20 -bottom-32 h-80 w-80 rounded-full opacity-30 blur-[90px]" />
                    <p className="mb-2 text-[0.72rem] font-bold tracking-[0.12em] text-brand-400 uppercase">{t.landing.featuresEyebrow}</p>
                    <h2 className="max-w-2xl text-3xl leading-tight font-extrabold md:text-5xl">{t.landing.featuresTitle}</h2>
                    <ul className="relative mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map((feature) => (
                            <li key={feature.title} className="flex gap-4">
                                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-brand-400">
                                    <feature.icon size={21} />
                                </span>
                                <div>
                                    <h3 className="text-lg font-bold">{feature.title}</h3>
                                    <p className="mt-1 text-[0.92rem] text-white/65">{feature.body}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* ---------------- Trust ---------------- */}
            <section className="mx-auto max-w-6xl px-4 pt-20 md:px-6 md:pt-28">
                <div className="nt-reveal grid items-center gap-8 md:grid-cols-[1fr_1.1fr]">
                    <div>
                        <p className="nt-eyebrow mb-2">{t.landing.trustEyebrow}</p>
                        <h2 className="text-3xl leading-tight font-extrabold md:text-5xl">{t.landing.trustTitle}</h2>
                        <p className="mt-4 text-text-2 md:text-lg">{t.landing.trustBody}</p>
                    </div>
                    <ul className="grid gap-3">
                        {[
                            { icon: BadgeCheck, title: t.trust.verifiedTitle, body: t.landing.trustVerified, tone: "text-[#0095f6]" },
                            { icon: Sparkles, title: t.trust.submissionTitle, body: t.landing.trustCommunity, tone: "text-[#7c3aed]" },
                            { icon: MapIcon, title: t.trust.osmTitle, body: t.landing.trustOsm, tone: "text-[#0891b2]" },
                        ].map((item) => (
                            <li key={item.title} className="flex gap-4 rounded-[1.4rem] border border-line bg-surface p-4 shadow-card">
                                <item.icon size={24} className={`mt-0.5 shrink-0 ${item.tone}`} />
                                <div>
                                    <p className="font-bold">{item.title}</p>
                                    <p className="mt-0.5 text-sm text-text-2">{item.body}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* ---------------- FAQ ---------------- */}
            <section className="mx-auto max-w-3xl px-4 pt-20 md:px-6 md:pt-28">
                <h2 className="nt-reveal mb-6 text-3xl leading-tight font-extrabold md:text-5xl">{t.landing.faqTitle}</h2>
                <div className="flex flex-col gap-2.5">
                    {t.landing.faq.map((item) => (
                        <details key={item.q} className="nt-reveal group rounded-[1.3rem] border border-line bg-surface p-5 shadow-card open:shadow-float">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold [&::-webkit-details-marker]:hidden">
                                {item.q}
                                <Plus size={20} className="shrink-0 text-brand-500 transition duration-300 group-open:rotate-45" />
                            </summary>
                            <p className="mt-3 leading-relaxed text-text-2">{item.a}</p>
                        </details>
                    ))}
                </div>
            </section>

            {/* ---------------- Final call ---------------- */}
            <section className="mx-auto max-w-6xl px-4 pt-20 md:px-6 md:pt-28">
                <div className="nt-reveal nt-sunset relative overflow-hidden rounded-[2.2rem] p-8 text-center text-white shadow-[var(--nt-glow)] md:p-16">
                    <div
                        className="pointer-events-none absolute inset-0 opacity-20"
                        style={{ backgroundImage: "radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)", backgroundSize: "18px 18px" }}
                    />
                    <h2 className="relative mx-auto max-w-2xl text-3xl leading-tight font-extrabold md:text-5xl">{t.landing.ctaTitle}</h2>
                    <p className="relative mx-auto mt-3 max-w-lg text-white/85 md:text-lg">{t.landing.ctaBody}</p>
                    <div className="relative mt-8 flex flex-wrap justify-center gap-3">
                        <Link href={paths.map(locale)} className="nt-btn h-13 bg-white px-6 text-base text-[#17120e] shadow-float">
                            <MapIcon size={19} />
                            {t.landing.ctaMap}
                        </Link>
                        <Link href={paths.submit(locale)} className="nt-btn nt-btn-glass h-13 px-6 text-base">
                            <Plus size={19} />
                            {t.nav.suggest}
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
