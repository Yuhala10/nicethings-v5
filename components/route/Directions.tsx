"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Car, ExternalLink, Footprints, LocateFixed, MapPin, MessageCircle, Navigation, RotateCw, TriangleAlert } from "lucide-react";
import { fill } from "@/lib/i18n";
import { formatClock, formatDistance, formatDuration } from "@/lib/i18n/format";
import { distanceMeters, type LatLng } from "@/lib/places/geo";
import { cityNow } from "@/lib/places/hours";
import { useNow } from "@/lib/hooks/useNow";
import { useOrigin } from "@/lib/hooks/useOrigin";
import type { MapPin as MapPinData, MapRoute } from "../map/MapView";
import AreaPicker from "../explore/AreaPicker";
import BackButton from "../site/BackButton";
import { FloatingNav } from "../site/SiteChrome";
import { useLocale } from "../site/LocaleProvider";

const MapView = dynamic(() => import("../map/MapView"), {
    ssr: false,
    loading: () => <div className="nt-skeleton absolute inset-0" aria-hidden />,
});

type Destination = {
    id: string;
    name: string;
    lat: number;
    lng: number;
    neighborhood: string | null;
    landmark: string | null;
};

type RouteResult = { coordinates: [number, number][]; distance: number; duration: number };
type RouteState = { status: "idle" | "loading" | "failed" } | { status: "done"; route: RouteResult };

// Free OSRM demo router (OpenStreetMap road network, car profile).
async function fetchRoute(from: LatLng, to: LatLng, signal: AbortSignal): Promise<RouteResult> {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`OSRM ${response.status}`);
    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) throw new Error("No route");
    return { coordinates: route.geometry.coordinates, distance: route.distance, duration: route.duration };
}

// Weekday rush hours in Yaoundé traffic.
function isRushHour(now: Date) {
    const { dayIndex, minutes } = cityNow(now);
    if (dayIndex >= 5) return false;
    return (minutes >= 6 * 60 + 30 && minutes <= 9 * 60) || (minutes >= 16 * 60 + 30 && minutes <= 19 * 60 + 30);
}

const WALK_SPEED = 1.25; // m/s, city walking with crossings

// OSRM assumes empty roads at speed-limit pace. Yaoundé traffic, taxis
// stopping to pick people up and hills make real trips much slower.
function realisticDuration(seconds: number, now: Date | null) {
    return seconds * (now && isRushHour(now) ? 2.4 : 1.7);
}

