"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowLeft,
    ArrowUp,
    ArrowUpLeft,
    ArrowUpRight,
    Car,
    ChevronDown,
    ChevronUp,
    CornerUpLeft,
    CornerUpRight,
    Flag,
    Footprints,
    LocateFixed,
    MapPin,
    MessageCircle,
    Navigation,
    RotateCcw,
    RotateCw,
    Share2,
    TriangleAlert,
    Volume2,
    VolumeX,
    X,
    type LucideIcon,
} from "lucide-react";
import { cityBounds, type City } from "@/lib/cities";
import { fill } from "@/lib/i18n";
import { formatClock, formatDistance, formatDuration } from "@/lib/i18n/format";
import { categoryStyle } from "@/lib/places/display";
import type { LatLng } from "@/lib/places/geo";
import { paths } from "@/lib/places/paths";
import { useGeo } from "@/lib/hooks/useGeo";
import { useOrigin } from "@/lib/hooks/useOrigin";
import {
    bearing,
    currentStep,
    fetchRoute,
    instruction,
    isRushHour,
    pointAlong,
    snapToRoute,
    spoken,
    type Profile,
    type Route,
    type Step,
} from "@/lib/route/navigation";
import type { FollowCamera, MapRoute } from "../map/MapView";
import AreaPicker from "../explore/AreaPicker";
import { sharePlace } from "@/lib/share";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";

const MapView = dynamic(() => import("../map/MapView"), {
    ssr: false,
    loading: () => <div className="nt-skeleton absolute inset-0" aria-hidden />,
});

export type Destination = {
    id: string;
    slug: string;
    name: string;
    category: string;
    lat: number;
    lng: number;
    neighborhood: string | null;
    landmark: string | null;
};

type Phase = "preview" | "navigating" | "arrived";
const ARRIVAL_METERS = 35;
const OFF_ROUTE_METERS = 55;

const MANEUVER_ICONS: Record<string, LucideIcon> = {
    left: CornerUpLeft,
    "sharp left": CornerUpLeft,
    right: CornerUpRight,
    "sharp right": CornerUpRight,
    "slight left": ArrowUpLeft,
    "slight right": ArrowUpRight,
    uturn: RotateCcw,
};

// The arrow for a turn, as a stable component (not created per render).
function ManeuverIcon({ step, size, strokeWidth, className }: { step: Step | undefined; size: number; strokeWidth?: number; className?: string }) {
    const props = { size, strokeWidth, className };
    if (!step) return <ArrowUp {...props} />;
    const { type, modifier } = step.maneuver;
    if (type === "arrive") return <Flag {...props} />;
    if (type === "roundabout" || type === "rotary") return <RotateCw {...props} />;
    const Icon = (modifier && MANEUVER_ICONS[modifier]) || ArrowUp;
    return <Icon {...props} />;
}

function speak(text: string, locale: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale === "fr" ? "fr-FR" : "en-GB";
    utterance.rate = 1.02;
    window.speechSynthesis.speak(utterance);
}

