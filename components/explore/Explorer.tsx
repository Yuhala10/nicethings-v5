"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, LocateFixed, Navigation, Search, Share2, Shuffle, X } from "lucide-react";
import { fill } from "@/lib/i18n";
import { formatDistance, formatPriceShort } from "@/lib/i18n/format";
import { parseDiscoveryText } from "@/lib/concierge/parse";
import { INTENTS, isEmptyQuery, mergeQueries, type DiscoveryQuery, type IntentKey } from "@/lib/concierge/query";
import { rankPlaces, type SortMode } from "@/lib/concierge/rank";
import { cityNow, getOpenState } from "@/lib/places/hours";
import { categoryStyle } from "@/lib/places/display";
import { paths } from "@/lib/places/paths";
import type { PlaceSummary } from "@/lib/places/types";
import { useNow } from "@/lib/hooks/useNow";
import { useOrigin } from "@/lib/hooks/useOrigin";
import { AMENITIES, BUDGETS, CATEGORIES, GOOD_FOR, VIBES, tagLabel } from "@/lib/tags";
import BottomSheet, { type Snap } from "../map/BottomSheet";
import type { MapPin } from "../map/MapView";
import { OpenBadge, PlaceThumb, PriceLabel, Rating, SaveButton } from "../place/bits";
import { Logo, LanguageSwitch } from "../site/SiteChrome";
import { useLocale } from "../site/LocaleProvider";
import AreaPicker from "./AreaPicker";
import PlaceRow from "./PlaceRow";
import SelectedCard from "./SelectedCard";

const MapView = dynamic(() => import("../map/MapView"), {
    ssr: false,
    loading: () => <div className="nt-skeleton absolute inset-0" aria-hidden />,
});

