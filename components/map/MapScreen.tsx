"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { ChevronDown, List, LocateFixed, Navigation, Search, Shuffle, X } from "lucide-react";
import { cityBounds, type City } from "@/lib/cities";
import { fill } from "@/lib/i18n";
import { formatDistance } from "@/lib/i18n/format";
import type { Area } from "@/lib/places/areas";
import { expandPlaces, type CompactPlace } from "@/lib/places/compact";
import { cuisineLabel } from "@/lib/places/display";
import { getOpenState } from "@/lib/places/hours";
import { paths } from "@/lib/places/paths";
import type { PlaceSummary } from "@/lib/places/types";
import { CATEGORIES, tagLabel } from "@/lib/tags";
import { useNow } from "@/lib/hooks/useNow";
import { useOrigin } from "@/lib/hooks/useOrigin";
import { intentFromParam, useDiscovery } from "@/lib/hooks/useDiscovery";
import AreaPicker from "../explore/AreaPicker";
import LocationNotice from "../explore/LocationNotice";
import CityPicker, { rememberCity } from "../explore/CityPicker";
import { INTENT_ICONS, INTENT_ORDER } from "../explore/intents";
import { OpenBadge, PlaceThumb, PriceLabel } from "../place/bits";
import { LanguageSwitch } from "../site/SiteChrome";
import { useLocale } from "../site/LocaleProvider";
import type { MapPin } from "./MapView";

const MapView = dynamic(() => import("./MapView"), {
    ssr: false,
    loading: () => <div className="nt-skeleton absolute inset-0" aria-hidden />,
});

const CAROUSEL = 30;

// One card of the bottom carousel: enough to decide, two taps to act.
function MapCard({ place, distance, active }: { place: PlaceSummary; distance: number | null; active: boolean }) {
    const { locale, t } = useLocale();
    const meta = [
        (place.category === "Restaurant" && cuisineLabel(place.cuisine, locale, 1)) || tagLabel(CATEGORIES, place.category, locale),
        place.neighborhood,
        distance !== null ? formatDistance(distance, locale) : null,
    ].filter(Boolean);

    return (
        <div
            className={`flex h-full gap-3 rounded-[1.5rem] border bg-surface p-2.5 shadow-float transition duration-300 ${active ? "border-brand-400" : "border-line"}`}
        >
            <Link href={paths.place(locale, place.slug)} className="shrink-0" tabIndex={-1} aria-hidden>
                <PlaceThumb cover={place.cover} category={place.category} name={place.name} sizes="104px" className="h-[6.5rem] w-[6.5rem] rounded-[1.15rem]" iconSize={28} />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col py-0.5 pr-1">
                <Link href={paths.place(locale, place.slug)} className="min-w-0">
                    <h3 className="truncate font-display text-[1.02rem] font-bold">{place.name}</h3>
                    <p className="truncate text-[0.8rem] text-muted">{meta.join(" · ")}</p>
                </Link>
                <div className="mt-1 flex min-h-[1.1rem] items-center gap-2 text-[0.8rem]">
                    <OpenBadge hours={place.hours} compact />
                    <PriceLabel min={place.priceMin} max={place.priceMax} className="truncate" />
                </div>
                <div className="mt-auto flex gap-1.5 pt-2">
                    <Link href={paths.directions(locale, place.slug)} className="nt-btn nt-btn-primary h-9 flex-1 rounded-xl px-2 text-[0.82rem]">
                        <Navigation size={14} />
                        {t.spot.directions}
                    </Link>
                    <Link href={paths.place(locale, place.slug)} className="nt-btn nt-btn-soft h-9 rounded-xl px-3 text-[0.82rem]">
                        {t.common.seeMore}
                    </Link>
                </div>
            </div>
        </div>
    );
}

