"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LocateFixed, Map as MapIcon, MapPin, Navigation, Search, X } from "lucide-react";
import type { City } from "@/lib/cities";
import { fill } from "@/lib/i18n";
import type { Area } from "@/lib/places/areas";
import { expandPlaces, type CompactPlace } from "@/lib/places/compact";
import { categoryStyle } from "@/lib/places/display";
import { cityNow } from "@/lib/places/hours";
import { CATEGORY_PLURALS, paths } from "@/lib/places/paths";
import type { Category } from "@/lib/tags";
import { BUDGETS } from "@/lib/tags";
import { useNow } from "@/lib/hooks/useNow";
import { useOrigin } from "@/lib/hooks/useOrigin";
import { MIN_OPEN_FOR_CHIP, MIN_PRICED_FOR_BUDGETS, intentFromParam, useDiscovery } from "@/lib/hooks/useDiscovery";
import type { Rail as RailData } from "@/lib/concierge/discover";
import AreaPicker from "../explore/AreaPicker";
import LocationNotice from "../explore/LocationNotice";
import CityPicker, { rememberCity } from "../explore/CityPicker";
import PlaceRow from "../explore/PlaceRow";
import Rail from "../explore/Rail";
import { INTENT_ICONS, INTENT_ORDER } from "../explore/intents";
import PlaceCard, { PlaceCardSkeleton } from "../place/PlaceCard";
import { useLocale } from "../site/LocaleProvider";

const PAGE = 30;
const PRIMER_KEY = "nt_primer_done";

function greetingFor(minutes: number) {
    const h = minutes / 60;
    if (h >= 5 && h < 11) return { hello: "morning", question: "questionMorning" } as const;
    if (h >= 11 && h < 14.5) return { hello: "afternoon", question: "questionNoon" } as const;
    if (h >= 14.5 && h < 18) return { hello: "afternoon", question: "questionAfternoon" } as const;
    if (h >= 18 && h < 23) return { hello: "evening", question: "questionEvening" } as const;
    return { hello: "night", question: "questionNight" } as const;
}

