"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Plane } from "lucide-react";
import { paths } from "@/lib/places/paths";
import { useLocale } from "../site/LocaleProvider";

// A phone that keeps another continent's time is probably being read from
// abroad: those visitors are shown the way to "De retour au pays". The time
// zone is read on the phone itself and sent nowhere.
export default function FromAfar() {
    const { locale, t } = useLocale();
    const [far, setFar] = useState(false);

    useEffect(() => {
        try {
            const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            setFar(Boolean(zone) && !zone.startsWith("Africa/"));
        } catch {
            // A browser that does not say: the line simply stays away.
        }
    }, []);

    if (!far) return null;
    return (
        <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
            <Link href={paths.homecoming(locale)} className="nt-pressable group flex min-h-14 items-center gap-3 rounded-[1.25rem] bg-surface-2 px-4 py-3">
                <Plane size={18} className="shrink-0 text-brand-600" />
                <span className="min-w-0 flex-1 text-[1rem]">
                    <span className="font-semibold">{t.homecoming.afarTitle}</span> <span className="text-text-2">{t.homecoming.afarBody}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
        </div>
    );
}