// The map page: the city at a glance. Neighbourhood names, a pin for every
// place, a slim search on top and the results as swipeable cards.
export default function MapScreen({
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
        city: city.slug,
    });

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [areaPickerOpen, setAreaPickerOpen] = useState(false);
    const [cityPickerOpen, setCityPickerOpen] = useState(false);
    const carouselRef = useRef<HTMLUListElement>(null);
    const fromCarousel = useRef(false);

    useEffect(() => rememberCity(city.slug), [city.slug]);

    // The selected place always has a card, even if it ranks further down.
    const cards = useMemo(() => {
        const top = d.ranked.slice(0, CAROUSEL);
        if (selectedId && !top.some((item) => item.place.id === selectedId)) {
            const picked = d.ranked.find((item) => item.place.id === selectedId);
            if (picked) return [picked, ...top.slice(0, CAROUSEL - 1)];
        }
        return top;
    }, [d.ranked, selectedId]);

    const pins = useMemo<MapPin[]>(
        () =>
            d.ranked.slice(0, 900).map(({ place }) => ({
                id: place.id,
                lat: place.lat,
                lng: place.lng,
                category: place.category,
                open: now ? (getOpenState(place.hours, now).status === "closed" ? false : null) : null,
            })),
        [d.ranked, now]
    );

    // Pin tapped: bring its card into view.
    const selectFromMap = useCallback(
        (id: string | null) => {
            setSelectedId(id);
            if (!id) return;
            requestAnimationFrame(() => {
                const card = carouselRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`);
                if (card) {
                    fromCarousel.current = true;
                    card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                }
            });
        },
        []
    );

    // Carousel swiped: the centred card selects its pin.
    useEffect(() => {
        const list = carouselRef.current;
        if (!list) return;
        let timer = 0;
        const onScroll = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                if (fromCarousel.current) {
                    fromCarousel.current = false;
                    return;
                }
                const middle = list.scrollLeft + list.clientWidth / 2;
                let best: { id: string; d: number } | null = null;
                for (const child of Array.from(list.children) as HTMLElement[]) {
                    const center = child.offsetLeft + child.offsetWidth / 2;
                    const distance = Math.abs(center - middle);
                    if (!best || distance < best.d) best = { id: child.dataset.id ?? "", d: distance };
                }
                if (best?.id) setSelectedId(best.id);
            }, 140);
        };
        list.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            list.removeEventListener("scroll", onScroll);
            window.clearTimeout(timer);
        };
    }, []);

    // New results: start from the first card.
    useEffect(() => {
        carouselRef.current?.scrollTo({ left: 0 });
         
        setSelectedId(null);
    }, [d.query]);

    const surprise = () => {
        const pool = d.ranked.slice(0, 25);
        if (!pool.length) return;
        if (navigator.vibrate) navigator.vibrate([10, 40, 10]);
        selectFromMap(pool[Math.floor(Math.random() * pool.length)].place.id);
    };

    const listHref = `${paths.search(locale, city.slug)}${d.handoff ? `?${d.handoff}` : ""}`;
    const count = d.ranked.length === 1 ? t.search.resultsCountOne : fill(t.search.resultsCount, { count: d.ranked.length });
    const glassPill = "nt-glass-strong inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[0.85rem] font-bold shadow-card transition active:scale-95";

    return (
        <div className="fixed inset-0 overflow-hidden bg-bg">
            <MapView
                className="nt-fullmap absolute inset-0"
                pins={pins}
                labels={areas}
                selectedId={selectedId}
                onSelect={selectFromMap}
                user={origin?.kind === "gps" ? { ...origin.position, heading: origin.heading } : null}
                focus={origin?.position ?? null}
                center={{ lat: city.lat, lng: city.lng }}
                zoom={city.zoom}
                bounds={cityBounds(city)}
                padding={{ top: 190, bottom: 300, left: 40, right: 40 }}
            />

            {/* Top: city, search, quick picks */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-bg/80 via-bg/30 to-transparent pb-6">
                <div className="mx-auto max-w-2xl px-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
                    <div className="pointer-events-auto flex items-center gap-2">
                        <button type="button" onClick={() => setCityPickerOpen(true)} className={glassPill} aria-haspopup="dialog">
                            <span className="nt-sunset h-2 w-2 rounded-full" />
                            {city.name}
                            <ChevronDown size={14} />
                        </button>
                        <button type="button" onClick={() => setAreaPickerOpen(true)} className={`${glassPill} min-w-0`} aria-haspopup="dialog">
                            {origin?.kind === "gps" ? <LocateFixed size={14} className="text-blue-600" /> : <Navigation size={14} />}
                            <span className="truncate">
                                {status === "locating"
                                    ? t.location.locating
                                    : origin?.kind === "gps"
                                      ? t.location.aroundMe
                                      : origin?.kind === "area"
                                        ? origin.name
                                        : t.location.chooseArea}
                            </span>
                        </button>
                        <div className="ml-auto flex items-center gap-2">
                            <button
                                type="button"
                                onClick={locate}
                                className="nt-glass-strong grid h-11 w-11 place-items-center rounded-full shadow-card transition active:scale-90"
                                aria-label={t.location.recenter}
                            >
                                <LocateFixed size={19} className={status === "locating" ? "animate-pulse text-blue-600" : origin?.kind === "gps" ? "text-blue-600" : ""} />
                            </button>
                            <LanguageSwitch className="nt-glass-strong h-11 border-0 shadow-card" />
                        </div>
                    </div>

                    <form
                        role="search"
                        onSubmit={(event) => {
                            event.preventDefault();
                            (document.activeElement as HTMLElement | null)?.blur();
                        }}
                        className="pointer-events-auto relative mt-2.5"
                    >
                        <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-brand-500" />
                        <input
                            type="search"
                            value={d.text}
                            onChange={(event) => d.setText(event.target.value)}
                            enterKeyHint="search"
                            autoComplete="off"
                            spellCheck={false}
                            placeholder={fill(t.search.placeholder, { area: areas[0]?.name ?? city.name })}
                            aria-label={t.search.shortPlaceholder}
                            className="nt-glass-strong h-12 w-full rounded-full border border-line pr-11 pl-11 text-base shadow-float outline-none placeholder:text-muted focus:border-brand-500 [&::-webkit-search-cancel-button]:hidden"
                        />
                        {d.text && (
                            <button
                                type="button"
                                onClick={() => d.setText("")}
                                className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-surface-2 text-muted"
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
                        href={(slug) => paths.explore(locale, slug)}
                        onChooseArea={() => setAreaPickerOpen(true)}
                        className="pointer-events-auto mt-2.5"
                    />

                    <div className="nt-scroll-x pointer-events-auto -mx-3 mt-2.5 gap-2 px-3">
                        {d.understood.map((token) => (
                            <button
                                key={token.key}
                                type="button"
                                onClick={() => d.removeToken(token.key)}
                                className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-brand-500 px-3 text-xs font-bold text-white shadow-card"
                            >
                                {token.label}
                                <X size={12} />
                            </button>
                        ))}
                        {INTENT_ORDER.map((key) => {
                            const Icon = INTENT_ICONS[key];
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    className="nt-chip nt-glass-strong h-9 border-line shadow-card"
                                    aria-pressed={d.intent === key}
                                    onClick={() => {
                                        d.setCategories(null);
                                        d.setIntent(d.intent === key ? null : key);
                                    }}
                                >
                                    <Icon size={14} strokeWidth={2.3} />
                                    {t.intents[key]}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom: list link, surprise, cards */}
            <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.6rem)] z-20 md:bottom-6">
                <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-3 pb-2.5">
                    <Link href={listHref} className={`${glassPill} pointer-events-auto`}>
                        <List size={16} />
                        {t.mapPage.list} · {count}
                    </Link>
                    <button type="button" onClick={surprise} className={`${glassPill} pointer-events-auto`}>
                        <Shuffle size={15} />
                        {t.intents.surprise}
                    </button>
                </div>

                {cards.length > 0 ? (
                    <ul ref={carouselRef} className="nt-scroll-x pointer-events-auto snap-x snap-mandatory gap-3 px-[7.5vw] pb-1 md:px-[calc(50vw-190px)]">
                        {cards.map(({ place, distance }) => (
                            <li key={place.id} data-id={place.id} className="h-[8.4rem] w-[85vw] max-w-[380px] shrink-0 snap-center">
                                <MapCard place={place} distance={distance} active={place.id === selectedId} />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="pointer-events-auto mx-3 rounded-[1.5rem] border border-line bg-surface p-5 text-center shadow-float">
                        <p className="mb-3 text-sm text-text-2">{t.search.noResults}</p>
                        <button type="button" onClick={d.clearAll} className="nt-btn nt-btn-dark h-10 text-sm">
                            {t.filters.reset}
                        </button>
                    </div>
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
            <CityPicker open={cityPickerOpen} current={city.slug} counts={cityCounts} onClose={() => setCityPickerOpen(false)} />
        </div>
    );
}
