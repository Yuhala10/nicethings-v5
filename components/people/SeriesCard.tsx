"use client";

import { fill } from "@/lib/i18n";
import type { Series } from "@/lib/people/types";
import { useLocale } from "../site/LocaleProvider";

// La série on one's own page: how many weeks in a row, whether this week
// is done, what keeps it going. Seven little flames for the last weeks.

export default function SeriesCard({ series }: { series: Series | null }) {
    const { t } = useLocale();
    const words = t.people.series;
    if (!series) return null;
    const lit = Math.min(7, series.weeks);
    return (
        <section className="mt-6 overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-[#2a1306] to-[#15110e] p-5 text-white">
            <div className="flex items-center gap-4">
                <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-[2rem] ${series.weeks ? "bg-[#e8590c]/25" : "bg-white/10 grayscale"}`} aria-hidden>
                    🔥
                </span>
                <div className="min-w-0">
                    <p className="text-[0.75rem] font-semibold tracking-[0.14em] text-white/55 uppercase">{words.title}</p>
                    <p className="nt-serif text-[1.9rem] leading-none">{fill(words.weeks, { count: series.weeks })}</p>
                    {series.best > series.weeks && <p className="mt-1 text-[0.75rem] text-white/55">{fill(words.best, { count: series.best })}</p>}
                </div>
            </div>
            <div className="mt-4 flex gap-1.5" aria-hidden>
                {Array.from({ length: 7 }, (_, index) => (
                    <span key={index} className={`h-2 flex-1 rounded-full ${index < lit ? "bg-gradient-to-r from-[#ec8a3f] to-[#d9572b]" : "bg-white/10"}`} />
                ))}
            </div>
            <p className={`mt-4 text-[0.9rem] font-semibold ${series.thisWeek ? "text-[#8fd8a8]" : "text-[#ffb27a]"}`}>{series.weeks === 0 ? words.start : series.thisWeek ? words.kept : words.keep}</p>
            <p className="mt-2 text-[0.75rem] leading-relaxed text-white/55">{words.lead}</p>
        </section>
    );
}