export default function Directions({ place }: { place: Destination }) {
    const { locale, t } = useLocale();
    const now = useNow();
    const { origin, status, locate, chooseArea } = useOrigin();
    const [pickerOpen, setPickerOpen] = useState(false);
    const [state, setState] = useState<RouteState>({ status: "idle" });
    const [attempt, setAttempt] = useState(0);

    const start = origin?.position ?? null;

    useEffect(() => {
        if (!start) return;
        const controller = new AbortController();
        let cancelled = false; // superseded by a newer start point, or unmounted
        const timeout = window.setTimeout(() => controller.abort(), 12000);
         
        setState({ status: "loading" });
        fetchRoute(start, place, controller.signal)
            .then((route) => !cancelled && setState({ status: "done", route }))
            .catch(() => !cancelled && setState({ status: "failed" }))
            .finally(() => window.clearTimeout(timeout));
        return () => {
            cancelled = true;
            window.clearTimeout(timeout);
            controller.abort();
        };
         
    }, [start?.lat, start?.lng, place.lat, place.lng, attempt]);

    const pins = useMemo<MapPinData[]>(() => [{ id: place.id, lat: place.lat, lng: place.lng, label: "", open: null }], [place]);
    const route = useMemo<MapRoute | null>(
        () => (state.status === "done" ? { coordinates: state.route.coordinates } : null),
        [state]
    );

    const straight = start ? distanceMeters(start, place) : null;
    const startLabel =
        origin?.kind === "gps" ? t.route.yourPosition : origin?.kind === "area" ? fill(t.route.fromArea, { area: origin.name }) : null;

    const destinationLink = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
    const googleDirections = `https://www.google.com/maps/dir/?api=1${start ? `&origin=${start.lat},${start.lng}` : ""}&destination=${place.lat},${place.lng}&travelmode=driving`;
    const driverMessage = fill(t.route.driverText, {
        name: place.name,
        area: [place.landmark, place.neighborhood].filter(Boolean).join(", ") || "Yaoundé",
        link: destinationLink,
    });

    return (
        <div className="fixed inset-0 overflow-hidden bg-bg">
            <MapView
                className="absolute inset-0 md:left-[420px]"
                pins={pins}
                selectedId={place.id}
                user={origin?.kind === "gps" ? origin.position : null}
                route={route}
                padding={{ top: 90, bottom: 360, left: 40, right: 40 }}
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center gap-2 p-3 pt-[max(env(safe-area-inset-top),0.75rem)] md:left-[420px]">
                <BackButton className="pointer-events-auto" />
                <div className="pointer-events-auto ml-auto">
                    <FloatingNav />
                </div>
            </div>

            <section
                className="nt-safe-bottom absolute inset-x-0 bottom-0 z-30 max-h-[75dvh] overflow-y-auto rounded-t-[1.75rem] border-t border-line bg-bg px-4 pt-5 pb-24 shadow-float md:inset-y-0 md:left-0 md:max-h-none md:w-[420px] md:rounded-none md:border-t-0 md:border-r md:pb-6"
                aria-labelledby="route-title"
            >
                <p className="nt-eyebrow">{t.route.title}</p>
                <h1 id="route-title" className="mb-4 text-xl leading-tight font-extrabold">
                    {place.name}
                    {place.neighborhood && <span className="font-semibold text-muted"> · {place.neighborhood}</span>}
                </h1>

                {/* Start point */}
                <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2.5 text-sm">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600 ring-4 ring-blue-600/15" />
                        <span className="truncate font-semibold">
                            {status === "locating" ? t.location.locating : startLabel ?? t.route.chooseStart}
                        </span>
                    </div>
                    {start && (
                        <button type="button" onClick={() => setPickerOpen(true)} className="shrink-0 text-sm font-bold text-brand-600">
                            {t.route.changeStart}
                        </button>
                    )}
                </div>

                {!start && status !== "locating" && (
                    <div className="mb-4">
                        <p className="mb-3 text-sm text-text-2">
                            {status === "denied" ? t.location.denied : t.route.needLocation}
                        </p>
                        <div className="grid gap-2">
                            <button type="button" onClick={locate} className="nt-btn nt-btn-primary px-3 text-sm">
                                <LocateFixed size={17} />
                                {t.location.useMine}
                            </button>
                            <button type="button" onClick={() => setPickerOpen(true)} className="nt-btn nt-btn-soft px-3 text-sm">
                                <MapPin size={17} />
                                {t.location.chooseArea}
                            </button>
                        </div>
                    </div>
                )}

                {state.status === "loading" && (
                    <div className="mb-4" role="status">
                        <p className="sr-only">{t.route.loading}</p>
                        <div className="nt-skeleton mb-2 h-9 w-40 rounded-lg" />
                        <div className="nt-skeleton h-4 w-56 rounded" />
                    </div>
                )}

                {state.status === "done" && (
                    <div className="mb-4">
                        <div className="flex items-end gap-3">
                            <Car size={22} className="mb-1.5 text-brand-500" />
                            <p className="font-display text-[2rem] leading-none font-extrabold">
                                ≈ {formatDuration(realisticDuration(state.route.duration, now), locale)}
                            </p>
                            <p className="mb-1 text-sm font-semibold text-muted">
                                {formatDistance(state.route.distance, locale)} · {t.route.car}
                            </p>
                        </div>
                        {now && (
                            <p className="mt-1.5 text-sm text-text-2">
                                {fill(t.route.arrival, { time: formatClock(new Date(now.getTime() + realisticDuration(state.route.duration, now) * 1000), locale) })}
                            </p>
                        )}
                        {now && isRushHour(now) && (
                            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-closing/10 px-3 py-1 text-xs font-bold text-closing">
                                <TriangleAlert size={13} />
                                {t.route.rushHour}
                            </p>
                        )}
                        <p className="mt-3 flex items-center gap-2 text-sm text-text-2">
                            <Footprints size={16} className="text-muted" />
                            {t.route.walk} · {formatDuration(state.route.distance / WALK_SPEED, locale)}
                            {state.route.distance / WALK_SPEED > 35 * 60 && (
                                <span className="text-muted">· {t.route.walkLong}</span>
                            )}
                        </p>
                    </div>
                )}

                {state.status === "failed" && (
                    <div className="mb-4 rounded-2xl border border-line p-4 text-sm">
                        <p className="mb-1 font-semibold">{t.route.failed}</p>
                        {straight !== null && (
                            <p className="mb-3 text-muted">{fill(t.route.straightLine, { distance: formatDistance(straight, locale) })}</p>
                        )}
                        <button type="button" onClick={() => setAttempt((value) => value + 1)} className="inline-flex items-center gap-1.5 font-bold text-brand-600">
                            <RotateCw size={15} />
                            {t.common.retry}
                        </button>
                    </div>
                )}

                {place.landmark && (
                    <div className="mb-4 rounded-2xl bg-brand-50 p-4 text-sm dark:bg-brand-700/15">
                        <p className="nt-eyebrow mb-1 text-brand-700 dark:text-brand-200">{t.route.landmark}</p>
                        <p className="font-semibold">{place.landmark}</p>
                    </div>
                )}

                <div className="grid gap-2">
                    <a
                        href={googleDirections}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`nt-btn w-full ${start ? "nt-btn-primary" : "nt-btn-soft"}`}
                    >
                        <Navigation size={18} />
                        {t.route.openGoogle}
                        <ExternalLink size={14} className="opacity-70" />
                    </a>
                    <a
                        href={`https://wa.me/?text=${encodeURIComponent(driverMessage)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="nt-btn nt-btn-soft w-full"
                    >
                        <MessageCircle size={18} />
                        {t.route.shareDriver}
                    </a>
                </div>

                <p className="mt-4 text-xs text-muted">{t.route.dataNote}</p>
            </section>

            <AreaPicker
                open={pickerOpen}
                current={origin?.kind === "area" ? origin.name : null}
                onClose={() => setPickerOpen(false)}
                onPick={chooseArea}
                onLocate={locate}
            />
        </div>
    );
}
