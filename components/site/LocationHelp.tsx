"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LocateFixed, MapPinOff, X } from "lucide-react";
import { LOCATION_HELP_EVENT, startGeo } from "@/lib/hooks/useGeo";
import { useLocale } from "./LocaleProvider";

type Device = "inApp" | "ios" | "android" | "desktop";

function detectDevice(): Device {
    const ua = navigator.userAgent;
    // WhatsApp, Instagram, Facebook… open links in their own browser, which
    // often cannot use location at all.
    if (/FBAN|FBAV|Instagram|WhatsApp|Line\/|Snapchat|TikTok/i.test(ua)) return "inApp";
    if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
    if (/Android/i.test(ua)) return "android";
    return "desktop";
}

// Shown when the browser has blocked location: a website cannot unblock it
// by itself, so we explain exactly where the switch is on this device.
export default function LocationHelp() {
    const { t } = useLocale();
    const [open, setOpen] = useState(false);
    const [device, setDevice] = useState<Device>("desktop");

    useEffect(() => {
        const show = () => {
            setDevice(detectDevice());
            setOpen(true);
        };
        window.addEventListener(LOCATION_HELP_EVENT, show);
        return () => window.removeEventListener(LOCATION_HELP_EVENT, show);
    }, []);

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    const steps = t.locationHelp[device];

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[95] flex items-end justify-center bg-black/55 backdrop-blur-[2px] md:items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setOpen(false)}
                >
                    <motion.div
                        role="dialog"
                        aria-modal
                        aria-labelledby="location-help-title"
                        className="nt-safe-bottom w-full max-w-md rounded-t-[2rem] bg-bg p-6 shadow-float md:rounded-[2rem]"
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 38 }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-closed/10 text-closed">
                                <MapPinOff size={24} />
                            </span>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="grid h-10 w-10 place-items-center rounded-full bg-surface-2"
                                aria-label={t.common.close}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <h2 id="location-help-title" className="text-xl font-extrabold">
                            {t.locationHelp.title}
                        </h2>
                        <p className="mt-1.5 text-sm text-text-2">{device === "inApp" ? t.locationHelp.inAppIntro : t.locationHelp.intro}</p>

                        <ol className="mt-5 flex flex-col gap-3">
                            {steps.map((step, index) => (
                                <li key={step} className="flex gap-3 text-sm">
                                    <span className="nt-sunset grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white">
                                        {index + 1}
                                    </span>
                                    <span className="pt-0.5 font-medium">{step}</span>
                                </li>
                            ))}
                        </ol>

                        <div className="mt-6 grid gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    startGeo();
                                }}
                                className="nt-btn nt-btn-primary w-full"
                            >
                                <LocateFixed size={18} />
                                {t.locationHelp.retry}
                            </button>
                            <button type="button" onClick={() => setOpen(false)} className="nt-btn nt-btn-soft w-full">
                                {t.locationHelp.later}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
