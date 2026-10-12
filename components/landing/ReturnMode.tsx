"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Plane, X } from "lucide-react";
import { paths } from "@/lib/places/paths";
import { returnModeOn, setReturnMode, watchReturnMode } from "@/lib/return-mode";
import { useLocale } from "../site/LocaleProvider";

// The home page for someone back in the country (lib/return-mode.ts). With
// the mode on, the page opens on four doors made for them: the first
// evening's table, seeing everyone again, a weekend on the coast, the country
// to see again. Without it, a phone that keeps another continent's time is
// probably being read from abroad: those visitors are shown the way in. The
// time zone is read on the phone itself and sent nowhere.
export default function ReturnMode() {
    const { locale, t } = useLocale();
    const [on, setOn] = useState(false);
    const [far, setFar] = useState(false);

    useEffect(() => {
        const read = () => setOn(returnModeOn());
        read();
        try {
            const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            setFar(Boolean(zone) && !zone.startsWith("Africa/"));
        } catch {
            // A browser that does not say: the invitation simply stays away.
        }
        return watchReturnMode(read);
    }, []);

    if (on) {
        const home = paths.homecoming(locale);
        const doors = [
            { href: `${home}#premier-soir`, label: t.homecoming.firstEyebrow, title: t.homecoming.firstTitle },
            { href: `${home}#ensemble`, label: t.homecoming.togetherEyebrow, title: t.homecoming.togetherTitle },
            { href: `${home}#kribi`, label: t.homecoming.coastEyebrow, title: t.homecoming.coastTitle },
            { href: `${home}#pays`, label: t.homecoming.countryEyebrow, title: t.homecoming.countryTitle },
        ];
        return (
            <section className="mx-auto max-w-6xl px-4 pt-6 md:px-6" aria-label={t.homecoming.modeOn}>
                <div className="rounded-[1.6rem] bg-[#15110e] p-5 text-white md:p-8">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="flex items-center gap-2 text-[0.75rem] font-semibold tracking-[0.16em] text-white/60 uppercase">
                                <Plane size={14} />
                                {t.homecoming.modeOn}
                            </p>
                            <p className="nt-serif mt-2 text-[2.25rem] leading-[1.05]">{t.homecoming.title}</p>
                        </div>
                        <button type="button" onClick={() => setReturnMode(false)} aria-label={t.homecoming.modeLeave} className="nt-tap grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 transition hover:bg-white/15">
                            <X size={18} />
                        </button>
                    </div>
                    <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {doors.map((door) => (
                            <li key={door.href}>
                                <Link href={door.href} className="nt-pressable group flex h-full min-h-[5.5rem] flex-col justify-between gap-3 rounded-[1.1rem] bg-white/8 p-4 transition hover:bg-white/12">
                                    <span className="text-[0.75rem] font-semibold tracking-[0.12em] text-white/60 uppercase">{door.label}</span>
                                    <span className="flex items-end justify-between gap-3 text-[1rem] leading-snug font-semibold">
                                        {door.title}
                                        <ArrowRight size={16} className="mb-0.5 shrink-0 text-white/60 transition-transform duration-200 group-hover:translate-x-0.5" />
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>
        );
    }

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
