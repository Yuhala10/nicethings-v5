"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CloudRain, LocateFixed, MapPin, Navigation, Send, Shuffle, Sparkles, Sun } from "lucide-react";
import { cityAt, cityBySlug } from "@/lib/cities";
import { momentCopy, momentIntent, momentOf } from "@/lib/host/moment";
import { afterStops, proposeNow, surpriseFrom, type Proposal } from "@/lib/host/propose";
import type { Weather } from "@/lib/host/weather";
import { useGeo } from "@/lib/hooks/useGeo";
import { useNow } from "@/lib/hooks/useNow";
import { fill } from "@/lib/i18n";
import { formatClock, formatDistance } from "@/lib/i18n/format";
import { expandPlaces, type CompactPlace } from "@/lib/places/compact";
import { paths } from "@/lib/places/paths";
import type { PlaceSummary } from "@/lib/places/types";
import { sharePlace } from "@/lib/share";
import PinCard, { placeKind } from "../place/PinCard";
import { OpenBadge, PlaceThumb, PriceLabel, VerifiedMark } from "../place/bits";
import { useLocale } from "../site/LocaleProvider";
import WeatherNotice from "./WeatherNotice";
import { useCurrentCity } from "../site/SiteChrome";
import { useToast } from "../site/Toast";

// Each city's places are asked for once per visit.
const pools = new Map<string, PlaceSummary[]>();

// The ranking follows the clock and the visitor, but in steps: every ten
// minutes and every hundred metres or so, so the row does not shuffle under
// a thumb.
const STEP_MS = 600_000;
const SHOWN = 8;

