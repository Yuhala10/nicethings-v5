"use client";

import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
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
import { cityBounds, type City } from "@/lib/cities";
import { fill } from "@/lib/i18n";
import { formatPriceShort } from "@/lib/i18n/format";
import { buildRails, type Rail as RailData } from "@/lib/concierge/discover";
import { parseDiscoveryText } from "@/lib/concierge/parse";
import { INTENTS, isEmptyQuery, mergeQueries, type DiscoveryQuery, type IntentKey } from "@/lib/concierge/query";
import { rankPlaces, type SortMode } from "@/lib/concierge/rank";
import type { Area } from "@/lib/places/areas";
import { expandPlaces, type CompactPlace } from "@/lib/places/compact";
import { cityNow, getOpenState } from "@/lib/places/hours";
import { paths } from "@/lib/places/paths";
import { useNow } from "@/lib/hooks/useNow";
import { useOrigin } from "@/lib/hooks/useOrigin";
import { AMENITIES, BUDGETS, CATEGORIES, GOOD_FOR, VIBES, tagLabel } from "@/lib/tags";
import BottomSheet, { type Snap } from "../map/BottomSheet";
import type { MapPin as MapPinData } from "../map/MapView";
import PlaceCard, { PlaceCardSkeleton } from "../place/PlaceCard";
import { FloatingNav, LanguageSwitch, Logo } from "../site/SiteChrome";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";
import AreaPicker from "./AreaPicker";
import CityPicker, { rememberCity } from "./CityPicker";
import PlaceRow from "./PlaceRow";
import Rail from "./Rail";
import SelectedCard from "./SelectedCard";

const MapView = dynamic(() => import("../map/MapView"), {
    ssr: false,
    loading: () => <div className="nt-skeleton absolute inset-0" aria-hidden />,
});

