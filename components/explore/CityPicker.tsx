"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { CITIES } from "@/lib/cities";
import { fill } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import { useLocale } from "../site/LocaleProvider";

export function rememberCity(slug: string) {
    try {
        localStorage.setItem("nt_city", slug);
    } catch {}
}

// Switch city: every Cameroonian city NiceThings covers, busiest first.
export default function CityPicker({
    open,
    current,
    counts,
    onClose,
}: {
    open: boolean;
    current: string;
    counts: Record<string, number>;
    onClose: () => void;
}) {
    const { locale, t } = useLocale();

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    const cities = [...CITIES].filter((city) => (counts[city.slug] ?? 0) > 0).sort((a, b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0));

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-[2px] md:items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        role="dialog"
                        aria-modal
                        aria-label={t.cities.pick}
                        className="nt-safe-bottom w-full max-w-lg rounded-t-[2rem] bg-bg p-5 shadow-float md:rounded-[2rem]"
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 38 }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-extrabold">{t.cities.pick}</h2>
                            <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-surface-2" aria-label={t.common.close}>
                                <X size={18} />
                            </button>
                        </div>
                        <ul className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto pb-1">
                            {cities.map((city) => {
                                const active = city.slug === current;
                                return (
                                    <li key={city.slug}>
                                        <Link
                                            href={paths.explore(locale, city.slug)}
                                            onClick={() => {
                                                rememberCity(city.slug);
                                                onClose();
                                            }}
                                            className={`nt-pressable flex items-center justify-between gap-2 rounded-2xl border p-3 ${active ? "border-transparent nt-sunset text-white shadow-[var(--nt-glow)]" : "border-line bg-surface"}`}
                                        >
                                            <span className="min-w-0">
                                                <span className="block truncate font-display text-[0.98rem] font-bold">{city.name}</span>
                                                <span className={`text-xs ${active ? "text-white/85" : "text-muted"}`}>
                                                    {fill(t.city.placesCount, { count: counts[city.slug] ?? 0 })}
                                                </span>
                                            </span>
                                            {active && <Check size={18} />}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