// "Right now": what the app proposes for this hour, this day and this
// place, with one tap to be surprised and one tap to be guided there.
// The page carries the city's best-known places (`initial`); the phone ranks
// them by the hour and the calendar once it knows the time, which a cached
// page cannot. With location on, or in another city, it asks for that
// city's fuller list and ranks by distance too.
export default function NowSection({ city, initial, fixed = false }: { city: string; initial: CompactPlace[]; fixed?: boolean }) {
    const { locale, t } = useLocale();
    const toast = useToast();
    const now = useNow();
    const geo = useGeo();
    const saved = useCurrentCity();
    const card = useRef<HTMLDivElement>(null);

    // Where the visitor is wins over the city they last opened, except on a
    // city's own page.
    const here = geo.position ? cityAt(geo.position.lat, geo.position.lng) : null;
    const slug = fixed ? city : (here?.slug ?? saved);
    const cityName = (cityBySlug(slug) ?? cityBySlug(city))?.name ?? "";

    const inCity = here?.slug === slug;
    const lat = geo.position && inCity ? Math.round(geo.position.lat * 1000) / 1000 : null;
    const lng = geo.position && inCity ? Math.round(geo.position.lng * 1000) / 1000 : null;
    const origin = useMemo(() => (lat !== null && lng !== null ? { lat, lng } : null), [lat, lng]);

    const first = useMemo(() => expandPlaces(initial, city), [initial, city]);
    const [pool, setPool] = useState<PlaceSummary[] | null>(null);
    const wanted = slug !== city || origin !== null;
    useEffect(() => {
        if (!wanted) return;
        let cancelled = false;
        const known = pools.get(slug);
        if (known) {
            setPool(known);
            return;
        }
        setPool(null);
        fetch(`/api/now?city=${slug}`)
            .then((response) => (response.ok ? response.json() : null))
            .then((data: { places: CompactPlace[] } | null) => {
                if (!data || cancelled) return;
                const places = expandPlaces(data.places, slug);
                pools.set(slug, places);
                setPool(places);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [slug, wanted]);

    const step = now ? Math.floor(now.getTime() / STEP_MS) : null;

    // The sky over the city, asked again with each step of the clock. Until
    // it answers (or if it never does) the section simply follows the hour.
    const [sky, setSky] = useState<{ city: string; weather: Weather } | null>(null);
    useEffect(() => {
        if (step === null) return;
        let cancelled = false;
        fetch(`/api/weather?city=${slug}`)
            .then((response) => (response.ok ? response.json() : null))
            .then((weather: Weather | null) => !cancelled && weather && setSky({ city: slug, weather }))
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [slug, step]);
    const weather = sky?.city === slug ? sky.weather : null;

    const moment = useMemo(() => (step === null ? null : { ...momentOf(new Date(step * STEP_MS)), weather }), [step, weather]);

    // Nothing is ranked before the clock is known: the space is held instead.
    const places = useMemo(() => (pool && pools.get(slug) === pool ? pool : slug === city ? first : null), [pool, slug, city, first]);
    const waiting = !moment || step === null || places === null;
    const ranked = useMemo(
        () => (!moment || step === null || !places ? [] : proposeNow(places, { moment, now: new Date(step * STEP_MS), origin, limit: 16 })),
        [moment, step, places, origin]
    );

    const seen = useRef(new Set<string>());
    const [pick, setPick] = useState<Proposal | null>(null);
    useEffect(() => setPick(null), [slug]);
    const after = useMemo(() => (pick && places ? afterStops(pick.place, places, 2) : []), [pick, places]);

    const surprise = () => {
        const next = surpriseFrom(ranked, seen.current);
        if (!next) return;
        seen.current.add(next.place.slug);
        setPick(next);
        requestAnimationFrame(() => card.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
    };

    const send = async () => {
        if (!pick) return;
        const lines = [t.host.planIntro, `1. ${pick.place.name}`, ...after.map((item, index) => `${index + 2}. ${item.place.name}`)];
        const result = await sharePlace(pick.place.name, `${window.location.origin}${paths.place(locale, pick.place.slug)}`, lines.join("\n"), `/api/share/place/${pick.place.slug}?l=${locale}`);
        if (result === "copied") toast(t.common.copied);
    };

    const copy = moment ? momentCopy(moment, locale, t, cityName) : null;
    const shown = ranked.slice(0, SHOWN);
    // A town with too little to propose from: say nothing rather than little.
    if (!waiting && shown.length < 3) return null;

    return (
        <section className="mx-auto max-w-6xl pt-14 md:px-6 md:pt-24" aria-labelledby="now-title">
            <div className="px-4 md:px-0">
                <div className="border-t border-line pt-8 md:pt-10">
                    <p className="nt-eyebrow flex items-center gap-2">
                        <span className="nt-open-dot" aria-hidden />
                        {t.host.live} · {cityName}
                        {now && <span className="tabular-nums"> · {formatClock(now, locale)}</span>}
                        {weather && weather.temperature !== null && (
                            <span className="inline-flex items-center gap-1 tabular-nums">
                                · {weather.sky === "rain" ? <CloudRain size={13} aria-hidden /> : weather.sky === "heat" ? <Sun size={13} aria-hidden /> : null}
                                {Math.round(weather.temperature)} °C
                            </span>
                        )}
                    </p>
                    {copy ? (
                        <div className="nt-rise">
                            <h2 id="now-title" className="nt-serif mt-2 text-[2.25rem] md:text-[3.5rem]">
                                {copy.headline}
                            </h2>
                            <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-text-2">{copy.lead}</p>
                            {copy.note && <p className="mt-2 max-w-2xl text-[0.875rem] leading-relaxed text-muted">{copy.note}</p>}
                            {weather && weather.temperature !== null && (
                                <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[0.75rem] text-muted underline-offset-2 hover:underline">
                                    {t.host.weatherBy}
                                </a>
                            )}
                            <div>
                                <WeatherNotice city={slug} cityName={cityName} />
                            </div>
                        </div>
                    ) : (
                        <div aria-hidden>
                            <h2 id="now-title" className="nt-skeleton mt-3 h-[2.4rem] w-4/5 max-w-xl rounded-lg md:h-[3.3rem]" />
                            <p className="nt-skeleton mt-4 h-5 w-3/5 max-w-md rounded" />
                        </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-2.5">
                        <button type="button" onClick={surprise} disabled={!shown.length} className="nt-btn nt-btn-primary">
                            <Sparkles size={17} />
                            {t.host.surprise}
                        </button>
                        {!origin && geo.status !== "denied" && (
                            <button type="button" onClick={geo.start} className="nt-btn nt-btn-outline">
                                <LocateFixed size={17} />
                                {geo.status === "locating" ? t.location.locating : t.host.nearMe}
                            </button>
                        )}
                        <Link
                            href={`${paths.search(locale, slug)}${moment ? `?i=${momentIntent(moment)}` : ""}`}
                            prefetch={false}
                            className="nt-btn nt-btn-outline"
                        >
                            {t.common.seeAll}
                            <ArrowRight size={17} />
                        </Link>
                    </div>
                </div>

                {/* The pick: one place, why it fits, and where to go after. */}
                <div ref={card} aria-live="polite" className="scroll-mt-24">
                    {pick && (
                        <div key={pick.place.slug} className="nt-card nt-rise mt-6 grid overflow-hidden md:grid-cols-[17rem_minmax(0,1fr)]">
                            <PlaceThumb
                                cover={pick.place.cover}
                                category={pick.place.category}
                                name={pick.place.name}
                                sizes="(min-width: 768px) 272px, 100vw"
                                className="aspect-[16/9] md:aspect-auto md:h-full md:min-h-[15rem]"
                                iconSize={34}
                            />
                            <div className="min-w-0 p-5 md:p-7">
                                <p className="nt-eyebrow">{t.host.pickEyebrow}</p>
                                <h3 className="nt-serif mt-2 flex items-center gap-2 text-[1.75rem] md:text-[2.25rem]">
                                    <span className="min-w-0 [overflow-wrap:anywhere]">{pick.place.name}</span>
                                    <VerifiedMark verified={pick.place.verified} className="shrink-0" />
                                </h3>
                                <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[0.875rem] text-muted">
                                    {[placeKind(pick.place, locale), pick.place.neighborhood, pick.distance !== null ? formatDistance(pick.distance, locale) : null]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </p>
                                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 empty:hidden">
                                    <OpenBadge hours={pick.place.hours} compact />
                                    <PriceLabel min={pick.place.priceMin} max={pick.place.priceMax} className="text-[0.875rem]" />
                                </div>

                                <div className="mt-5 flex flex-wrap gap-2">
                                    <Link href={paths.directions(locale, pick.place.slug)} className="nt-btn nt-btn-primary h-11 px-4 text-[0.875rem]">
                                        <Navigation size={16} />
                                        {t.spot.directions}
                                    </Link>
                                    <Link href={paths.place(locale, pick.place.slug)} className="nt-btn nt-btn-outline h-11 px-4 text-[0.875rem]">
                                        {t.blog.openPlace}
                                    </Link>
                                    <button type="button" onClick={surprise} className="nt-btn nt-btn-soft h-11 px-4 text-[0.875rem]">
                                        <Shuffle size={16} />
                                        {t.host.another}
                                    </button>
                                    <button type="button" onClick={send} className="nt-btn nt-btn-soft h-11 px-4 text-[0.875rem]">
                                        <Send size={16} />
                                        {t.host.send}
                                    </button>
                                </div>

                                {after.length > 0 && (
                                    <div className="mt-6 border-t border-line pt-4">
                                        <p className="nt-eyebrow">{t.host.after}</p>
                                        <ul className="mt-1 divide-y divide-line">
                                            {after.map((item) => (
                                                <li key={item.place.slug}>
                                                    <Link href={paths.place(locale, item.place.slug)} prefetch={false} className="group flex items-center gap-3 py-3">
                                                        <MapPin size={16} className="shrink-0 text-muted" />
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate font-semibold">{item.place.name}</span>
                                                            <span className="block truncate text-[0.875rem] text-muted">
                                                                {placeKind(item.place, locale)}
                                                                {item.distance !== null && ` · ${fill(t.host.fromHere, { distance: formatDistance(item.distance, locale) })}`}
                                                            </span>
                                                        </span>
                                                        <ArrowRight size={16} className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5" />
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ul className="nt-rail mt-8" aria-busy={waiting}>
                {waiting
                    ? Array.from({ length: 4 }, (_, index) => (
                          <li key={index} aria-hidden>
                              <div className="nt-skeleton aspect-[4/5] rounded-[1.1rem]" />
                          </li>
                      ))
                    : shown.map((item, index) => (
                          <li key={item.place.slug}>
                              <PinCard place={item.place} distance={item.distance} shape="portrait" priority={index < 2} />
                          </li>
                      ))}
            </ul>
        </section>
    );
}
