"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import {
    BedDouble,
    ChevronDown,
    Coffee,
    Heart,
    LocateFixed,
    MapPin,
    Moon,
    Navigation,
    Search,
    Shuffle,
    Sun,
    Users,
    UtensilsCrossed,
    Wine,
    X,
    type LucideIcon,
} from "lucide-react";
import { fill } from "@/lib/i18n";
import { formatPriceShort } from "@/lib/i18n/format";
import { buildRails, type Rail as RailData } from "@/lib/concierge/discover";
import { parseDiscoveryText } from "@/lib/concierge/parse";
import { INTENTS, isEmptyQuery, mergeQueries, type DiscoveryQuery, type IntentKey } from "@/lib/concierge/query";
import { rankPlaces, type SortMode } from "@/lib/concierge/rank";
import { cityNow, getOpenState } from "@/lib/places/hours";
import { paths } from "@/lib/places/paths";
import { expandPlaces, type CompactPlace } from "@/lib/places/compact";
import { useNow } from "@/lib/hooks/useNow";
import { useOrigin } from "@/lib/hooks/useOrigin";
import { AMENITIES, BUDGETS, CATEGORIES, GOOD_FOR, VIBES, YAOUNDE_NEIGHBORHOODS, tagLabel } from "@/lib/tags";
import BottomSheet, { type Snap } from "../map/BottomSheet";
import type { MapPin as MapPinData } from "../map/MapView";
import PlaceCard, { PlaceCardSkeleton } from "../place/PlaceCard";
import { FloatingNav, Logo, LanguageSwitch } from "../site/SiteChrome";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";
import AreaPicker from "./AreaPicker";
import PlaceRow from "./PlaceRow";
import Rail from "./Rail";
import SelectedCard from "./SelectedCard";

const MapView = dynamic(() => import("../map/MapView"), {
    ssr: false,
    loading: () => <div className="nt-skeleton absolute inset-0" aria-hidden />,
});

type BudgetKey = (typeof BUDGETS)[number]["key"];
const PAGE = 30;

export const INTENT_ICONS: Record<IntentKey, LucideIcon> = {
    eat: UtensilsCrossed,
    coffee: Coffee,
    drinks: Wine,
    tonight: Moon,
    date: Heart,
    chill: Sun,
    family: Users,
    stay: BedDouble,
};
const INTENT_ORDER: IntentKey[] = ["eat", "coffee", "drinks", "tonight", "date", "chill", "family", "stay"];

// Chips only appear once enough places carry the data behind them: a
// "Under 5k" chip that filters nothing would be a broken promise.
const MIN_PRICED_FOR_BUDGETS = 30;
const MIN_OPEN_FOR_CHIP = 5;

function greetingFor(minutes: number) {
    const h = minutes / 60;
    if (h >= 5 && h < 11) return { hello: "morning", question: "questionMorning" } as const;
    if (h >= 11 && h < 14.5) return { hello: "afternoon", question: "questionNoon" } as const;
    if (h >= 14.5 && h < 18) return { hello: "afternoon", question: "questionAfternoon" } as const;
    if (h >= 18 && h < 23) return { hello: "evening", question: "questionEvening" } as const;
    return { hello: "night", question: "questionNight" } as const;
}

function budgetQuery(key: BudgetKey | null): DiscoveryQuery | null {
    const band = BUDGETS.find((item) => item.key === key);
    if (!band) return null;
    return { budgetMin: "min" in band ? band.min : null, budgetMax: "max" in band ? band.max : null };
}

