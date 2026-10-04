import Link from "next/link";
import { ChevronRight, Map as MapIcon, Plus, Search } from "lucide-react";
import PinCard from "@/components/place/PinCard";
import { SITE_URL, fill, getDictionary, type Locale } from "@/lib/i18n";
import { categoryStyle, knownFacts } from "@/lib/places/display";
import { CATEGORY_PLURALS, paths } from "@/lib/places/paths";
import type { PlaceSummary } from "@/lib/places/types";
import type { Category } from "@/lib/tags";

// Shared layout for the SEO guides: /douala, /douala/akwa, /douala/bars,
// /douala/akwa/bars. Everything here is server-rendered and crawlable.

const GUIDE_LIMIT = 48;

export function plural(category: string, locale: Locale) {
    return CATEGORY_PLURALS[category as Category]?.[locale] ?? category;
}

// Richest listings first, then alphabetical so the order is stable.
export function sortForGuide(places: PlaceSummary[]) {
    return [...places].sort(
        (a, b) => Number(b.verified) - Number(a.verified) || knownFacts(b) - knownFacts(a) || a.name.localeCompare(b.name, "fr")
    );
}

export function countBy<T extends string>(places: PlaceSummary[], key: (place: PlaceSummary) => T | null) {
    const counts = new Map<T, number>();
    for (const place of places) {
        const value = key(place);
        if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
    return (
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1 text-[0.8rem] text-muted">
            {items.map((item, index) => (
                <span key={item.label} className="inline-flex items-center gap-1">
                    {index > 0 && <ChevronRight size={13} className="opacity-60" />}
                    {item.href ? (
                        <Link href={item.href} className="transition-colors hover:text-text">
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-text-2">{item.label}</span>
                    )}
                </span>
            ))}
        </nav>
    );
}

export function CategoryIcon({ category, size = 18 }: { category: string; size?: number }) {
    const style = categoryStyle(category);
    const Icon = style.icon;
    return (
        <span
            className="nt-art grid h-10 w-10 shrink-0 place-items-center rounded-[0.8rem]"
            style={{ "--tone": style.tone } as React.CSSProperties}
            aria-hidden
        >
            <Icon size={size} strokeWidth={1.8} />
        </span>
    );
}

export function LinkChips({ title, links }: { title: string; links: { href: string; label: string; count: number }[] }) {
    if (!links.length) return null;
    return (
        <section className="nt-reveal mt-14">
            <h2 className="nt-section-title mb-4">{title}</h2>
            <ul className="flex flex-wrap gap-2">
                {links.map((link) => (
                    <li key={link.href}>
                        <Link href={link.href} className="nt-chip">
                            {link.label}
                            <span className="font-normal text-muted">{link.count}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}

// The editorial page header shared by guides, collections and the city hub:
// paper, a serif title, the facts in quiet numbers.
function GuideHero({
    crumbs,
    eyebrow,
    title,
    intro,
    actions,
    stats,
}: {
    crumbs: { label: string; href?: string }[];
    eyebrow?: string;
    title: string;
    intro: string;
    actions?: React.ReactNode;
    stats?: { value: string; label: string }[];
}) {
    return (
        <header className="mx-auto max-w-6xl px-4 pt-[max(env(safe-area-inset-top),1.25rem)] md:px-6 md:pt-12">
            <Breadcrumbs items={crumbs} />
            {eyebrow && <p className="nt-eyebrow">{eyebrow}</p>}
            <h1 className="nt-rise nt-serif mt-2 max-w-4xl text-[2.6rem] leading-[1] sm:text-[3.2rem] md:text-[4.2rem]">{title}</h1>
            <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-text-2 md:text-[1.08rem]">{intro}</p>
            {stats && stats.length > 0 && (
                <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-4">
                    {stats.map((stat) => (
                        <div key={stat.label}>
                            <dd className="nt-serif text-[2rem] leading-none">{stat.value}</dd>
                            <dt className="mt-1 text-[0.75rem] text-muted">{stat.label}</dt>
                        </div>
                    ))}
                </dl>
            )}
            {actions && <div className="mt-7 flex flex-wrap gap-2.5">{actions}</div>}
        </header>
    );
}

export default function GuideView({
    locale,
    city,
    title,
    eyebrow,
    intro,
    crumbs,
    places,
    mapQuery,
    filters,
    stats,
    editorial,
    presorted = false,
    children,
}: {
    locale: Locale;
    city: string; // city slug
    title: string;
    eyebrow?: string;
    intro: string;
    crumbs: { label: string; href?: string }[];
    places: PlaceSummary[] | null; // null: a hub page without its own list
    mapQuery: string;
    filters?: React.ReactNode;
    stats?: { value: string; label: string }[];
    editorial?: React.ReactNode; // full-width sections under the header
    presorted?: boolean; // keep the order given (collections)
    children?: React.ReactNode;
}) {
    const t = getDictionary(locale);
    const shown = places ? (presorted ? places : sortForGuide(places)).slice(0, GUIDE_LIMIT) : [];
    const mapHref = paths.explore(locale, city, mapQuery || undefined);

    const itemList = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: title,
        numberOfItems: places?.length ?? 0,
        itemListElement: shown.slice(0, 20).map((place, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${SITE_URL}${paths.place(locale, place.slug)}`,
            name: place.name,
        })),
    };
    const breadcrumbList = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((crumb, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: crumb.label,
            item: crumb.href ? `${SITE_URL}${crumb.href}` : undefined,
        })),
    };

    return (
        <div>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify([itemList, breadcrumbList]).replace(/</g, "\\u003c") }}
            />
            <GuideHero
                crumbs={crumbs}
                eyebrow={eyebrow}
                title={title}
                intro={intro}
                stats={stats}
                actions={
                    <>
                        <Link href={paths.search(locale, city, mapQuery || undefined)} className="nt-btn nt-btn-dark h-11 text-[0.9rem]">
                            <Search size={17} />
                            {t.nav.search}
                        </Link>
                        <Link href={mapHref} className="nt-btn nt-btn-outline h-11 text-[0.9rem]">
                            <MapIcon size={17} />
                            {t.city.seeOnMap}
                        </Link>
                    </>
                }
            />

            {editorial}

            <div className="mx-auto max-w-6xl px-4 pt-10 md:px-6">
                {filters}

                {places === null ? null : shown.length ? (
                    <ul className="nt-masonry mt-8 columns-2 md:columns-3 lg:columns-4">
                        {shown.map((place, index) => (
                            <li key={place.id}>
                                <PinCard place={place} priority={index < 2} />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="mt-8 rounded-[1.6rem] border border-dashed border-line-strong px-6 py-14 text-center">
                        <p className="nt-serif text-[1.7rem]">{t.city.emptyTitle}</p>
                        <p className="mx-auto mt-2 mb-6 max-w-sm text-text-2">{t.city.emptyGuide}</p>
                        <Link href={paths.submit(locale)} className="nt-btn nt-btn-primary">
                            <Plus size={18} />
                            {t.nav.suggest}
                        </Link>
                    </div>
                )}

                {places && places.length > shown.length && (
                    <div className="mt-10 text-center">
                        <Link href={mapHref} className="nt-btn nt-btn-outline">
                            <MapIcon size={17} />
                            {t.city.seeOnMap} · {fill(t.city.placesCount, { count: places.length })}
                        </Link>
                    </div>
                )}

                {children}

                <p className="mt-14 text-xs text-muted">{t.city.sources}</p>
            </div>
        </div>
    );
}