type BudgetKey = (typeof BUDGETS)[number]["key"];
const PAGE = 30;
const PRIMER_KEY = "nt_primer_done";

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
    city,
    areas,
    cityCounts,
    autoFocusSearch = false,
}: {
    places: CompactPlace[];
    city: City;
    areas: Area[];
    cityCounts: Record<string, number>;
    autoFocusSearch?: boolean;
}) {
    const { locale, t } = useLocale();
    const initialText = (useSearchParams().get("q") ?? "").slice(0, 200);
    const places = useMemo(() => expandPlaces(compact, city.slug), [compact, city.slug]);
    const now = useNow();
    const toast = useToast();
    const { origin, status, locate, chooseArea, gpsCity } = useOrigin(city, areas);

    const [text, setText] = useState(initialText);
    const deferredText = useDeferredValue(text);
    const [intent, setIntent] = useState<IntentKey | null>(null);
    const [railCategories, setRailCategories] = useState<string[] | null>(null);
    const [budget, setBudget] = useState<BudgetKey | null>(null);
    const [openNow, setOpenNow] = useState(false);
    const [sort, setSort] = useState<SortMode>("best");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [snap, setSnap] = useState<Snap>(initialText ? "full" : "half");
    const [areaPickerOpen, setAreaPickerOpen] = useState(false);
    const [cityPickerOpen, setCityPickerOpen] = useState(false);
    const [visible, setVisible] = useState(PAGE);
    const [removed, setRemoved] = useState<string[]>([]);
    const [focused, setFocused] = useState(false);
    const [noticeHidden, setNoticeHidden] = useState(false);
    const [primer, setPrimer] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => rememberCity(city.slug), [city.slug]);

    useEffect(() => {
        if (autoFocusSearch) searchRef.current?.focus();
    }, [autoFocusSearch]);

    // First visit: a friendly card asking for location (never the raw
    // browser prompt out of nowhere).
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
    const showPrimer = primer && !origin && status !== "locating" && status !== "denied";

    // ---- Collapsing header: swipe the list up and the greeting, headline
    // and chips glide away to the side, leaving city, location and search.
    const scroll = useMotionValue(0);
    const collapse = useSpring(useTransform(scroll, [0, 140], [0, 1], { clamp: true }), { stiffness: 380, damping: 40 });
    const collapsibleRef = useRef<HTMLDivElement>(null);
    const chipsRef = useRef<HTMLDivElement>(null);
    const [heights, setHeights] = useState({ top: 0, chips: 0 });
    useLayoutEffect(() => {
        const parts = [collapsibleRef.current?.firstElementChild, chipsRef.current?.firstElementChild];
        const measure = () => setHeights({ top: parts[0]?.scrollHeight ?? 0, chips: parts[1]?.scrollHeight ?? 0 });
        measure();
        const observer = new ResizeObserver(measure);
        parts.forEach((part) => part && observer.observe(part));
        return () => observer.disconnect();
    }, []);
    const topHeight = useTransform(collapse, (c) => (heights.top ? heights.top * (1 - c) : "auto"));
    const chipsHeight = useTransform(collapse, (c) => (heights.chips ? heights.chips * (1 - c) : "auto"));
    const fade = useTransform(collapse, [0, 0.7], [1, 0]);
    const slide = useTransform(collapse, [0, 1], [0, -70]);
    const slideRight = useTransform(collapse, [0, 1], [0, 90]);

    // ---- Query
    const parsed = useMemo(
        () => (deferredText.trim().length > 1 ? parseDiscoveryText(deferredText, now ?? undefined, areas) : null),
        [deferredText, now, areas]
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
        () => rankPlaces(places, query, { origin: origin?.position ?? null, now, areas }, sort),
        [places, query, origin, now, sort, areas]
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

    const pins = useMemo<MapPinData[]>(
        () =>
            ranked.slice(0, 800).map(({ place }) => ({
                id: place.id,
                lat: place.lat,
                lng: place.lng,
                category: place.category,
                open: now ? (getOpenState(place.hours, now).status === "closed" ? false : null) : null,
            })),
        [ranked, now]
    );

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
    const mapPadding = { top: 90, bottom: snap === "peek" ? 250 : 90, left: 40, right: 40 };
    const showNotice =
        !noticeHidden &&
        (status === "denied" || status === "unavailable" || (status === "outside" && gpsCity !== null && gpsCity.slug !== city.slug));

    const locationLabel =
        status === "locating"
            ? t.location.locating
            : origin?.kind === "gps"
              ? t.location.aroundMe
              : origin?.kind === "area"
                ? origin.name
                : t.location.chooseArea;

    const pill =
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-[0.8rem] font-bold text-text transition active:scale-95";

    const header = (
        <div className="px-4 pt-1 pb-3">
            <div className="hidden pt-4 pb-4 md:block">
                <Logo />
            </div>

            <div className="flex items-center justify-between gap-2" data-no-drag>
                <button type="button" onClick={() => setCityPickerOpen(true)} className={pill} aria-haspopup="dialog">
                    <span className="nt-sunset h-2 w-2 rounded-full" />
                    <span className="max-w-[8.5rem] truncate">{city.name}</span>
                    <ChevronDown size={14} />
                </button>
                <button type="button" onClick={() => setAreaPickerOpen(true)} className={pill} aria-haspopup="dialog">
                    {origin?.kind === "gps" ? (
                        <LocateFixed size={14} className="text-blue-600" />
                    ) : (
                        <Navigation size={14} className={status === "locating" ? "animate-pulse" : ""} />
                    )}
                    <span className="max-w-[8.5rem] truncate">{locationLabel}</span>
                </button>
            </div>

            <motion.div ref={collapsibleRef} style={{ height: topHeight, opacity: fade, x: slide }} className="overflow-hidden">
                <div className="pt-3.5 pb-1">
                    <p className="min-h-[1.2em] text-[0.82rem] font-semibold text-muted">{greeting ? t.greeting[greeting.hello] : ""}</p>
                    <h1 className="text-[1.55rem] leading-[1.12] font-extrabold">{greeting ? t.greeting[greeting.question] : t.meta.tagline}</h1>
                </div>
            </motion.div>

            <form
                role="search"
                onSubmit={(event) => {
                    event.preventDefault();
                    searchRef.current?.blur();
                    setSnap("full");
                }}
                className="relative mt-3"
                data-no-drag
            >
                <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-brand-500" />
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
                    placeholder={fill(t.search.placeholder, { area: areas[0]?.name ?? city.name })}
                    aria-label={t.search.shortPlaceholder}
                    className="h-[3.25rem] w-full rounded-[1.15rem] border border-line bg-surface pr-11 pl-11 text-base text-text shadow-card outline-none transition placeholder:text-[0.92rem] placeholder:text-muted focus:border-brand-500 focus:shadow-[0_0_0_4px_rgba(255,106,43,0.15)] [&::-webkit-search-cancel-button]:hidden"
                />
                {text && (
                    <button
                        type="button"
                        onClick={() => {
                            setText("");
                            setRemoved([]);
                            searchRef.current?.focus();
                        }}
                        className="absolute top-1/2 right-2.5 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-surface-2 text-muted"
                        aria-label={t.search.clear}
                    >
                        <X size={15} />
                    </button>
                )}
            </form>

            {understood.length > 0 && (
                <div className="nt-scroll-x mt-2.5 items-center gap-1.5" data-no-drag aria-live="polite">
                    <span className="shrink-0 text-[0.72rem] font-bold tracking-wide text-brand-600 uppercase">{t.search.understood}</span>
                    {understood.map((token) => (
                        <button
                            key={token.key}
                            type="button"
                            onClick={() => setRemoved((current) => [...current, token.key])}
                            className="nt-rise inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2.5 text-xs font-bold text-brand-700 dark:bg-brand-700/25 dark:text-brand-200"
                            aria-label={`${token.label} — ${t.search.clear}`}
                        >
                            {token.label}
                            <X size={12} />
                        </button>
                    ))}
                </div>
            )}

            <motion.div ref={chipsRef} style={{ height: chipsHeight, opacity: fade, x: slideRight }} className="overflow-hidden">
                <div>
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
                                    <Icon size={15} strokeWidth={2.3} />
                                    {t.intents[key]}
                                </button>
                            );
                        })}
                        <button type="button" className="nt-chip" onClick={surprise}>
                            <Shuffle size={15} strokeWidth={2.3} />
                            {t.intents.surprise}
                        </button>
                    </div>

                    {(openCount >= MIN_OPEN_FOR_CHIP || pricedCount >= MIN_PRICED_FOR_BUDGETS) && (
                        <div className="nt-scroll-x mt-2 -mx-4 gap-2 px-4 pb-0.5" data-no-drag>
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
            </motion.div>
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
                    <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-surface-2 text-muted">
                        <Search size={26} />
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
                user={origin?.kind === "gps" ? { ...origin.position, heading: origin.heading } : null}
                focus={origin?.position ?? null}
                center={{ lat: city.lat, lng: city.lng }}
                zoom={city.zoom}
                bounds={cityBounds(city)}
                padding={mapPadding}
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3 pt-[max(env(safe-area-inset-top),0.75rem)] md:left-[420px]">
                <div className="nt-glass pointer-events-auto rounded-full px-3 py-1.5 shadow-card md:hidden">
                    <Logo compact />
                </div>
                <div className="pointer-events-auto ml-auto flex items-center gap-2">
                    <FloatingNav />
                    <button
                        type="button"
                        onClick={locate}
                        className="nt-glass grid h-11 w-11 place-items-center rounded-full shadow-card transition active:scale-90"
                        aria-label={t.location.recenter}
                    >
                        <LocateFixed
                            size={19}
                            className={status === "locating" ? "animate-pulse text-blue-600" : origin?.kind === "gps" ? "text-blue-600" : "text-text"}
                        />
                    </button>
                    <LanguageSwitch className="nt-glass h-11 border-0 shadow-card" />
                </div>
            </div>

            <AnimatePresence>
                {showNotice && (
                    <motion.div
                        role="status"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute inset-x-3 top-[4.5rem] z-20 flex items-start gap-3 rounded-2xl bg-ink p-3 pl-4 text-sm font-medium text-white shadow-float md:left-[436px] md:max-w-md"
                    >
                        <p className="flex-1">
                            {status === "outside" && gpsCity ? (
                                <>
                                    {fill(t.cities.youreIn, { city: gpsCity.name })}{" "}
                                    <Link href={paths.explore(locale, gpsCity.slug)} className="font-bold text-brand-400 underline">
                                        {fill(t.cities.see, { city: gpsCity.name })}
                                    </Link>
                                </>
                            ) : (
                                <>
                                    {status === "denied" ? t.location.denied : t.location.unavailable}{" "}
                                    <button type="button" className="font-bold text-brand-400 underline" onClick={() => setAreaPickerOpen(true)}>
                                        {t.location.chooseArea}
                                    </button>
                                </>
                            )}
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

            <BottomSheet snap={snap} onSnapChange={setSnap} header={header} onScroll={(y) => scroll.set(y)}>
                <AnimatePresence initial={false}>
                    {selected && (
                        <motion.div
                            key={selected.place.id}
                            initial={{ opacity: 0, y: 16, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 16 }}
                            transition={{ type: "spring", stiffness: 420, damping: 36 }}
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

                <AnimatePresence>
                    {showPrimer && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden px-4"
                        >
                            <div className="relative mt-1 mb-2 overflow-hidden rounded-[1.4rem] bg-ink p-4 text-white">
                                <div className="nt-sunset pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full opacity-40 blur-2xl" />
                                <div className="relative flex items-start gap-3">
                                    <span className="nt-sunset grid h-11 w-11 shrink-0 place-items-center rounded-2xl shadow-[var(--nt-glow)]">
                                        <LocateFixed size={21} />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="font-display text-[1.02rem] font-bold">{t.explore.primerTitle}</p>
                                        <p className="mt-0.5 text-[0.83rem] text-white/75">{t.explore.primerBody}</p>
                                    </div>
                                </div>
                                <div className="relative mt-3.5 flex gap-2">
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

                        {areas.length > 0 && (
                            <section className="pt-8">
                                <h2 className="nt-section-title mb-3 px-4">{t.discover.byArea}</h2>
                                <div className="nt-scroll-x touch-pan-x gap-2 px-4" data-no-drag>
                                    {areas.slice(0, 24).map((area) => (
                                        <Link
                                            key={area.name}
                                            href={paths.neighborhood(locale, city.slug, area.name)}
                                            className="nt-pressable flex shrink-0 flex-col rounded-2xl border border-line bg-surface px-3.5 py-2.5"
                                        >
                                            <span className="inline-flex items-center gap-1 text-sm font-bold">
                                                <MapPin size={13} className="text-brand-500" />
                                                {area.name}
                                            </span>
                                            <span className="text-[0.72rem] font-medium text-muted">{fill(t.city.placesCount, { count: area.count })}</span>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        <div className="pt-7">{resultsHeader(`${t.discover.all} · ${count}`)}</div>
                        {resultsList}
                        {!focused && examples}
                    </>
                ) : (
                    <>
                        {resultsHeader(
                            origin?.kind === "area" && !query.neighborhood ? `${count} · ${fill(t.location.inArea, { area: origin.name })}` : count
                        )}
                        {resultsList}
                    </>
                )}
            </BottomSheet>

            <AreaPicker
                open={areaPickerOpen}
                current={origin?.kind === "area" ? origin.name : null}
                areas={areas}
                onClose={() => setAreaPickerOpen(false)}
                onPick={(name) => {
                    chooseArea(name);
                    setNoticeHidden(true);
                }}
                onLocate={locate}
            />
            <CityPicker open={cityPickerOpen} current={city.slug} counts={cityCounts} onClose={() => setCityPickerOpen(false)} />
        </div>
    );
}