export default function Navigator({
    place,
    city,
    areas,
}: {
    place: Destination;
    city: City;
    areas: { name: string; lat: number; lng: number }[];
}) {
    // ?demo=1 drives along the route by itself, to show how guidance feels.
    const demo = useSearchParams().get("demo") === "1";
    const { locale, t } = useLocale();
    const toast = useToast();
    const geo = useGeo();
    const { origin, chooseArea } = useOrigin(city, areas);
    const destination = useMemo<LatLng>(() => ({ lat: place.lat, lng: place.lng }), [place.lat, place.lng]);

    const [profile, setProfile] = useState<Profile>("car");
    const [routes, setRoutes] = useState<Partial<Record<Profile, Route>>>({});
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [phase, setPhase] = useState<Phase>("preview");
    // Phone: the details panel can be pulled down to a slim bar to see the map.
    const [collapsed, setCollapsed] = useState(false);
    const swipe = useRef<{ y: number; t: number } | null>(null);
    const swipeHandlers = {
        onPointerDown: (event: React.PointerEvent) => {
            swipe.current = { y: event.clientY, t: Date.now() };
        },
        onPointerUp: (event: React.PointerEvent) => {
            const start = swipe.current;
            swipe.current = null;
            if (!start) return;
            const dy = event.clientY - start.y;
            if (dy > 36) setCollapsed(true);
            else if (dy < -36) setCollapsed(false);
        },
        onPointerCancel: () => {
            swipe.current = null;
        },
    };
    const [muted, setMuted] = useState(false);
    const [stepsOpen, setStepsOpen] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [demoPosition, setDemoPosition] = useState<LatLng | null>(null);

    // Where we are: live GPS anywhere, else the chosen neighbourhood.
    const live = demoPosition ?? (geo.position ? { lat: geo.position.lat, lng: geo.position.lng } : null);
    const start = live ?? origin?.position ?? null;
    const startKey = start ? `${start.lat.toFixed(3)},${start.lng.toFixed(3)}` : "";
    const route = routes[profile] ?? null;

    // Both profiles are fetched together so switching mode is instant.
    useEffect(() => {
        if (!start || phase !== "preview") return;
        const controller = new AbortController();
        setLoading(true);
        setFailed(false);
        Promise.allSettled([
            fetchRoute(start, destination, "car", controller.signal),
            fetchRoute(start, destination, "foot", controller.signal),
        ]).then(([car, foot]) => {
            if (controller.signal.aborted) return;
            setRoutes({
                car: car.status === "fulfilled" ? car.value : undefined,
                foot: foot.status === "fulfilled" ? foot.value : undefined,
            });
            setFailed(car.status === "rejected" && foot.status === "rejected");
            setLoading(false);
        });
        return () => controller.abort();
    }, [startKey, destination, attempt, phase === "preview"]);

    // Walking under ~1 km is the natural choice.
    useEffect(() => {
        if (routes.car && routes.car.distance < 900 && routes.foot) {
            setProfile("foot");
        }
    }, [routes.car, routes.foot]);

    // ---- Live navigation -------------------------------------------------
    const progressRef = useRef({ step: -1, announced: new Set<string>(), offRoute: 0, rerouting: false });
    const [nav, setNav] = useState<{ along: number; step: number; toManeuver: number; camera: FollowCamera | null }>({
        along: 0,
        step: 0,
        toManeuver: 0,
        camera: null,
    });

    const say = useCallback(
        (text: string) => {
            if (!muted) speak(text, locale);
        },
        [muted, locale]
    );

    useEffect(() => {
        if (phase !== "navigating" || !route || !live) return;
        const snap = snapToRoute(route, live);
        const along = snap.along;
        const index = currentStep(route, along);
        const next = route.steps[Math.min(index + 1, route.steps.length - 1)];
        const toManeuver = Math.max(0, (next?.start ?? route.distance) - along);
        const ahead = pointAlong(route, along + 35);
        const here = pointAlong(route, along);

        setNav({ along, step: index, toManeuver, camera: { lat: live.lat, lng: live.lng, bearing: bearing(here, ahead) } });

        const state = progressRef.current;
        const remaining = route.distance - along;
        if (remaining < ARRIVAL_METERS) {
            setPhase("arrived");
            say(fill(t.route.arrivedVoice, { name: place.name }));
            if (navigator.vibrate) navigator.vibrate([30, 60, 30, 60, 60]);
            return;
        }
        if (next) {
            for (const threshold of [400, 150, 35]) {
                const key = `${index + 1}:${threshold}`;
                if (toManeuver <= threshold && !state.announced.has(key)) {
                    state.announced.add(key);
                    say(spoken(next, toManeuver, locale));
                    break;
                }
            }
        }

        // Off the road for a few fixes in a row: find a new way.
        if (snap.offset > OFF_ROUTE_METERS && !demoPosition) {
            state.offRoute += 1;
            if (state.offRoute >= 3 && !state.rerouting) {
                state.rerouting = true;
                toast(t.route.rerouting);
                say(t.route.rerouting);
                fetchRoute(live, destination, profile)
                    .then((fresh) => {
                        setRoutes((current) => ({ ...current, [profile]: fresh }));
                        state.announced.clear();
                    })
                    .catch(() => {})
                    .finally(() => {
                        state.rerouting = false;
                        state.offRoute = 0;
                    });
            }
        } else {
            state.offRoute = 0;
        }
    }, [live?.lat, live?.lng, phase, route]);

    // Keep the screen on while guiding.
    useEffect(() => {
        if (phase !== "navigating") return;
        let lock: WakeLockSentinel | null = null;
        navigator.wakeLock?.request("screen").then((sentinel) => (lock = sentinel)).catch(() => {});
        return () => {
            lock?.release().catch(() => {});
            window.speechSynthesis?.cancel();
        };
    }, [phase]);

    // Demo mode (?demo=1): drive along the route to show how guidance feels.
    useEffect(() => {
        if (!demo || phase !== "navigating" || !route) return;
        let along = 0;
        const id = window.setInterval(() => {
            along += profile === "car" ? 22 : 6;
            const [lng, lat] = pointAlong(route, along);
            setDemoPosition({ lat, lng });
        }, 900);
        return () => window.clearInterval(id);
    }, [demo, phase, route, profile]);

    const begin = () => {
        if (!route) return;
        if (!geo.position && !demo) {
            geo.start();
            toast(t.route.enableLocation);
            return;
        }
        progressRef.current = { step: -1, announced: new Set(), offRoute: 0, rerouting: false };
        setPhase("navigating");
        say(instruction(route.steps[0], locale));
    };

    const stop = () => {
        setPhase("preview");
        setDemoPosition(null);
        window.speechSynthesis?.cancel();
    };

    // ---- Derived view values --------------------------------------------
    const now = new Date();
    const remainingMeters = route ? Math.max(0, route.distance - (phase === "navigating" ? nav.along : 0)) : 0;
    const remainingSeconds = route ? route.duration * (remainingMeters / Math.max(route.distance, 1)) : 0;
    const arrival = formatClock(new Date(now.getTime() + remainingSeconds * 1000), locale);
    const next = route?.steps[Math.min(nav.step + 1, route.steps.length - 1)];
    const after = route?.steps[Math.min(nav.step + 2, route.steps.length - 1)];
    const art = categoryStyle(place.category);
    const ArtIcon = art.icon;

    const mapRoute = useMemo<MapRoute | null>(
        () => (route ? { coordinates: route.coordinates, progress: phase === "navigating" ? nav.along / route.distance : 0 } : null),
        [route, phase, nav.along]
    );

    const driverMessage = fill(t.route.driverText, {
        name: place.name,
        area: [place.landmark, place.neighborhood, city.name].filter(Boolean).join(", "),
        link: `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`,
    });

    const startLabel = live ? t.route.yourPosition : origin?.kind === "area" ? fill(t.route.fromArea, { area: origin.name }) : null;

    return (
        <div className="fixed inset-0 overflow-hidden bg-bg">
            <MapView
                className={`nt-fullmap absolute inset-0 ${phase === "preview" ? "md:left-[440px]" : ""}`}
                pins={[]}
                user={live ? { ...live, heading: phase === "navigating" ? null : geo.position?.heading ?? null } : null}
                start={!live && origin?.kind === "area" ? origin.position : null}
                destination={destination}
                route={mapRoute}
                follow={phase === "navigating" ? nav.camera : null}
                center={destination}
                zoom={15}
                bounds={cityBounds(city)}
                padding={
                    phase === "navigating"
                        ? { top: 200, bottom: 160, left: 40, right: 40 }
                        : {
                              top: 90,
                              bottom: typeof window !== "undefined" && window.innerWidth >= 768 ? 90 : collapsed ? 200 : 420,
                              left: 50,
                              right: 50,
                          }
                }
                fitKey={collapsed ? "collapsed" : "open"}
            />

            {/* ---------------- Preview ---------------- */}
            <AnimatePresence>
                {phase === "preview" && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="pointer-events-none absolute inset-x-0 top-0 z-20 flex p-3 pt-[max(env(safe-area-inset-top),0.75rem)] md:left-[440px]"
                        >
                            <Link
                                href={paths.place(locale, place.slug)}
                                className="nt-glass pointer-events-auto grid h-11 w-11 place-items-center rounded-full shadow-card transition active:scale-90"
                                aria-label={t.common.back}
                            >
                                <ArrowLeft size={20} />
                            </Link>
                        </motion.div>

                        {collapsed && (
                            <motion.button
                                key="peek"
                                type="button"
                                initial={{ y: 80, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 80, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 420, damping: 38 }}
                                onClick={() => setCollapsed(false)}
                                {...swipeHandlers}
                                className="absolute inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-30 flex touch-none items-center gap-3 rounded-[1.6rem] border border-line bg-bg p-3 pl-4 text-left shadow-float md:hidden"
                                aria-label={t.route.showDetails}
                            >
                                <span className="absolute top-1.5 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-line-strong" />
                                <span className="min-w-0 flex-1 pt-1.5">
                                    <span className="block truncate font-display text-[1.02rem] font-extrabold">{place.name}</span>
                                    <span className="block truncate text-sm font-semibold text-muted">
                                        {route ? `${formatDuration(route.duration, locale)} · ${formatDistance(route.distance, locale)}` : t.route.loading}
                                    </span>
                                </span>
                                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-2">
                                    <ChevronUp size={20} />
                                </span>
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        begin();
                                    }}
                                    className="nt-btn nt-btn-primary h-11 shrink-0 px-4 text-sm"
                                >
                                    <Navigation size={16} />
                                    {t.route.start}
                                </span>
                            </motion.button>
                        )}

                        <motion.section
                            initial={{ y: 60, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 80, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 380, damping: 38 }}
                            className={`${collapsed ? "hidden md:block" : ""} absolute inset-x-0 bottom-0 z-30 max-h-[70dvh] overflow-y-auto rounded-t-[2rem] border-t border-line bg-bg px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-float md:inset-y-0 md:left-0 md:max-h-none md:w-[440px] md:rounded-none md:border-t-0 md:border-r md:px-6 md:pt-8`}
                            aria-labelledby="route-title"
                        >
                            {/* Grab zone: swipe down (or tap) to see the map. */}
                            <button
                                type="button"
                                onClick={() => setCollapsed(true)}
                                {...swipeHandlers}
                                className="-mx-4 -mt-3 mb-1 flex w-[calc(100%+2rem)] touch-none flex-col items-center gap-1 pt-3 pb-2 md:hidden"
                                aria-label={t.route.showMap}
                            >
                                <span className="h-1.5 w-11 rounded-full bg-line-strong" />
                                <span className="inline-flex items-center gap-1 text-[0.72rem] font-bold text-muted">
                                    <ChevronDown size={14} />
                                    {t.route.showMap}
                                </span>
                            </button>

                            <div className="mb-4 flex items-center gap-3">
                                <span
                                    className="nt-art grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
                                    style={{ "--tone": art.tone } as React.CSSProperties}
                                >
                                    <ArtIcon size={22} />
                                </span>
                                <div className="min-w-0">
                                    <p className="nt-eyebrow">{t.route.title}</p>
                                    <h1 id="route-title" className="truncate text-xl leading-tight font-extrabold">
                                        {place.name}
                                    </h1>
                                </div>
                            </div>

                            {/* Mode */}
                            <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1" role="tablist">
                                {(["car", "foot"] as Profile[]).map((mode) => {
                                    const Icon = mode === "car" ? Car : Footprints;
                                    const option = routes[mode];
                                    const active = profile === mode;
                                    return (
                                        <button
                                            key={mode}
                                            type="button"
                                            role="tab"
                                            aria-selected={active}
                                            onClick={() => setProfile(mode)}
                                            className={`relative flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${active ? "text-text" : "text-muted"}`}
                                        >
                                            {active && (
                                                <motion.span layoutId="nt-mode" className="absolute inset-0 rounded-xl bg-surface shadow-card" />
                                            )}
                                            <Icon size={17} className="relative" />
                                            <span className="relative">{mode === "car" ? t.route.car : t.route.walk}</span>
                                            {option && (
                                                <span className="relative font-semibold text-muted">{formatDuration(option.duration, locale)}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Start */}
                            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
                                <div className="flex min-w-0 items-center gap-2.5 text-sm">
                                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600 ring-4 ring-blue-600/15" />
                                    <span className="truncate font-semibold">
                                        {geo.status === "locating" ? t.location.locating : startLabel ?? t.route.chooseStart}
                                    </span>
                                </div>
                                <button type="button" onClick={() => setPickerOpen(true)} className="shrink-0 text-sm font-bold text-brand-600">
                                    {t.route.changeStart}
                                </button>
                            </div>

                            {!start && (
                                <div className="mb-4 grid gap-2">
                                    <button type="button" onClick={geo.start} className="nt-btn nt-btn-primary w-full">
                                        <LocateFixed size={18} />
                                        {t.location.useMine}
                                    </button>
                                    <button type="button" onClick={() => setPickerOpen(true)} className="nt-btn nt-btn-soft w-full">
                                        <MapPin size={18} />
                                        {t.location.chooseArea}
                                    </button>
                                </div>
                            )}

                            {loading && !route && (
                                <div className="mb-4" role="status">
                                    <p className="sr-only">{t.route.loading}</p>
                                    <div className="nt-skeleton mb-2 h-10 w-44 rounded-xl" />
                                    <div className="nt-skeleton h-4 w-60 rounded" />
                                </div>
                            )}

                            {failed && (
                                <div className="mb-4 rounded-2xl border border-line p-4 text-sm">
                                    <p className="mb-2 font-semibold">{t.route.failed}</p>
                                    <button type="button" onClick={() => setAttempt((value) => value + 1)} className="font-bold text-brand-600">
                                        {t.common.retry}
                                    </button>
                                </div>
                            )}

                            {route && (
                                <div className="mb-5">
                                    <div className="flex items-baseline gap-3">
                                        <p className="font-display text-[2.4rem] leading-none font-extrabold">{formatDuration(route.duration, locale)}</p>
                                        <p className="text-sm font-semibold text-muted">{formatDistance(route.distance, locale)}</p>
                                    </div>
                                    <p className="mt-1.5 text-sm text-text-2">{fill(t.route.arrival, { time: arrival })}</p>
                                    {profile === "car" && isRushHour() && (
                                        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-closing/10 px-3 py-1 text-xs font-bold text-closing">
                                            <TriangleAlert size={13} />
                                            {t.route.rushHour}
                                        </p>
                                    )}
                                    {profile === "foot" && route.duration > 35 * 60 && (
                                        <p className="mt-2 text-xs font-semibold text-muted">{t.route.walkLong}</p>
                                    )}
                                </div>
                            )}

                            {place.landmark && (
                                <div className="mb-4 rounded-2xl bg-brand-50 p-4 text-sm dark:bg-brand-700/20">
                                    <p className="nt-eyebrow mb-1 text-brand-700 dark:text-brand-200">{t.route.landmark}</p>
                                    <p className="font-semibold">{place.landmark}</p>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={begin}
                                disabled={!route}
                                className="nt-btn nt-btn-primary h-14 w-full text-[1.05rem] disabled:opacity-50"
                            >
                                <Navigation size={20} />
                                {geo.position || demo ? t.route.start : t.route.enableLocation}
                            </button>

                            <div className="mt-2.5 grid grid-cols-2 gap-2">
                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent(driverMessage)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="nt-btn nt-btn-soft px-2 text-sm"
                                >
                                    <MessageCircle size={17} />
                                    {t.route.shareDriver}
                                </a>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const url = `${window.location.origin}${paths.place(locale, place.slug)}`;
                                        const result = await sharePlace(place.name, url, fill(t.spot.shareText, { name: place.name }));
                                        if (result === "copied") toast(t.common.copied);
                                    }}
                                    className="nt-btn nt-btn-soft px-2 text-sm"
                                >
                                    <Share2 size={17} />
                                    {t.spot.share}
                                </button>
                            </div>

                            {route && route.steps.length > 1 && (
                                <div className="mt-5 border-t border-line pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setStepsOpen(!stepsOpen)}
                                        className="flex w-full items-center justify-between text-sm font-bold"
                                        aria-expanded={stepsOpen}
                                    >
                                        {fill(t.route.stepsCount, { count: route.steps.length })}
                                        <ChevronDown size={18} className={`transition ${stepsOpen ? "rotate-180" : ""}`} />
                                    </button>
                                    {stepsOpen && (
                                        <ol className="mt-3 flex flex-col">
                                            {route.steps.map((step, index) => {
                                                return (
                                                    <li key={index} className="flex items-start gap-3 border-b border-line py-2.5 text-sm last:border-0">
                                                        <ManeuverIcon step={step} size={18} className="mt-0.5 shrink-0 text-brand-500" />
                                                        <span className="flex-1">{instruction(step, locale)}</span>
                                                        {step.distance > 0 && (
                                                            <span className="shrink-0 text-xs font-semibold text-muted">{formatDistance(step.distance, locale)}</span>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ol>
                                    )}
                                </div>
                            )}

                            <p className="mt-5 text-xs text-muted">{t.route.dataNote}</p>
                        </motion.section>
                    </>
                )}
            </AnimatePresence>

            {/* ---------------- Guidance ---------------- */}
            <AnimatePresence>
                {phase === "navigating" && route && (
                    <>
                        <motion.div
                            initial={{ y: -120, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -120, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 360, damping: 34 }}
                            className="absolute inset-x-3 top-[max(env(safe-area-inset-top),0.75rem)] z-30 mx-auto max-w-lg"
                        >
                            <div className="overflow-hidden rounded-[1.6rem] bg-[#0f0c0a] text-white shadow-float">
                                <div className="flex items-center gap-4 p-4">
                                    <span className="nt-sunset grid h-16 w-16 shrink-0 place-items-center rounded-2xl shadow-[var(--nt-glow)]">
                                        <ManeuverIcon step={next} size={34} strokeWidth={2.4} />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="font-display text-[2rem] leading-none font-extrabold" aria-live="polite">
                                            {formatDistance(nav.toManeuver, locale)}
                                        </p>
                                        <p className="mt-1 line-clamp-2 text-[0.95rem] font-semibold text-white/85">{next ? instruction(next, locale) : ""}</p>
                                    </div>
                                </div>
                                {after && after !== next && (
                                    <div className="flex items-center gap-2 border-t border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
                                        <span className="font-bold">{t.route.then}</span>
                                        <ManeuverIcon step={after} size={16} />
                                        <span className="truncate">{instruction(after, locale)}</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ y: 140 }}
                            animate={{ y: 0 }}
                            exit={{ y: 140 }}
                            transition={{ type: "spring", stiffness: 360, damping: 34 }}
                            className="absolute inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-30 mx-auto max-w-lg"
                        >
                            <div className="nt-glass flex items-center gap-3 rounded-[1.6rem] border border-line p-3 pl-5 shadow-float">
                                <div className="min-w-0 flex-1">
                                    <p className="font-display text-[1.6rem] leading-none font-extrabold text-open">{arrival}</p>
                                    <p className="mt-1 text-sm font-semibold text-muted">
                                        {formatDuration(remainingSeconds, locale)} · {formatDistance(remainingMeters, locale)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setMuted(!muted)}
                                    className="grid h-12 w-12 place-items-center rounded-full bg-surface-2"
                                    aria-label={muted ? t.route.unmute : t.route.mute}
                                    aria-pressed={muted}
                                >
                                    {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={stop}
                                    className="grid h-12 w-12 place-items-center rounded-full bg-closed text-white"
                                    aria-label={t.route.stop}
                                >
                                    <X size={22} />
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ---------------- Arrived ---------------- */}
            <AnimatePresence>
                {phase === "arrived" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-40 grid place-items-center bg-black/55 p-5 backdrop-blur-sm"
                    >
                        {Array.from({ length: 26 }, (_, index) => (
                            <motion.span
                                key={index}
                                className="absolute top-1/2 left-1/2 h-2.5 w-2.5 rounded-sm"
                                style={{ background: ["#ff8a1f", "#ff5b36", "#eb3a6f", "#facc15", "#22c55e"][index % 5] }}
                                initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                                animate={{
                                    x: Math.cos((index / 26) * Math.PI * 2) * (140 + (index % 4) * 40),
                                    y: Math.sin((index / 26) * Math.PI * 2) * (140 + (index % 3) * 50) + 120,
                                    opacity: 0,
                                    rotate: 360,
                                }}
                                transition={{ duration: 1.6, ease: "easeOut" }}
                            />
                        ))}
                        <motion.div
                            initial={{ scale: 0.85, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 22 }}
                            className="relative w-full max-w-sm rounded-[2rem] bg-bg p-7 text-center shadow-float"
                        >
                            <span className="nt-sunset mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full text-white shadow-[var(--nt-glow)]">
                                <Flag size={30} />
                            </span>
                            <h2 className="text-2xl font-extrabold">{t.route.arrived}</h2>
                            <p className="mt-1 text-text-2">{fill(t.route.arrivedBody, { name: place.name })}</p>
                            <div className="mt-6 grid gap-2">
                                <Link href={paths.place(locale, place.slug)} className="nt-btn nt-btn-primary w-full">
                                    {t.route.seePlace}
                                </Link>
                                <button type="button" onClick={stop} className="nt-btn nt-btn-soft w-full">
                                    {t.route.done}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AreaPicker
                open={pickerOpen}
                current={origin?.kind === "area" ? origin.name : null}
                areas={areas}
                onClose={() => setPickerOpen(false)}
                onPick={chooseArea}
                onLocate={geo.start}
            />
        </div>
    );
}
