import Link from "next/link";
import { ChevronRight, Map as MapIcon, Plus } from "lucide-react";
import PlaceCard from "@/components/place/PlaceCard";
import { SITE_URL, fill, getDictionary, type Locale } from "@/lib/i18n";
import { categoryStyle, knownFacts } from "@/lib/places/display";
import { CATEGORY_PLURALS, paths } from "@/lib/places/paths";
import type { PlaceSummary } from "@/lib/places/types";
import type { Category } from "@/lib/tags";

// Shared layout for the SEO guides: /yaounde/bastos, /yaounde/bars,
// /yaounde/bastos/bars. Everything here is server-rendered and crawlable.

export const GUIDE_LIMIT = 48;

export function plural(category: string, locale: Locale) {
    return CATEGORY_PLURALS[category as Category]?.[locale] ?? category;
}

// Richest listings first, then alphabetical so the order is stable.
export function sortForGuide(places: PlaceSummary[]) {
    return [...places].sort(
        (a, b) =>
            Number(b.verified) - Number(a.verified) ||
            knownFacts(b) - knownFacts(a) ||
            a.name.localeCompare(b.name, "fr")
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

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
    return (
        <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1 text-[0.8rem] font-semibold text-muted">
            {items.map((item, index) => (
                <span key={item.label} className="inline-flex items-center gap-1">
                    {index > 0 && <ChevronRight size={13} />}
                    {item.href ? (
                        <Link href={item.href} className="hover:text-text">
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
            className="nt-art grid h-9 w-9 shrink-0 place-items-center rounded-xl"
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
        <section className="mt-10">
            <h2 className="nt-section-title mb-3">{title}</h2>
            <ul className="flex flex-wrap gap-2">
                {links.map((link) => (
                    <li key={link.href}>
                        <Link href={link.href} className="nt-chip">
                            {link.label}
                            <span className="font-medium text-muted">{link.count}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}

export default function GuideView({
    locale,
    title,
    intro,
    crumbs,
    places,
    mapQuery,
    filters,
    children,
}: {
    locale: Locale;
    title: string;
    intro: string;
    crumbs: { label: string; href?: string }[];
    places: PlaceSummary[] | null; // null: a hub page without its own list
    mapQuery: string;
    filters?: React.ReactNode;
    children?: React.ReactNode;
}) {
    const t = getDictionary(locale);
    const shown = places ? sortForGuide(places).slice(0, GUIDE_LIMIT) : [];

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
        <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6 md:pt-10">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify([itemList, breadcrumbList]).replace(/</g, "\\u003c") }}
            />
            <Breadcrumbs items={crumbs} />
            <header className="mb-6 max-w-2xl">
                <h1 className="text-[1.9rem] leading-[1.1] font-extrabold md:text-5xl">{title}</h1>
                <p className="mt-3 text-[0.98rem] text-text-2 md:text-lg">{intro}</p>
                <Link href={paths.search(locale, mapQuery)} className="nt-btn nt-btn-dark mt-5 h-11 text-sm">
                    <MapIcon size={17} />
                    {t.city.seeOnMap}
                </Link>
            </header>

            {filters}

            {places === null ? null : shown.length ? (
                <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
                    {shown.map((place, index) => (
                        <li key={place.id}>
                            <PlaceCard place={place} className="w-full" priority={index < 2} />
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="mt-6 rounded-3xl bg-surface-2 px-6 py-12 text-center">
                    <p className="mb-5 text-text-2">{t.city.emptyGuide}</p>
                    <Link href={paths.submit(locale)} className="nt-btn nt-btn-primary">
                        <Plus size={18} />
                        {t.nav.suggest}
                    </Link>
                </div>
            )}

            {places && places.length > shown.length && (
                <div className="mt-8 text-center">
                    <Link href={paths.search(locale, mapQuery)} className="nt-btn nt-btn-soft">
                        {t.city.seeOnMap} · {fill(t.city.placesCount, { count: places.length })}
                    </Link>
                </div>
            )}

            {children}

            <p className="mt-10 text-xs text-muted">{t.city.sources}</p>
        </div>
    );
}
