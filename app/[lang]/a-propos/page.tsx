import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, BadgeCheck, Mail, Plus, Store, Wallet } from "lucide-react";
import PostCard from "@/components/blog/PostCard";
import { LanguageSwitch, Logo } from "@/components/site/SiteChrome";
import { getPosts } from "@/lib/blog/server";
import { CITIES, DEFAULT_CITY } from "@/lib/cities";
import { FOUNDER, ORGANIZATION_ID, founderJsonLd, isFounder } from "@/lib/founder";
import { SITE_URL, fill, getDictionary, isLocale } from "@/lib/i18n";
import { formatNumber } from "@/lib/i18n/format";
import { areasOf } from "@/lib/places/areas";
import { paths } from "@/lib/places/paths";
import { getAllPlaces } from "@/lib/places/server";
import { founderShareImage } from "@/lib/share-image";

export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    // The name first: this is the page a search for the founder should find.
    const title = `${FOUNDER.name} — ${FOUNDER.role[lang]}`;
    const description = FOUNDER.lead[lang];
    const image = founderShareImage(lang);
    return {
        title: { absolute: title },
        description,
        alternates: { canonical: paths.about(lang), languages: { fr: paths.about("fr"), en: paths.about("en"), "x-default": paths.about("fr") } },
        robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
        openGraph: { type: "profile", title, description, url: paths.about(lang), images: [image] },
        twitter: { card: "summary_large_image", images: [image.url] },
    };
}

