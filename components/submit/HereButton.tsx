"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, LocateFixed, MapPinOff, RotateCcw, Satellite, X } from "lucide-react";
import { cityBySlug } from "@/lib/cities";
import { fill } from "@/lib/i18n";
import { useGeo, type GeoPosition } from "@/lib/hooks/useGeo";
import PlaceMap from "../place/PlaceMap";
import { useLocale } from "../site/LocaleProvider";

export type Pin = { lat: number; lng: number; accuracy: number };

// Readings are kept for this long after the tap, the most precise one wins.
const CAPTURE_MS = 20000;
const GOOD_ENOUGH_M = 10;
const ROUGH_M = 60;

// "I'm there now": one big tap pins the place where the visitor stands. It
// keeps the most precise GPS reading for a few seconds, shows it on a small
// map, and tells the form which city and neighbourhood that is.
export default function HereButton({
    pin,
    onPin,
    onArea,
    category,
}: {
    pin: Pin | null;
    onPin: (pin: Pin | null) => void;
    onArea: (area: { city: string | null; neighborhood: string | null }) => void;
    category: string;
}) {
    const { t } = useLocale();
    const geo = useGeo();
    const [capturing, setCapturing] = useState(false);
    const [area, setArea] = useState<string | null>(null);
    const startedAt = useRef(0);
    const best = useRef<GeoPosition | null>(null);

    // Keep the best reading while capturing.
    useEffect(() => {
        const reading = geo.position;
        if (!capturing || !reading || reading.at < startedAt.current - 60000) return;
        if (!best.current || reading.accuracy < best.current.accuracy) {
            best.current = reading;
            onPin({ lat: reading.lat, lng: reading.lng, accuracy: Math.round(reading.accuracy) });
        }
        if (reading.accuracy <= GOOD_ENOUGH_M) setCapturing(false);
    }, [geo.position, capturing]);

    useEffect(() => {
        if (!capturing) return;
        const timer = window.setTimeout(() => setCapturing(false), CAPTURE_MS);
        return () => window.clearTimeout(timer);
    }, [capturing]);

    // Once the pin settles, name the area around it.
    useEffect(() => {
        if (capturing || !pin) return;
        const controller = new AbortController();
        fetch(`/api/nearby-area?lat=${pin.lat.toFixed(5)}&lng=${pin.lng.toFixed(5)}`, { signal: controller.signal })
            .then((response) => response.json())
            .then((result: { city: string | null; neighborhood: string | null }) => {
                const cityName = cityBySlug(result.city)?.name ?? null;
                setArea([result.neighborhood, cityName].filter(Boolean).join(", ") || null);
                onArea(result);
            })
            .catch(() => {});
        return () => controller.abort();
    }, [capturing, pin?.lat, pin?.lng]);

    const start = () => {
        best.current = null;
        startedAt.current = Date.now();
        setArea(null);
        onPin(null);
        setCapturing(true);
        geo.start();
    };

    const reset = () => {
        setCapturing(false);
        setArea(null);
        onPin(null);
    };

    const blocked = geo.status === "denied";
    const noSignal = capturing && !pin && geo.status === "unavailable";
    const state = pin && !capturing ? "pinned" : capturing ? "locating" : "idle";

    return (
        <div>
            <AnimatePresence mode="wait" initial={false}>
                {state === "pinned" && pin ? (
                    <motion.div
                        key="pinned"
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="overflow-hidden rounded-[1.6rem] border border-line bg-surface shadow-card"
                    >
                        <div className="relative h-40">
                            <PlaceMap id="here" lat={pin.lat} lng={pin.lng} category={category || "Other"} className="absolute inset-0" />
                        </div>
                        <div className="flex items-center gap-3 p-4">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-open/15 text-open">
                                <Check size={22} strokeWidth={2.6} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-bold">{t.submit.pinned}</span>
                                <span className="block truncate text-sm text-muted">
                                    {[area && fill(t.submit.detected, { area }), fill(t.submit.precision, { m: pin.accuracy })].filter(Boolean).join(" · ")}
                                </span>
                            </span>
                            <button type="button" onClick={start} className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-text-2" aria-label={t.submit.retry}>
                                <RotateCcw size={17} />
                            </button>
                            <button type="button" onClick={reset} className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-text-2" aria-label={t.submit.remove}>
                                <X size={18} />
                            </button>
                        </div>
                        {pin.accuracy > ROUGH_M && <p className="border-t border-line bg-amber-500/10 px-4 py-3 text-sm font-semibold text-text-2">{t.submit.rough}</p>}
                    </motion.div>
                ) : (
                    <motion.button
                        key="button"
                        type="button"
                        onClick={start}
                        disabled={state === "locating"}
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        whileTap={{ scale: 0.98 }}
                        className="nt-sunset block w-full rounded-[1.6rem] p-[2px] text-left shadow-[var(--nt-glow)]"
                    >
                        <span className="flex items-center gap-4 rounded-[calc(1.6rem-2px)] bg-surface px-4 py-4">
                            <span className="relative grid h-14 w-14 shrink-0 place-items-center">
                                <span className={`absolute inset-0 rounded-2xl bg-brand-500/25 ${state === "locating" ? "animate-ping" : "nt-here-breathe"}`} />
                                <span className="nt-sunset relative grid h-14 w-14 place-items-center rounded-2xl text-white">
                                    {state === "locating" ? <Satellite size={24} className="animate-pulse" /> : <LocateFixed size={26} strokeWidth={2.3} />}
                                </span>
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-display text-[1.08rem] leading-tight font-extrabold">
                                    {state === "locating" ? t.submit.locating : t.submit.here}
                                </span>
                                <span className="mt-0.5 block text-sm text-muted">
                                    {state === "locating"
                                        ? pin
                                            ? fill(t.submit.precision, { m: pin.accuracy })
                                            : t.submit.locatingHint
                                        : t.submit.hereHint}
                                </span>
                            </span>
                            {state === "idle" && <ChevronRight size={20} className="shrink-0 text-muted" />}
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>

            {(blocked || noSignal) && state !== "pinned" && (
                <p role="status" className="mt-2 flex items-start gap-2 text-sm font-semibold text-text-2">
                    <MapPinOff size={17} className="mt-0.5 shrink-0 text-closed" />
                    {blocked ? t.submit.denied : t.submit.noSignal}
                </p>
            )}
        </div>
    );
}
