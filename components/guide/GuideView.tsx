import Link from "next/link";
import { ChevronRight, Map as MapIcon, Plus } from "lucide-react";
import PlaceCard from "@/components/place/PlaceCard";
import { SITE_URL, fill, getDictionary, type Locale } from "@/lib/i18n";
import { categoryStyle, knownFacts } from "@/lib/places/display";
import { CATEGORY_PLURALS, paths } from "@/lib/places/paths";
import type { PlaceSummary } from "@/lib/places/types";
import type { Category } from "@/lib/tags";

// Shared layout for the SEO guides: /douala, /douala/akwa, /douala/bars,
// /douala/akwa/bars. Everything here is server-rendered and crawlable.

export const GUIDE_LIMIT = 48;

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

export function Breadcrumbs({ items, light = false }: { items: { label: string; href?: string }[]; light?: boolean }) {
    return (
        <nav
            aria-label="Breadcrumb"
            className={`mb-4 flex flex-wrap items-center gap-1 text-[0.8rem] font-semibold ${light ? "text-white/60" : "text-muted"}`}
        >
            {items.map((item, index) => (
                <span key={item.label} className="inline-flex items-center gap-1">
                    {index > 0 && <ChevronRight size={13} />}
                    {item.href ? (
                        <Link href={item.href} className={light ? "hover:text-white" : "hover:text-text"}>
                            {item.label}
                        </Link>
                    ) : (
                        <span className={light ? "text-white/90" : "text-text-2"}>{item.label}</span>
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
            className="nt-art grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
            style={{ "--tone": style.tone } as React.CSSProperties}
            aria-hidden
        >
            <Icon size={size} strokeWidth={2} />
        </span>
    );
}

export function LinkChips({ title, links }: { title: string; links: { href: string; label: string; count: number }[] }) {
    if (!links.length) return null;
    return (
        <section className="nt-reveal mt-12">
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

// Dark, glowing page header shared by guides and the city hub.
export function GuideHero({
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
        <header className="relative overflow-hidden bg-ink text-white">
            <div className="nt-sunset pointer-events-none absolute -top-40 -right-32 h-[26rem] w-[26rem] rounded-full opacity-35 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-[#7c3aed] opacity-20 blur-3xl" />
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "22px 22px" }}
            />
            <div className="relative mx-auto max-w-6xl px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-10 md:px-6 md:pt-12 md:pb-14">
                <Breadcrumbs items={crumbs} light />
                {eyebrow && <p className="mb-2 text-[0.78rem] font-bold tracking-[0.12em] text-brand-400 uppercase">{eyebrow}</p>}
                <h1 className="max-w-3xl text-[2.2rem] leading-[1.02] font-extrabold md:text-6xl">{title}</h1>
                <p className="mt-4 max-w-2xl text-[1rem] text-white/75 md:text-lg">{intro}</p>
                {stats && stats.length > 0 && (
                    <dl className="mt-6 flex flex-wrap gap-2.5">
                        {stats.map((stat) => (
                            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur">
                                <dt className="sr-only">{stat.label}</dt>
                                <dd className="font-display text-xl leading-none font-extrabold">{stat.value}</dd>
                                <dd className="mt-1 text-[0.72rem] font-semibold text-white/60">{stat.label}</dd>
                            </div>
                        ))}
                    </dl>
                )}
                {actions && <div className="mt-7 flex flex-wrap gap-2.5">{actions}</div>}
            </div>
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
    children?: React.ReactNode;
}) {
    const t = getDictionary(locale);
    const shown = places ? sortForGuide(places).slice(0, GUIDE_LIMIT) : [];
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
                    <Link href={mapHref} className="nt-btn nt-btn-primary h-12">
                        <MapIcon size={18} />
                        {t.city.seeOnMap}
                    </Link>
                }
            />

            <div className="mx-auto max-w-6xl px-4 pt-7 md:px-6">
                {filters}

                {places === null ? null : shown.length ? (
                    <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
                        {shown.map((place, index) => (
                            <li key={place.id} className="nt-reveal">
                                <PlaceCard place={place} className="w-full" priority={index < 2} />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="mt-6 rounded-[2rem] bg-surface-2 px-6 py-14 text-center">
                        <p className="mb-5 text-text-2">{t.city.emptyGuide}</p>
                        <Link href={paths.submit(locale)} className="nt-btn nt-btn-primary">
                            <Plus size={18} />
                            {t.nav.suggest}
                        </Link>
                    </div>
                )}

                {places && places.length > shown.length && (
                    <div className="mt-10 text-center">
                        <Link href={mapHref} className="nt-btn nt-btn-dark">
                            <MapIcon size={17} />
                            {t.city.seeOnMap} · {fill(t.city.placesCount, { count: places.length })}
                        </Link>
                    </div>
                )}

                {children}

                <p className="mt-12 text-xs text-muted">{t.city.sources}</p>
            </div>
        </div>
    );
}