export default function Explorer({
    places: compact,
    initialText = "",
    autoFocusSearch = false,
}: {
    places: CompactPlace[];
    initialText?: string;
    autoFocusSearch?: boolean;
}) {
    const { locale, t } = useLocale();
    const places = useMemo(() => expandPlaces(compact), [compact]);
    const now = useNow();
    const toast = useToast();
    const { origin, status, locate, chooseArea } = useOrigin();

    const [text, setText] = useState(initialText);
    const deferredText = useDeferredValue(text);
    const [intent, setIntent] = useState<IntentKey | null>(null);
    const [railCategories, setRailCategories] = useState<string[] | null>(null);
    const [budget, setBudget] = useState<BudgetKey | null>(null);
    const [openNow, setOpenNow] = useState(false);
    const [sort, setSort] = useState<SortMode>("best");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [snap, setSnap] = useState<Snap>(initialText ? "full" : "half");
    const [pickerOpen, setPickerOpen] = useState(false);
    const [visible, setVisible] = useState(PAGE);
    const [removed, setRemoved] = useState<string[]>([]); // understood tokens the visitor dismissed
    const [focused, setFocused] = useState(false);
    const [noticeHidden, setNoticeHidden] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (autoFocusSearch) searchRef.current?.focus();
    }, [autoFocusSearch]);

    // What the Concierge understood from the typed sentence.
    const parsed = useMemo(
        () => (deferredText.trim().length > 1 ? parseDiscoveryText(deferredText, now ?? undefined) : null),
        [deferredText, now]
    );

    const understood = useMemo(() => {
        if (!parsed) return [];
        const tokens: { key: string; label: string }[] = [];
        parsed.categories?.forEach((value) => tokens.push({ key: `c:${value}`, label: tagLabel(CATEGORIES, value, locale) }));
        if (parsed.neighborhood) tokens.push({ key: "n", label: parsed.neighborhood });
        if (parsed.budgetMax) tokens.push({ key: "b", label: `≤ ${formatPriceShort(parsed.budgetMax, locale)} FCFA` });
        if (parsed.when) tokens.push({ key: "w", label: parsed.when.label === "now" ? t.filters.openNow : t.days[parsed.when.day] });
        if (parsed.groupSize) tokens.push({ key: "g", label: `${parsed.groupSize} pers.` });
        parsed.vibes?.forEach((value) => tokens.push({ key: `v:${value}`, label: tagLabel(VIBES, value, locale) }));
        parsed.goodFor?.forEach((value) => tokens.push({ key: `f:${value}`, label: tagLabel(GOOD_FOR, value, locale) }));
        parsed.amenities?.forEach((value) => tokens.push({ key: `a:${value}`, label: tagLabel(AMENITIES, value, locale) }));
        return tokens.filter((token) => !removed.includes(token.key));
    }, [parsed, removed, locale, t]);

    const query = useMemo(() => {
        let typed: DiscoveryQuery | null = parsed;
        if (typed && removed.length) {
            typed = {
                ...typed,
                categories: typed.categories?.filter((value) => !removed.includes(`c:${value}`)),
                vibes: typed.vibes?.filter((value) => !removed.includes(`v:${value}`)),
                goodFor: typed.goodFor?.filter((value) => !removed.includes(`f:${value}`)),
                amenities: typed.amenities?.filter((value) => !removed.includes(`a:${value}`)),
                neighborhood: removed.includes("n") ? null : typed.neighborhood,
                budgetMax: removed.includes("b") ? null : typed.budgetMax,
                when: removed.includes("w") ? null : typed.when,
                openNow: removed.includes("w") ? false : typed.openNow,
                groupSize: removed.includes("g") ? null : typed.groupSize,
            };
        }
        return mergeQueries(
            intent ? INTENTS[intent].query : null,
            railCategories ? { categories: railCategories } : null,
            budgetQuery(budget),
            openNow ? { openNow: true } : null,
            typed
        );
    }, [parsed, removed, intent, railCategories, budget, openNow]);

    const ranked = useMemo(
        () => rankPlaces(places, query, { origin: origin?.position ?? null, now }, sort),
        [places, query, origin, now, sort]
    );

     
    useEffect(() => setVisible(PAGE), [query, sort, origin]);

    const pricedCount = useMemo(() => places.filter((place) => place.priceMin || place.priceMax).length, [places]);
    const openCount = useMemo(
        () => (now ? places.filter((place) => getOpenState(place.hours, now).status === "open").length : 0),
        [places, now]
    );

    const rails = useMemo<RailData[] | null>(
        () => (now ? buildRails(places, { origin: origin?.position ?? null, now }) : null),
        [places, origin, now]
    );

    const areaCounts = useMemo(() => {
        const counts = new Map<string, number>();
        for (const place of places) {
            if (place.neighborhood) counts.set(place.neighborhood, (counts.get(place.neighborhood) ?? 0) + 1);
        }
        return YAOUNDE_NEIGHBORHOODS.map((area) => ({ name: area.name, count: counts.get(area.name) ?? 0 }))
            .filter((area) => area.count > 0)
            .sort((a, b) => b.count - a.count);
    }, [places]);

    const pins = useMemo<MapPinData[]>(() => {
        return ranked.slice(0, 600).map(({ place }) => {
            const state = now ? getOpenState(place.hours, now).status : "unknown";
            return {
                id: place.id,
                lat: place.lat,
                lng: place.lng,
                label: place.priceMin ? formatPriceShort(place.priceMin, locale) : "",
                open: state === "unknown" ? null : state === "open",
            };
        });
    }, [ranked, now, locale]);

    const selected = useMemo(
        () => (selectedId ? ranked.find((item) => item.place.id === selectedId) ?? null : null),
        [selectedId, ranked]
    );

    const select = useCallback((id: string | null) => {
        setSelectedId(id);
        if (id) setSnap("peek");
    }, []);

    const surprise = () => {
        const pool = ranked.slice(0, 25);
        if (!pool.length) return;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        if (navigator.vibrate) navigator.vibrate([10, 40, 10]);
        select(pick.place.id);
    };

    const clearAll = () => {
        setText("");
        setRemoved([]);
        setIntent(null);
        setRailCategories(null);
        setBudget(null);
        setOpenNow(false);
        setSort("best");
    };

    const openRail = (rail: RailData) => {
        clearAll();
        if (rail.action.intent) setIntent(rail.action.intent);
        if (rail.action.categories) setRailCategories(rail.action.categories);
        if (rail.action.openNow) setOpenNow(true);
        if (rail.action.sortByDistance) setSort("distance");
        setSnap("full");
    };

    const railTitle = (rail: RailData) => {
        if (rail.key === "near") {
            return origin?.kind === "area" ? fill(t.discover.nearArea, { area: origin.name }) : t.discover.nearYou;
        }
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

    const greeting = now ? greetingFor(cityNow(now).minutes) : null;
    const browsing = isEmptyQuery(query) && !text.trim();
    const mapPadding = { top: 90, bottom: snap === "peek" ? 240 : 80, left: 40, right: 40 };
    const focusPoint = origin?.position ?? null;
    const showNotice = !noticeHidden && (status === "denied" || status === "unavailable" || status === "outside");

    const locationLabel =
        status === "locating"
            ? t.location.locating
            : origin?.kind === "gps"
              ? t.location.aroundMe
              : origin?.kind === "area"
                ? origin.name
                : t.location.chooseArea;

    const header = (
        <div className="px-4 pt-1 pb-3">
            <div className="hidden pt-4 pb-3 md:block">
                <Logo />
            </div>
            <div className="mb-3">
                <div className="flex items-center justify-between gap-3">
                    <p className="min-h-[1.2em] text-[0.8rem] font-semibold text-muted">
                        {greeting ? t.greeting[greeting.hello] : ""}
                    </p>
                    <button
                        type="button"
                        onClick={() => setPickerOpen(true)}
                        data-no-drag
                        className="-mr-1 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-[0.78rem] font-bold text-text transition active:scale-95"
                        aria-haspopup="dialog"
                    >
                        {origin?.kind === "gps" ? (
                            <LocateFixed size={14} className="text-blue-600" />
                        ) : (
                            <Navigation size={14} className={status === "locating" ? "animate-pulse" : ""} />
                        )}
                        <span className="max-w-[9.5rem] truncate">{locationLabel}</span>
                        <ChevronDown size={14} />
                    </button>
                </div>
                <h1 className="mt-0.5 text-[1.45rem] leading-tight font-extrabold">
                    {greeting ? t.greeting[greeting.question] : t.meta.tagline}
                </h1>
            </div>

            <form
                role="search"
                onSubmit={(event) => {
                    event.preventDefault();
                    searchRef.current?.blur();
                    setSnap("full");
                }}
                className="relative"
                data-no-drag
            >
                <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
                <input
                    ref={searchRef}
                    type="search"
                    value={text}
                    onChange={(event) => {
                        setText(event.target.value);
                        setRemoved([]);
                    }}
                    onFocus={() => {
                        setFocused(true);
                        setSnap("full");
                    }}
                    onBlur={() => setFocused(false)}
                    enterKeyHint="search"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder={t.search.placeholder}
                    aria-label={t.search.shortPlaceholder}
                    className="h-12 w-full rounded-2xl border border-line bg-surface pr-10 pl-10 text-base text-text shadow-card outline-none placeholder:text-[0.9rem] placeholder:text-muted focus:border-brand-500 [&::-webkit-search-cancel-button]:hidden"
                />
                {text && (
                    <button
                        type="button"
                        onClick={() => {
                            setText("");
                            setRemoved([]);
                            searchRef.current?.focus();
                        }}
                        className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2"
                        aria-label={t.search.clear}
                    >
                        <X size={16} />
                    </button>
                )}
            </form>

            {understood.length > 0 && (
                <div className="nt-scroll-x mt-2.5 items-center gap-1.5" data-no-drag aria-live="polite">
                    <span className="shrink-0 text-[0.72rem] font-bold tracking-wide text-brand-600 uppercase">
                        {t.search.understood}
                    </span>
                    {understood.map((token) => (
                        <button
                            key={token.key}
                            type="button"
                            onClick={() => setRemoved((current) => [...current, token.key])}
                            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2.5 text-xs font-bold text-brand-700 dark:bg-brand-700/20 dark:text-brand-200"
                            aria-label={`${token.label} — ${t.search.clear}`}
                        >
                            {token.label}
                            <X size={12} />
                        </button>
                    ))}
                </div>
            )}

            <div className="nt-scroll-x mt-3 -mx-4 gap-2 px-4" data-no-drag>
                {INTENT_ORDER.map((key) => {
                    const Icon = INTENT_ICONS[key];
                    return (
                        <button
                            key={key}
                            type="button"
                            className="nt-chip"
                            aria-pressed={intent === key}
                            onClick={() => {
                                setRailCategories(null);
                                setIntent(intent === key ? null : key);
                                if (intent !== key) setSnap((current) => (current === "peek" ? "half" : current));
                            }}
                        >
                            <Icon size={15} strokeWidth={2.2} />
                            {t.intents[key]}
                        </button>
                    );
                })}
                <button type="button" className="nt-chip" onClick={surprise}>
                    <Shuffle size={15} strokeWidth={2.2} />
                    {t.intents.surprise}
                </button>
            </div>

            {(openCount >= MIN_OPEN_FOR_CHIP || pricedCount >= MIN_PRICED_FOR_BUDGETS) && (
                <div className="nt-scroll-x mt-2 -mx-4 gap-2 px-4" data-no-drag>
                    {openCount >= MIN_OPEN_FOR_CHIP && (
                        <button type="button" className="nt-chip" aria-pressed={openNow} onClick={() => setOpenNow(!openNow)}>
                            <span className="h-2 w-2 rounded-full bg-open" />
                            {t.filters.openNow}
                        </button>
                    )}
                    {pricedCount >= MIN_PRICED_FOR_BUDGETS &&
                        BUDGETS.map((band) => (
                            <button
                                key={band.key}
                                type="button"
                                className="nt-chip"
                                aria-pressed={budget === band.key}
                                onClick={() => setBudget(budget === band.key ? null : band.key)}
                            >
                                {band.label[locale]}
                            </button>
                        ))}
                </div>
            )}
        </div>
    );

    const examples = (
        <div className="px-4 pt-3 pb-2">
            <p className="nt-eyebrow mb-2">{t.search.examplesTitle}</p>
            <div className="flex flex-wrap gap-2">
                {t.search.examples.map((example) => (
                    <button
                        key={example}
                        type="button"
                        // Keep focus in the input so the keyboard doesn't flicker.
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                            setText(example);
                            setRemoved([]);
                            setSnap("full");
                        }}
                        className="rounded-full border border-dashed border-line-strong px-3 py-1.5 text-left text-[0.8rem] font-semibold text-text-2 transition hover:border-brand-500 active:scale-[0.98]"
                    >
                        « {example} »
                    </button>
                ))}
            </div>
        </div>
    );

    const resultsList = (
        <>
            {ranked.length === 0 ? (
                <div className="px-6 py-12 text-center">
                    <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-muted">
                        <Search size={24} />
                    </div>
                    <p className="mx-auto mb-5 max-w-xs text-sm text-text-2">{t.search.noResults}</p>
                    <button type="button" onClick={clearAll} className="nt-btn nt-btn-dark">
                        {t.filters.reset}
                    </button>
                </div>
            ) : (
                <ul className="px-1.5">
                    {ranked.slice(0, visible).map(({ place, distance }) => (
                        <li key={place.id}>
                            <PlaceRow place={place} distance={distance} active={place.id === selectedId} />
                        </li>
                    ))}
                </ul>
            )}

            {visible < ranked.length && (
                <div className="px-4 pt-2">
                    <button type="button" onClick={() => setVisible(visible + PAGE)} className="nt-btn nt-btn-soft w-full">
                        {t.common.seeMore}
                        <span className="font-medium text-muted">· {ranked.length - visible}</span>
                    </button>
                </div>
            )}
        </>
    );

    const resultsHeader = (title: string) => (
        <div className="flex items-center justify-between gap-2 px-4 pt-2 pb-1">
            <h2 className="min-w-0 truncate text-sm font-bold text-text" aria-live="polite">
                {title}
            </h2>
            <div className="flex shrink-0 items-center gap-2">
                {!browsing && (
                    <button type="button" onClick={clearAll} className="px-1 text-xs font-bold text-brand-600">
                        {t.filters.reset}
                    </button>
                )}
                <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as SortMode)}
                    className="h-8 rounded-full border border-line bg-surface px-2.5 text-xs font-bold text-text"
                    aria-label={t.filters.sort}
                    data-no-drag
                >
                    <option value="best">{t.filters.sortBest}</option>
                    <option value="distance" disabled={!origin && !query.neighborhood}>
                        {t.filters.sortDistance}
                    </option>
                    {pricedCount > 0 && <option value="price">{t.filters.sortPrice}</option>}
                    <option value="rating">{t.filters.sortRating}</option>
                </select>
            </div>
        </div>
    );

    const count = ranked.length === 1 ? t.search.resultsCountOne : fill(t.search.resultsCount, { count: ranked.length });

    return (
        <div className="fixed inset-0 overflow-hidden bg-bg">
            <MapView
                className="absolute inset-0 md:left-[420px]"
                pins={pins}
                selectedId={selectedId}
                onSelect={select}
                user={origin?.kind === "gps" ? origin.position : null}
                focus={focusPoint}
                padding={mapPadding}
            />

            {/* Floating top bar over the map */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3 pt-[max(env(safe-area-inset-top),0.75rem)] md:left-[420px]">
                <div className="pointer-events-auto rounded-full bg-glass px-3 py-1.5 shadow-card backdrop-blur-xl md:hidden">
                    <Logo compact />
                </div>
                <div className="pointer-events-auto ml-auto flex items-center gap-2">
                    <FloatingNav />
                    <button
                        type="button"
                        onClick={locate}
                        className="grid h-10 w-10 place-items-center rounded-full bg-glass shadow-card backdrop-blur-xl transition active:scale-90"
                        aria-label={t.location.recenter}
                    >
                        <LocateFixed
                            size={18}
                            className={
                                status === "locating" ? "animate-pulse text-blue-600" : origin?.kind === "gps" ? "text-blue-600" : "text-text"
                            }
                        />
                    </button>
                    <LanguageSwitch className="h-10 bg-glass shadow-card backdrop-blur-xl" />
                </div>
            </div>

            <AnimatePresence>
                {showNotice && (
                    <motion.div
                        role="status"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute inset-x-3 top-16 z-20 flex items-start gap-3 rounded-2xl bg-ink p-3 pl-4 text-sm font-medium text-white shadow-float md:left-[436px] md:max-w-md"
                    >
                        <p className="flex-1">
                            {status === "denied" ? t.location.denied : t.location.unavailable}{" "}
                            <button type="button" className="font-bold text-brand-400 underline" onClick={() => setPickerOpen(true)}>
                                {t.location.chooseArea}
                            </button>
                        </p>
                        <button
                            type="button"
                            onClick={() => setNoticeHidden(true)}
                            className="-m-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10"
                            aria-label={t.common.close}
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <BottomSheet snap={snap} onSnapChange={setSnap} header={header}>
                <AnimatePresence initial={false}>
                    {selected && (
                        <motion.div
                            key={selected.place.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                            className="px-4 pb-3"
                        >
                            <SelectedCard
                                place={selected.place}
                                distance={selected.distance}
                                onClose={() => setSelectedId(null)}
                                onCopied={() => toast(t.common.copied)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {focused && !text && examples}

                {browsing ? (
                    <>
                        {rails
                            ? rails.map((rail, index) => (
                                  <Rail key={rail.key} title={railTitle(rail)} onSeeAll={() => openRail(rail)}>
                                      {rail.items.map(({ place, distance }) => (
                                          <PlaceCard key={place.id} place={place} distance={distance} priority={index === 0} />
                                      ))}
                                  </Rail>
                              ))
                            : [0, 1].map((index) => (
                                  <div key={index} className="pt-6 first:pt-3" aria-hidden>
                                      <div className="nt-skeleton mx-4 mb-3 h-5 w-40 rounded" />
                                      <div className="flex gap-3 overflow-hidden px-4">
                                          <PlaceCardSkeleton />
                                          <PlaceCardSkeleton />
                                      </div>
                                  </div>
                              ))}

                        {areaCounts.length > 0 && (
                            <section className="pt-7">
                                <h2 className="nt-section-title mb-3 px-4">{t.discover.byArea}</h2>
                                <div className="nt-scroll-x touch-pan-x gap-2 px-4" data-no-drag>
                                    {areaCounts.map((area) => (
                                        <Link
                                            key={area.name}
                                            href={paths.neighborhood(locale, area.name)}
                                            className="nt-chip h-auto flex-col items-start gap-0 py-2"
                                        >
                                            <span className="inline-flex items-center gap-1">
                                                <MapPin size={13} className="text-brand-500" />
                                                {area.name}
                                            </span>
                                            <span className="text-[0.72rem] font-medium text-muted">
                                                {fill(t.city.placesCount, { count: area.count })}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        <div className="pt-6">{resultsHeader(`${t.discover.all} · ${count}`)}</div>
                        {resultsList}
                        {!focused && examples}
                    </>
                ) : (
                    <>
                        {resultsHeader(
                            origin?.kind === "area" && !query.neighborhood
                                ? `${count} · ${fill(t.location.inArea, { area: origin.name })}`
                                : count
                        )}
                        {resultsList}
                    </>
                )}
            </BottomSheet>

            <AreaPicker
                open={pickerOpen}
                current={origin?.kind === "area" ? origin.name : null}
                onClose={() => setPickerOpen(false)}
                onPick={(name) => {
                    chooseArea(name);
                    setNoticeHidden(true);
                }}
                onLocate={locate}
            />
        </div>
    );
}
