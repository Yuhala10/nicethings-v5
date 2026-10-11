import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPosts, localised } from "@/lib/blog/server";
import { CITIES } from "@/lib/cities";
import { fill, getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { availableCollections } from "@/lib/places/collections";
import { paths } from "@/lib/places/paths";
import { getAllPlaces, getStoryPlaces } from "@/lib/places/server";

// The whole site on one page, in order: where to start, every city with
// what it holds, the places that carry a story, every article. For people
// who want to see how it is all laid out, and for search engines.

export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    const t = getDictionary(lang);
    const path = (locale: Locale) => paths.sitemapPage(locale);
    return {
        title: t.siteMap.title,
        description: t.siteMap.lead,
        alternates: { canonical: path(lang), languages: { fr: path("fr"), en: path("en"), "x-default": path("fr") } },
    };
}

export default async function SiteMapPage({ params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    const t = getDictionary(lang);
    const [places, posts, stories] = await Promise.all([getAllPlaces().catch(() => []), getPosts().catch(() => []), getStoryPlaces().catch(() => [])]);

    const cities = CITIES.map((city) => {
        const inCity = places.filter((place) => place.city === city.slug);
        return { city, count: inCity.length, collections: availableCollections(inCity) };
    }).filter((entry) => entry.count > 0);

    const start = [
        { href: paths.home(lang), label: t.nav.home },
        { href: paths.searchEntry(lang), label: t.nav.search },
        { href: paths.map(lang), label: t.nav.map },
        { href: paths.culture(lang), label: t.nav.culture },
        { href: paths.blog(lang), label: t.nav.blog },
        { href: paths.saved(lang), label: t.nav.saved },
        { href: paths.submit(lang), label: t.nav.suggest },
        { href: paths.about(lang), label: t.about.nav },
        { href: paths.privacy(lang), label: t.footer.privacy },
        { href: paths.terms(lang), label: t.footer.terms },
    ];
    const link = "underline decoration-line-strong decoration-1 underline-offset-4 hover:decoration-text";
    const heading = "nt-serif text-[1.75rem] leading-tight md:text-[2.25rem]";

    return (
        <div className="mx-auto max-w-5xl px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-24 md:px-6 md:pt-14">
            <p className="nt-eyebrow">NiceThings</p>
            <h1 className="nt-serif mt-2 text-[2.75rem] leading-[1] md:text-[3.5rem]">{t.siteMap.title}</h1>
            <p className="mt-4 max-w-2xl text-[1.125rem] leading-relaxed text-text-2">{t.siteMap.lead}</p>

            <section className="mt-12 border-t border-line pt-8">
                <h2 className={heading}>{t.siteMap.start}</h2>
                <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
                    {start.map((item) => (
                        <li key={item.href}>
                            <Link href={item.href} className={`inline-flex min-h-11 items-center text-[1rem] ${link}`}>
                                {item.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="mt-12 border-t border-line pt-8">
                <h2 className={heading}>{t.siteMap.cities}</h2>
                <ul className="mt-6 grid gap-x-10 gap-y-8 md:grid-cols-2">
                    {cities.map(({ city, count, collections }) => (
                        <li key={city.slug}>
                            <Link href={paths.city(lang, city.slug)} className="group flex items-baseline justify-between gap-4 border-b border-line pb-2">
                                <span className="nt-serif text-[1.5rem] group-hover:text-brand-600">{city.name}</span>
                                <span className="shrink-0 text-[0.875rem] text-muted tabular-nums">{fill(t.city.placesCount, { count })}</span>
                            </Link>
                            {collections.length > 0 && (
                                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-0.5 text-[0.875rem] text-text-2">
                                    {collections.map(({ collection, count: size }) => (
                                        <li key={collection.key}>
                                            <Link href={paths.collection(lang, city.slug, collection)} className={`inline-flex min-h-9 items-center ${link}`}>
                                                {collection.name[lang]} <span className="ml-1 text-muted tabular-nums">{size}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            </section>

            {stories.length > 0 && (
                <section className="mt-12 border-t border-line pt-8">
                    <h2 className={heading}>{t.culture.placesTitle}</h2>
                    <ul className="mt-5 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                        {stories.map((place) => (
                            <li key={place.id}>
                                <Link href={paths.place(lang, place.slug)} className={`inline-flex min-h-11 items-center text-[1rem] ${link}`}>
                                    {place.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {posts.length > 0 && (
                <section className="mt-12 border-t border-line pt-8">
                    <h2 className={heading}>{t.siteMap.articles}</h2>
                    <ul className="mt-5 grid gap-y-1">
                        {posts.map((post) => (
                            <li key={post.id}>
                                <Link href={paths.post(lang, post.slug)} className={`inline-flex min-h-11 items-center text-[1rem] ${link}`}>
                                    {localised(post, lang).title}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