// The search page: one job — find the right place by typing, picking a
// mood or browsing ideas. The map lives on its own page; a button carries
// the search over.
export default function SearchView({
    places: compact,
    city,
    areas,
    cityCounts,
}: {
    places: CompactPlace[];
    city: City;
    areas: Area[];
    cityCounts: Record<string, number>;
}) {
    const { locale, t } = useLocale();
    const params = useSearchParams();
    const places = useMemo(() => expandPlaces(compact, city.slug), [compact, city.slug]);
    const now = useNow();
    const { origin, status, locate, chooseArea, gpsCity } = useOrigin(city, areas);
    const d = useDiscovery({
        places,
        areas,
        origin: origin?.position ?? null,
        now,
        locale,
        t,
        initialText: (params.get("q") ?? "").slice(0, 200),
        initialIntent: intentFromParam(params.get("i")),
    });

    const [visible, setVisible] = useState(PAGE);
    const [areaPickerOpen, setAreaPickerOpen] = useState(false);
    const [cityPickerOpen, setCityPickerOpen] = useState(false);
    const [primer, setPrimer] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => rememberCity(city.slug), [city.slug]);

    useEffect(() => {
        let done = false;
        try {
            done = localStorage.getItem(PRIMER_KEY) === "1";
        } catch {}
         
        setPrimer(!done);
    }, []);
    const closePrimer = () => {
        setPrimer(false);
        try {
            localStorage.setItem(PRIMER_KEY, "1");
        } catch {}
    };


     
    useEffect(() => setVisible(PAGE), [d.query, d.sort, origin]);

    const greeting = now ? greetingFor(cityNow(now).minutes) : null;
    const count = d.ranked.length === 1 ? t.search.resultsCountOne : fill(t.search.resultsCount, { count: d.ranked.length });
    const mapHref = `${paths.explore(locale, city.slug)}${d.handoff ? `?${d.handoff}` : ""}`;
    const showPrimer = primer && !origin && status !== "locating" && status !== "denied";

    const locationLabel =
        status === "locating" ? t.location.locating : origin?.kind === "gps" ? t.location.aroundMe : origin?.kind === "area" ? origin.name : t.location.chooseArea;

    const railTitle = (rail: RailData) => {
        if (rail.key === "near") return origin?.kind === "area" ? fill(t.discover.nearArea, { area: origin.name }) : t.discover.nearYou;
        const titles = {
            open: t.discover.openNow,
            featured: t.discover.featured,
            verified: t.discover.verified,
            eat: t.discover.eat,
            coffee: t.discover.coffee,
            drinks: t.discover.drinks,
            stay: t.discover.stay,
            outing: t.discover.outing,
        } as const;
        return titles[rail.key];
    };

    const openRail = (rail: RailData) => {
        d.clearAll();
        if (rail.action.intent) d.setIntent(rail.action.intent);
        if (rail.action.categories) d.setCategories(rail.action.categories);
        if (rail.action.openNow) d.setOpenNow(true);
        if (rail.action.sortByDistance) d.setSort("distance");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const categoryTiles = useMemo(() => {
        const counts = new Map<string, number>();
        for (const place of places) if (place.category !== "Other") counts.set(place.category, (counts.get(place.category) ?? 0) + 1);
        return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    }, [places]);

    const pill = "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-[0.82rem] font-bold text-text transition active:scale-95";

    return (
        <div className="pb-32">
            {/* Title */}
            <div className="mx-auto max-w-5xl px-4 pt-[max(env(safe-area-inset-top),1.25rem)] md:px-6 md:pt-10">
                <p className="min-h-[1.3em] text-sm font-semibold text-muted">{greeting ? t.greeting[greeting.hello] : ""}</p>
                <h1 className="mt-0.5 text-[2rem] leading-[1.05] font-extrabold md:text-5xl">
                    {greeting ? t.greeting[greeting.question] : t.meta.tagline}
                </h1>
                <p className="mt-2 text-sm text-muted">{fill(t.searchPage.subtitle, { count: places.length, city: city.name })}</p>
            </div>

            {/* Sticky search */}
            <div className="nt-glass-strong sticky top-0 z-30 mt-5 border-b border-line md:top-16">
                <div className="mx-auto max-w-5xl px-4 pt-3 pb-3 md:px-6">
                    <div className="mb-3 flex items-center gap-2">
                        <button type="button" onClick={() => setCityPickerOpen(true)} className={pill} aria-haspopup="dialog">
                            <span className="nt-sunset h-2 w-2 rounded-full" />
                            {city.name}
                            <ChevronDown size={14} />
                        </button>
                        <button type="button" onClick={() => setAreaPickerOpen(true)} className={`${pill} min-w-0`} aria-haspopup="dialog">
                            {origin?.kind === "gps" ? <LocateFixed size={14} className="text-blue-600" /> : <Navigation size={14} />}
                            <span className="truncate">{locationLabel}</span>
                        </button>
                        {/* Carry the search over to the map, in place: never floating over results. */}
                        <Link href={mapHref} className={`${pill} ml-auto bg-ink text-white`} aria-label={t.searchPage.showMap}>
                            <MapIcon size={15} />
                            <span className="hidden sm:inline">{t.searchPage.showMap}</span>
                            <span className="sm:hidden">{t.nav.map}</span>
                        </Link>
                    </div>
                    <form
                        role="search"
                        onSubmit={(event) => {
                            event.preventDefault();
                            searchRef.current?.blur();
                        }}
                        className="relative"
                    >
                        <Search size={19} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-brand-500" />
                        <input
                            ref={searchRef}
                            type="search"
                            value={d.text}
                            onChange={(event) => d.setText(event.target.value)}
                            enterKeyHint="search"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder={fill(t.search.placeholder, { area: areas[0]?.name ?? city.name })}
                            aria-label={t.search.shortPlaceholder}
                            className="h-14 w-full rounded-[1.2rem] border border-line bg-surface pr-12 pl-12 text-base text-text shadow-card outline-none transition placeholder:text-muted focus:border-brand-500 focus:shadow-[0_0_0_4px_rgba(255,106,43,0.15)] [&::-webkit-search-cancel-button]:hidden"
                        />
                        {d.text && (
                            <button
                                type="button"
                                onClick={() => {
                                    d.setText("");
                                    searchRef.current?.focus();
                                }}
                                className="absolute top-1/2 right-3 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-surface-2 text-muted"
                                aria-label={t.search.clear}
                            >
                                <X size={15} />
                            </button>
                        )}
                    </form>

                    <LocationNotice
                        status={status}
                        city={city}
                        gpsCity={gpsCity}
                        href={(slug) => paths.search(locale, slug)}
                        onChooseArea={() => setAreaPickerOpen(true)}
                        className="mt-2.5"
                    />

                    {d.understood.length > 0 && (
                        <div className="nt-scroll-x mt-2.5 items-center gap-1.5" aria-live="polite">
                            <span className="shrink-0 text-[0.72rem] font-bold tracking-wide text-brand-600 uppercase">{t.search.understood}</span>
                            {d.understood.map((token) => (
                                <button
                                    key={token.key}
                                    type="button"
                                    onClick={() => d.removeToken(token.key)}
                                    className="nt-rise inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2.5 text-xs font-bold text-brand-700 dark:bg-brand-700/25 dark:text-brand-200"
                                >
                                    {token.label}
                                    <X size={12} />
                                </button>
                            ))}
                        </div>
                    )}

                </div>
            </div>

            <div className="mx-auto max-w-5xl md:px-2">
                {/* Quick picks scroll away with the page: no layout work while scrolling. */}
                <div className="nt-scroll-x gap-2 px-4 pt-4 md:flex-wrap">
                                    {INTENT_ORDER.map((key) => {
                                        const Icon = INTENT_ICONS[key];
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                className="nt-chip"
                                                aria-pressed={d.intent === key}
                                                onClick={() => {
                                                    d.setCategories(null);
                                                    d.setIntent(d.intent === key ? null : key);
                                                }}
                                            >
                                                <Icon size={15} strokeWidth={2.3} />
                                                {t.intents[key]}
                                            </button>
                                        );
                                    })}
                                    {d.openCount >= MIN_OPEN_FOR_CHIP && (
                                        <button type="button" className="nt-chip" aria-pressed={d.openNow} onClick={() => d.setOpenNow(!d.openNow)}>
                                            <span className="h-2 w-2 rounded-full bg-open" />
                                            {t.filters.openNow}
                                        </button>
                                    )}
                                    {d.pricedCount >= MIN_PRICED_FOR_BUDGETS &&
                                        BUDGETS.map((band) => (
                                            <button
                                                key={band.key}
                                                type="button"
                                                className="nt-chip"
                                                aria-pressed={d.budget === band.key}
                                                onClick={() => d.setBudget(d.budget === band.key ? null : band.key)}
                                            >
                                                {band.label[locale]}
                                            </button>
                                        ))}
                                </div>

                <AnimatePresence>
                    {showPrimer && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden px-4">
                            <div className="relative mt-5 overflow-hidden rounded-[1.6rem] bg-ink p-5 text-white">
                                <div className="nt-sunset pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full opacity-40 blur-2xl" />
                                <div className="relative flex items-start gap-3">
                                    <span className="nt-sunset grid h-12 w-12 shrink-0 place-items-center rounded-2xl shadow-[var(--nt-glow)]">
                                        <LocateFixed size={22} />
                                    </span>
                                    <div>
                                        <p className="font-display text-lg font-bold">{t.explore.primerTitle}</p>
                                        <p className="mt-0.5 text-sm text-white/75">{t.explore.primerBody}</p>
                                    </div>
                                </div>
                                <div className="relative mt-4 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            locate();
                                            closePrimer();
                                        }}
                                        className="nt-btn nt-btn-primary h-11 flex-1 text-sm"
                                    >
                                        {t.explore.primerCta}
                                    </button>
                                    <button type="button" onClick={closePrimer} className="nt-btn nt-btn-glass h-11 px-4 text-sm">
                                        {t.explore.later}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {d.browsing ? (
                    <>
                        {d.rails
                            ? d.rails.map((rail, index) => (
                                  <div key={rail.key} className="pt-4">
                                      <Rail title={railTitle(rail)} onSeeAll={() => openRail(rail)}>
                                          {rail.items.map(({ place, distance }) => (
                                              <PlaceCard key={place.id} place={place} distance={distance} priority={index === 0} />
                                          ))}
                                      </Rail>
                                  </div>
                              ))
                            : [0, 1].map((index) => (
                                  <div key={index} className="pt-8" aria-hidden>
                                      <div className="nt-skeleton mx-4 mb-3 h-5 w-40 rounded" />
                                      <div className="flex gap-3 overflow-hidden px-4">
                                          <PlaceCardSkeleton />
                                          <PlaceCardSkeleton />
                                      </div>
                                  </div>
                              ))}

                        {categoryTiles.length > 0 && (
                            <section className="px-4 pt-10">
                                <h2 className="nt-section-title mb-4">{t.city.categories}</h2>
                                <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                                    {categoryTiles.map(([category, total]) => {
                                        const style = categoryStyle(category);
                                        const Icon = style.icon;
                                        return (
                                            <li key={category}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        d.clearAll();
                                                        d.setCategories([category]);
                                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                                    }}
                                                    className="nt-art nt-pressable relative flex h-24 w-full flex-col justify-end overflow-hidden rounded-[1.3rem] p-3.5 text-left shadow-card"
                                                    style={{ "--tone": style.tone } as React.CSSProperties}
                                                >
                                                    <Icon size={64} strokeWidth={1.2} className="absolute -top-2 -right-2 opacity-25" />
                                                    <span className="relative text-[0.95rem] leading-tight font-bold">
                                                        {CATEGORY_PLURALS[category as Category]?.[locale] ?? category}
                                                    </span>
                                                    <span className="relative text-xs text-white/80">{fill(t.city.placesCount, { count: total })}</span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        )}

                        {areas.length > 0 && (
                            <section className="px-4 pt-10">
                                <h2 className="nt-section-title mb-4">{t.discover.byArea}</h2>
                                <ul className="flex flex-wrap gap-2">
                                    {areas.slice(0, 30).map((area) => (
                                        <li key={area.name}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    d.clearAll();
                                                    d.setText(area.name);
                                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                                }}
                                                className="nt-chip"
                                            >
                                                <MapPin size={14} className="text-brand-500" />
                                                {area.name}
                                                <span className="font-medium text-muted">{area.count}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        <section className="px-4 pt-10">
                            <p className="nt-eyebrow mb-3">{t.search.examplesTitle}</p>
                            <div className="flex flex-wrap gap-2">
                                {t.search.examples.map((example) => (
                                    <button
                                        key={example}
                                        type="button"
                                        onClick={() => {
                                            d.setText(example);
                                            window.scrollTo({ top: 0, behavior: "smooth" });
                                        }}
                                        className="rounded-full border border-dashed border-line-strong px-3.5 py-2 text-left text-sm font-semibold text-text-2 transition hover:border-brand-500"
                                    >
                                        « {example} »
                                    </button>
                                ))}
                            </div>
                            <Link href={paths.city(locale, city.slug)} className="mt-8 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600">
                                {fill(t.searchPage.guideLink, { city: city.name })} →
                            </Link>
                        </section>
                    </>
                ) : (
                    <section className="pt-4">
                        <div className="flex items-center justify-between gap-2 px-4 pb-2">
                            <h2 className="text-base font-bold" aria-live="polite">
                                {count}
                            </h2>
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={d.clearAll} className="text-sm font-bold text-brand-600">
                                    {t.filters.reset}
                                </button>
                                <select
                                    value={d.sort}
                                    onChange={(event) => d.setSort(event.target.value as typeof d.sort)}
                                    className="h-9 rounded-full border border-line bg-surface px-3 text-sm font-bold text-text"
                                    aria-label={t.filters.sort}
                                >
                                    <option value="best">{t.filters.sortBest}</option>
                                    <option value="distance" disabled={!origin && !d.query.neighborhood}>
                                        {t.filters.sortDistance}
                                    </option>
                                    {d.pricedCount > 0 && <option value="price">{t.filters.sortPrice}</option>}
                                    <option value="rating">{t.filters.sortRating}</option>
                                </select>
                            </div>
                        </div>
                        {d.ranked.length === 0 ? (
                            <div className="px-6 py-16 text-center">
                                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-surface-2 text-muted">
                                    <Search size={26} />
                                </div>
                                <p className="mx-auto mb-5 max-w-xs text-text-2">{t.search.noResults}</p>
                                <button type="button" onClick={d.clearAll} className="nt-btn nt-btn-dark">
                                    {t.filters.reset}
                                </button>
                            </div>
                        ) : (
                            <ul className="grid gap-1 px-2 md:grid-cols-2 md:gap-x-4">
                                {d.ranked.slice(0, visible).map(({ place, distance }) => (
                                    <li key={place.id} className="nt-rise">
                                        <PlaceRow place={place} distance={distance} />
                                    </li>
                                ))}
                            </ul>
                        )}
                        {visible < d.ranked.length && (
                            <div className="px-4 pt-4">
                                <button type="button" onClick={() => setVisible(visible + PAGE)} className="nt-btn nt-btn-soft w-full">
                                    {t.common.seeMore}
                                    <span className="font-medium text-muted">· {d.ranked.length - visible}</span>
                                </button>
                            </div>
                        )}
                    </section>
                )}
            </div>

            <AreaPicker
                open={areaPickerOpen}
                current={origin?.kind === "area" ? origin.name : null}
                areas={areas}
                onClose={() => setAreaPickerOpen(false)}
                onPick={chooseArea}
                onLocate={locate}
            />
            <CityPicker open={cityPickerOpen} current={city.slug} counts={cityCounts} target="search" onClose={() => setCityPickerOpen(false)} />
        </div>
    );
}
