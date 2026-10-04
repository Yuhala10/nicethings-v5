"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useLocale } from "../site/LocaleProvider";

// A titled, horizontally scrolling row. Sideways swipes scroll the row;
// up/down swipes that start on a card still scroll the page.
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
        <section className="pt-10 first:pt-5">
            <div className="mb-4 flex items-end justify-between gap-3 px-4">
                <div className="min-w-0">
                    <h2 className="nt-section-title truncate">{title}</h2>
                    {subtitle && <p className="truncate text-[0.8rem] text-muted">{subtitle}</p>}
                </div>
                {onSeeAll && (
                    <button
                        type="button"
                        onClick={onSeeAll}
                        className="-mr-1 inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-[0.85rem] font-semibold text-text transition hover:bg-surface-2"
                    >
                        {t.discover.seeAll}
                        <ChevronRight size={16} />
                    </button>
                )}
            </div>
            <div className="md:px-4">
                <div className="nt-rail">{children}</div>
            </div>
        </section>
    );
}
