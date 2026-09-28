"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { City } from "@/lib/cities";
import { fill } from "@/lib/i18n";
import type { LocateStatus } from "@/lib/hooks/useOrigin";
import { useLocale } from "../site/LocaleProvider";

// Says what happened after "use my location": another city, no signal.
// (A blocked permission opens the step-by-step help instead.)
export default function LocationNotice({
    status,
    city,
    gpsCity,
    href,
    onChooseArea,
    className = "",
}: {
    status: LocateStatus;
    city: City;
    gpsCity: City | null;
    href: (slug: string) => string;
    onChooseArea: () => void;
    className?: string;
}) {
    const { t } = useLocale();
    const [hidden, setHidden] = useState<string | null>(null);
    const kind = status === "outside" && gpsCity && gpsCity.slug !== city.slug ? "outside" : status === "unavailable" ? "unavailable" : null;
    const show = kind !== null && hidden !== kind;

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    role="status"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`flex items-start gap-3 rounded-2xl bg-ink p-3 pl-4 text-sm font-medium text-white shadow-float ${className}`}
                >
                    <p className="flex-1">
                        {kind === "outside" && gpsCity ? (
                            <>
                                {fill(t.cities.youreIn, { city: gpsCity.name })}{" "}
                                <Link href={href(gpsCity.slug)} className="font-bold text-brand-400 underline">
                                    {fill(t.cities.see, { city: gpsCity.name })}
                                </Link>
                            </>
                        ) : (
                            <>
                                {t.location.unavailable}{" "}
                                <button type="button" className="font-bold text-brand-400 underline" onClick={onChooseArea}>
                                    {t.location.chooseArea}
                                </button>
                            </>
                        )}
                    </p>
                    <button
                        type="button"
                        onClick={() => setHidden(kind)}
                        className="-m-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10"
                        aria-label={t.common.close}
                    >
                        <X size={16} />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