// Who is behind NiceThings, laid out like a magazine profile: the portrait
// and the name, the story, what he has built, then how the guide is made.
// Every figure is counted from the live catalogue.
export default async function AboutPage({ params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    const t = getDictionary(lang);

    const places = await getAllPlaces().catch(() => []);
    let cityCount = 0;
    let areaCount = 0;
    for (const city of CITIES) {
        const inCity = places.filter((place) => place.city === city.slug);
        if (inCity.length) cityCount += 1;
        areaCount += areasOf(inCity, 2).length;
    }
    const figures = [
        { value: places.length, label: t.about.places },
        { value: cityCount, label: t.about.cities },
        { value: areaCount, label: t.about.areas },
    ].filter((figure) => figure.value > 0);

    const posts = (await getPosts().catch(() => [])).filter((post) => isFounder(post.author)).slice(0, 4);
    const [pullFirst, pullSecond] = FOUNDER.pull[lang];
    const how = [BadgeCheck, Wallet, Store].map((icon, index) => ({ icon, ...t.about.how[index] }));

    const url = `${SITE_URL}${paths.about(lang)}`;
    const jsonLd = [
        {
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            url,
            name: `${FOUNDER.name} — ${FOUNDER.role[lang]}`,
            inLanguage: lang === "fr" ? "fr-CM" : "en-CM",
            about: { "@id": ORGANIZATION_ID },
            mainEntity: founderJsonLd(url, lang),
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
                { "@type": "ListItem", position: 1, name: "NiceThings", item: `${SITE_URL}/${lang}` },
                { "@type": "ListItem", position: 2, name: t.about.nav, item: url },
            ],
        },
    ];

    return (
        <div className="mx-auto max-w-6xl px-4 pt-[max(env(safe-area-inset-top),1rem)] md:px-6 md:pt-14">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

            {/* Phone masthead (desktop has the site header). */}
            <div className="mb-5 flex items-center justify-between md:hidden">
                <Logo compact />
                <LanguageSwitch />
            </div>

            {/* ---------------- The portrait and the name ---------------- */}
            <header className="grid gap-7 md:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] md:items-center md:gap-16">
                <div className="nt-rise order-2 md:order-1">
                    <p className="nt-eyebrow">{FOUNDER.role[lang]}</p>
                    <h1 className="nt-serif mt-3 text-[3.3rem] leading-[0.98] md:text-[5.6rem]">{FOUNDER.name}</h1>
                    <p className="mt-5 max-w-lg text-[1.05rem] leading-relaxed text-text-2 md:mt-7 md:text-[1.2rem]">{FOUNDER.lead[lang]}</p>
                    <div className="mt-7 flex flex-wrap items-center gap-2.5">
                        <a href={`mailto:${FOUNDER.email}`} className="nt-btn nt-btn-dark">
                            <Mail size={17} />
                            {t.about.email}
                        </a>
                        {FOUNDER.links.map((link) => (
                            <a key={link.url} href={link.url} target="_blank" rel="me noopener noreferrer" className="nt-btn nt-btn-outline">
                                {link.label}
                                <ArrowUpRight size={16} />
                            </a>
                        ))}
                        <a href="#histoire" className="nt-btn nt-btn-outline">
                            {t.about.readStory}
                        </a>
                    </div>
                </div>
                <div className="relative order-1 aspect-[3/4] overflow-hidden rounded-[1.4rem] bg-surface-3 shadow-card md:order-2">
                    <Image src={FOUNDER.photo} alt={`${FOUNDER.name}, ${FOUNDER.role[lang]}`} fill priority sizes="(min-width: 768px) 432px, 100vw" className="object-cover" />
                </div>
            </header>

            {/* ---------------- The line the story turns on ---------------- */}
            <p className="nt-serif mx-auto mt-16 max-w-4xl text-center text-[2.3rem] leading-[1.08] md:mt-28 md:text-[4.2rem]">
                {pullFirst} <em className="text-brand-600">{pullSecond}</em>
            </p>

            {/* ---------------- The story ---------------- */}
            <section id="histoire" className="mt-14 grid scroll-mt-24 gap-12 md:mt-24 md:grid-cols-[17rem_minmax(0,1fr)] md:gap-16">
                <div className="mx-auto w-full max-w-2xl md:order-2 md:mx-0">
                    <p className="nt-eyebrow">{t.about.storyEyebrow}</p>
                    <div className="nt-article mt-3">
                        {FOUNDER.story[lang].map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                        ))}
                    </div>
                </div>

                <aside className="md:order-1">
                    <div className="md:sticky md:top-24">
                        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.1rem] bg-surface-3">
                            <Image src={FOUNDER.secondPhoto} alt={FOUNDER.name} fill sizes="(min-width: 768px) 272px, 100vw" className="object-cover object-top grayscale" />
                        </div>
                        <dl className="mt-6 divide-y divide-line border-y border-line text-[0.92rem]">
                            <div className="flex items-baseline justify-between gap-4 py-3">
                                <dt className="text-muted">{t.about.studies}</dt>
                                <dd className="text-right font-semibold">
                                    {FOUNDER.school.short} · {FOUNDER.school.year[lang]}
                                </dd>
                            </div>
                            {FOUNDER.works.map((work) => (
                                <div key={work.name} className="py-3">
                                    <dt className="nt-serif text-[1.3rem]">
                                        {work.url ? (
                                            <a href={work.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-brand-600">
                                                {work.name}
                                                <ArrowUpRight size={15} className="text-muted" />
                                            </a>
                                        ) : (
                                            work.name
                                        )}
                                    </dt>
                                    <dd className="mt-0.5 text-muted">{work.note[lang]}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </aside>
            </section>

            {/* ---------------- Where the guide stands ---------------- */}
            {figures.length > 0 && (
                <section className="mt-16 md:mt-28">
                    <p className="nt-eyebrow">{t.about.figuresEyebrow}</p>
                    <dl className="mt-4 grid grid-cols-3 gap-4 border-y border-line py-8 md:py-10">
                        {figures.map((figure) => (
                            <div key={figure.label} className="flex flex-col-reverse justify-end gap-1.5">
                                <dt className="text-[0.8rem] leading-snug text-muted md:text-[0.9rem]">{figure.label}</dt>
                                <dd className="nt-serif text-[2.2rem] md:text-[3.6rem]">{formatNumber(figure.value, lang)}</dd>
                            </div>
                        ))}
                    </dl>
                </section>
            )}

            {/* ---------------- How it is made ---------------- */}
            <section className="mt-14 md:mt-20">
                <h2 className="nt-serif text-[2.1rem] md:text-[2.7rem]">{t.about.howTitle}</h2>
                <ul className="mt-7 grid gap-7 md:grid-cols-3 md:gap-10">
                    {how.map((item) => (
                        <li key={item.title}>
                            <item.icon size={22} strokeWidth={1.8} className="text-brand-600" />
                            <p className="mt-3 font-semibold">{item.title}</p>
                            <p className="mt-1.5 text-[0.95rem] leading-relaxed text-muted">{item.body}</p>
                        </li>
                    ))}
                </ul>
            </section>

            {posts.length > 0 && (
                <section className="mt-16 md:mt-24">
                    <h2 className="nt-section-title mb-5">{fill(t.about.articlesTitle, { name: FOUNDER.name })}</h2>
                    <div className="nt-masonry columns-2 sm:columns-3 lg:columns-4">
                        {posts.map((post) => (
                            <div key={post.id}>
                                <PostCard post={post} locale={lang} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ---------------- Get in touch ---------------- */}
            <section className="mt-16 rounded-[1.6rem] bg-[#15110e] p-6 text-white md:mt-24 md:p-12">
                <h2 className="nt-serif max-w-xl text-[2rem] md:text-[2.8rem]">{t.about.contactTitle}</h2>
                <p className="mt-3 text-[0.95rem] text-white/65">{t.about.contactBody}</p>
                <div className="mt-6 flex flex-wrap gap-2.5">
                    <a href={`mailto:${FOUNDER.email}`} className="nt-btn nt-btn-primary">
                        <Mail size={17} />
                        {t.about.email}
                    </a>
                    <Link href={paths.submit(lang)} className="nt-btn nt-btn-glass">
                        <Plus size={17} />
                        {t.nav.suggest}
                    </Link>
                    <Link href={paths.city(lang, DEFAULT_CITY.slug)} className="nt-btn nt-btn-glass">
                        {fill(t.about.explore, { city: DEFAULT_CITY.name })}
                        <ArrowRight size={17} />
                    </Link>
                </div>
            </section>
        </div>
    );
}
