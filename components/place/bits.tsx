"use client";

import Image from "next/image";
import { Heart, Star } from "lucide-react";
import { fill } from "@/lib/i18n";
import { formatPriceRange, formatTime } from "@/lib/i18n/format";
import { categoryStyle } from "@/lib/places/display";
import { getOpenState } from "@/lib/places/hours";
import type { PlaceHours } from "@/lib/places/types";
import { useNow } from "@/lib/hooks/useNow";
import { useSaved } from "@/lib/hooks/useSaved";
import { useLocale } from "../site/LocaleProvider";

export function OpenBadge({ hours, compact = false }: { hours: PlaceHours; compact?: boolean }) {
    const { locale, t } = useLocale();
    const now = useNow();
    if (!now) return <span className="inline-block h-4 w-14 rounded nt-skeleton" aria-hidden />;
    const state = getOpenState(hours, now);

    if (state.status === "unknown") {
        return compact ? null : <span className="text-xs font-medium text-muted">{t.spot.hoursUnknown}</span>;
    }

    if (state.status === "open") {
        return (
            <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold ${state.closingSoon ? "text-closing" : "text-open"}`}
            >
                <span className={state.closingSoon ? "h-2 w-2 rounded-full bg-closing" : "nt-open-dot"} />
                {state.closingSoon
                    ? `${t.spot.closesSoon} · ${formatTime(state.closes, locale)}`
                    : compact
                      ? t.spot.open
                      : `${t.spot.open} · ${fill(t.spot.closesAt, { time: formatTime(state.closes, locale) })}`}
            </span>
        );
    }

    const time = formatTime(state.opens, locale);
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-closed">
            <span className="h-2 w-2 rounded-full bg-closed/80" />
            {compact
                ? t.spot.closed
                : state.opensDay
                  ? `${t.spot.closed} · ${fill(t.spot.opensDay, { day: t.days[state.opensDay], time })}`
                  : `${t.spot.closed} · ${fill(t.spot.opensAt, { time })}`}
        </span>
    );
}

export function PriceLabel({ min, max, className = "" }: { min: number | null; max: number | null; className?: string }) {
    const { locale, t } = useLocale();
    const text = formatPriceRange(min, max, locale);
    if (!text) return <span className={`text-muted ${className}`}>{t.spot.priceUnknown}</span>;
    return <span className={`font-bold text-text ${className}`}>{text}</span>;
}

export function Rating({ rating, count }: { rating: number; count: number }) {
    if (!count) return null;
    return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-text">
            <Star size={13} className="fill-brand-500 text-brand-500" />
            {rating.toFixed(1)}
            <span className="font-medium text-muted">({count})</span>
        </span>
    );
}

export function PlaceThumb({
    cover,
    category,
    name,
    sizes,
    className = "",
    priority = false,
}: {
    cover: string | null;
    category: string;
    name: string;
    sizes: string;
    className?: string;
    priority?: boolean;
}) {
    const style = categoryStyle(category);

    if (!cover) {
        return (
            <div
                className={`relative grid place-items-center overflow-hidden ${className}`}
                style={{ background: `linear-gradient(135deg, ${style.from}, ${style.to})` }}
                aria-hidden
            >
                <span className="text-[2rem] drop-shadow-sm">{style.emoji}</span>
                <span className="absolute -right-3 -bottom-4 text-[4.5rem] opacity-15">{style.emoji}</span>
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
            <Image src={cover} alt={name} fill sizes={sizes} className="object-cover" priority={priority} />
        </div>
    );
}

export function SaveButton({ slug, className = "" }: { slug: string; className?: string }) {
    const { t } = useLocale();
    const { isSaved, toggle } = useSaved();
    const saved = isSaved(slug);

    return (
        <button
            type="button"
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggle(slug);
            }}
            aria-pressed={saved}
            aria-label={saved ? t.spot.saved : t.spot.save}
            className={`grid h-10 w-10 place-items-center rounded-full bg-surface/90 shadow-card backdrop-blur transition active:scale-90 ${className}`}
        >
            <Heart
                size={19}
                className={`transition ${saved ? "scale-110 fill-brand-500 text-brand-500" : "text-text"}`}
            />
        </button>
    );
}
