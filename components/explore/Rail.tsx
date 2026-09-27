"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useLocale } from "../site/LocaleProvider";

// A titled, horizontally scrolling row. Marked no-drag so swiping sideways
// inside the map sheet scrolls the row instead of moving the sheet.
export default function Rail({
    title,
    subtitle,
    onSeeAll,
    children,
}: {
    title: string;
    subtitle?: string;
    onSeeAll?: () => void;
    children: ReactNode;
}) {
    const { t } = useLocale();
    return (
        <section className="pt-6 first:pt-3">
            <div className="mb-3 flex items-end justify-between gap-3 px-4">
                <div className="min-w-0">
                    <h2 className="nt-section-title truncate">{title}</h2>
                    {subtitle && <p className="truncate text-[0.8rem] text-muted">{subtitle}</p>}
                </div>
                {onSeeAll && (
                    <button
                        type="button"
                        onClick={onSeeAll}
                        className="-mr-2 inline-flex shrink-0 items-center rounded-full px-2 py-1 text-[0.82rem] font-bold text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-700/20"
                    >
                        {t.discover.seeAll}
                        <ChevronRight size={16} />
                    </button>
                )}
            </div>
            <div className="nt-scroll-x touch-pan-x gap-3 px-4 pb-1" data-no-drag>
                {children}
            </div>
        </section>
    );
}