type BudgetKey = (typeof BUDGETS)[number]["key"];
const PAGE = 30;

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
    places,
    initialText = "",
    autoFocusSearch = false,
}: {
    places: PlaceSummary[];
    initialText?: string;
    autoFocusSearch?: boolean;
}) {
    const { locale, t } = useLocale();
    const now = useNow();
    const { origin, status, locate, chooseArea } = useOrigin();

    const [text, setText] = useState(initialText);
    const deferredText = useDeferredValue(text);
    const [intent, setIntent] = useState<IntentKey | null>(null);
    const [budget, setBudget] = useState<BudgetKey | null>(null);
    const [openNow, setOpenNow] = useState(false);
    const [sort, setSort] = useState<SortMode>("best");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [snap, setSnap] = useState<Snap>(initialText ? "full" : "half");
    const [pickerOpen, setPickerOpen] = useState(false);
    const [visible, setVisible] = useState(PAGE);
    const [toast, setToast] = useState<string | null>(null);
    const [removed, setRemoved] = useState<string[]>([]); // understood tokens the visitor dismissed
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
        if (parsed.neighborhood) tokens.push({ key: "n", label: `📍 ${parsed.neighborhood}` });
        if (parsed.budgetMax) tokens.push({ key: "b", label: `≤ ${formatPriceShort(parsed.budgetMax, locale)} FCFA` });
        if (parsed.when) tokens.push({ key: "w", label: `🕒 ${parsed.when.label === "now" ? t.filters.openNow : `${t.days[parsed.when.day]}`}` });
        if (parsed.groupSize) tokens.push({ key: "g", label: `👥 ${parsed.groupSize}` });
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
            budgetQuery(budget),
            openNow ? { openNow: true } : null,
            typed
        );
    }, [parsed, removed, intent, budget, openNow]);

    const ranked = useMemo(
        () => rankPlaces(places, query, { origin: origin?.position ?? null, now: now ?? undefined }, sort),
        [places, query, origin, now, sort]
    );

    // eslint-disable-next-line react-hooks/set-state-in-effect -- new results start from the top
    useEffect(() => setVisible(PAGE), [query, sort, origin]);

    const pins = useMemo<MapPin[]>(() => {
        return ranked.slice(0, 400).map(({ place }) => {
            const state = now ? getOpenState(place.hours, now).status : "unknown";
            return {
                id: place.id,
                lat: place.lat,
                lng: place.lng,
                label: place.priceMin ? formatPriceShort(place.priceMin, locale) : categoryStyle(place.category).emoji,
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
        const pool = ranked.slice(0, 20);
        if (!pool.length) return;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        if (navigator.vibrate) navigator.vibrate([10, 40, 10]);
        select(pick.place.id);
    };

    const showToast = (message: string) => {
        setToast(message);
        window.setTimeout(() => setToast(null), 2200);
    };

    const clearAll = () => {
        setText("");
        setRemoved([]);
        setIntent(null);
        setBudget(null);
        setOpenNow(false);
    };

    const greeting = now ? greetingFor(cityNow(now).minutes) : null;
    const hasFilters = !isEmptyQuery(query);
    const mapPadding = { top: 90, bottom: snap === "peek" ? 240 : 80, left: 40, right: 40 };
    const focusPoint = origin?.position ?? null;

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
            <div className="mb-3 flex items-end justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[0.8rem] font-semibold text-muted">
                        {greeting ? `${t.greeting[greeting.hello]} 👋` : " "}
                    </p>
                    <h1 className="truncate text-[1.35rem] leading-tight font-extrabold">
                        {greeting ? t.greeting[greeting.question] : t.meta.tagline}
                    </h1>
                </div>
                <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    data-no-drag
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 py-2 text-[0.8rem] font-bold text-text"
                >
                    {origin?.kind === "gps" ? <LocateFixed size={15} className="text-blue-600" /> : <Navigation size={15} />}
                    <span className="max-w-[7.5rem] truncate">{locationLabel}</span>
                    <ChevronDown size={14} />
                </button>
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
                    value={text}
                    onChange={(event) => {
                        setText(event.target.value);
                        setRemoved([]);
                    }}
                    onFocus={() => setSnap("full")}
                    enterKeyHint="search"
                    placeholder={t.search.placeholder}
                    aria-label={t.search.shortPlaceholder}
                    className="h-12 w-full rounded-2xl border border-line bg-surface pr-10 pl-10 text-[0.95rem] text-text shadow-card outline-none placeholder:text-muted focus:border-brand-500"
                />
                {text && (
                    <button
                        type="button"
                        onClick={() => {
                            setText("");
                            setRemoved([]);
                        }}
                        className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted"
                        aria-label={t.search.clear}
                    >
                        <X size={16} />
                    </button>
                )}
            </form>

            {understood.length > 0 && (
                <div className="nt-scroll-x mt-2.5 items-center gap-1.5" data-no-drag>
                    <span className="shrink-0 text-[0.72rem] font-bold tracking-wide text-brand-600 uppercase">
                        {t.search.understood}
                    </span>
                    {understood.map((token) => (
                        <button
                            key={token.key}
                            type="button"
                            onClick={() => setRemoved((current) => [...current, token.key])}
                            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2.5 text-xs font-bold text-brand-700 dark:bg-brand-700/20 dark:text-brand-200"
                        >
                            {token.label}
                            <X size={12} />
                        </button>
                    ))}
                </div>
            )}

            <div className="nt-scroll-x mt-3 -mx-4 gap-2 px-4" data-no-drag>
                {(Object.keys(INTENTS) as IntentKey[]).map((key) => (
                    <button
                        key={key}
                        type="button"
                        className="nt-chip"
                        aria-pressed={intent === key}
                        onClick={() => setIntent(intent === key ? null : key)}
                    >
                        <span aria-hidden>{INTENTS[key].icon}</span>
                        {t.intents[key]}
                    </button>
                ))}
                <button type="button" className="nt-chip" onClick={surprise}>
                    <Shuffle size={15} />
                    {t.intents.surprise}
                </button>
            </div>

            <div className="nt-scroll-x mt-2 -mx-4 gap-2 px-4" data-no-drag>
                <button type="button" className="nt-chip" aria-pressed={openNow} onClick={() => setOpenNow(!openNow)}>
                    <span className="h-2 w-2 rounded-full bg-open" />
                    {t.filters.openNow}
                </button>
                {BUDGETS.map((band) => (
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
        </div>
    );

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

            {/* Floating top bar over the map (mobile) */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3 pt-[max(env(safe-area-inset-top),0.75rem)] md:left-[420px]">
                <div className="pointer-events-auto rounded-full bg-glass px-3 py-1.5 shadow-card backdrop-blur-xl md:hidden">
                    <Logo compact />
                </div>
                <div className="pointer-events-auto ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={locate}
                        className="grid h-10 w-10 place-items-center rounded-full bg-glass shadow-card backdrop-blur-xl"
                        aria-label={t.location.recenter}
                    >
                        <LocateFixed size={18} className={origin?.kind === "gps" ? "text-blue-600" : "text-text"} />
                    </button>
                    <LanguageSwitch className="h-10 bg-glass shadow-card backdrop-blur-xl" />
                </div>
            </div>

            {(status === "denied" || status === "unavailable" || status === "outside") && (
                <div className="absolute inset-x-3 top-16 z-20 rounded-2xl bg-ink p-3 text-sm font-medium text-white shadow-float md:left-[436px] md:max-w-md">
                    {status === "denied" ? t.location.denied : t.location.unavailable}{" "}
                    <button type="button" className="font-bold text-brand-400 underline" onClick={() => setPickerOpen(true)}>
                        {t.location.chooseArea}
                    </button>
                </div>
            )}

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
                                onCopied={() => showToast(t.common.copied)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex items-center justify-between px-4 pb-1">
                    <p className="text-sm font-bold text-text">
                        {ranked.length === 1 ? t.search.resultsCountOne : fill(t.search.resultsCount, { count: ranked.length })}
                        {origin?.kind === "area" && <span className="font-medium text-muted"> · {fill(t.location.inArea, { area: origin.name })}</span>}
                    </p>
                    <div className="flex items-center gap-2">
                        {hasFilters && (
                            <button type="button" onClick={clearAll} className="text-xs font-bold text-brand-600">
                                {t.filters.reset}
                            </button>
                        )}
                        <select
                            value={sort}
                            onChange={(event) => setSort(event.target.value as SortMode)}
                            className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-bold text-text"
                            aria-label={t.filters.sort}
                            data-no-drag
                        >
                            <option value="best">{t.filters.sortBest}</option>
                            <option value="distance">{t.filters.sortDistance}</option>
                            <option value="price">{t.filters.sortPrice}</option>
                            <option value="rating">{t.filters.sortRating}</option>
                        </select>
                    </div>
                </div>

                {ranked.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                        <p className="mb-4 text-4xl">🧭</p>
                        <p className="mb-5 text-sm text-muted">{t.search.noResults}</p>
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
                        </button>
                    </div>
                )}

                {!text && (
                    <div className="px-4 pt-6">
                        <p className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">{t.search.examplesTitle}</p>
                        <div className="flex flex-wrap gap-2">
                            {t.search.examples.map((example) => (
                                <button
                                    key={example}
                                    type="button"
                                    onClick={() => {
                                        setText(example);
                                        setSnap("full");
                                    }}
                                    className="rounded-full border border-dashed border-line-strong px-3 py-1.5 text-left text-xs font-semibold text-text-2"
                                >
                                    “{example}”
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </BottomSheet>

            <AreaPicker
                open={pickerOpen}
                current={origin?.kind === "area" ? origin.name : null}
                onClose={() => setPickerOpen(false)}
                onPick={chooseArea}
                onLocate={locate}
            />

            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white shadow-float"
                    >
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

}
