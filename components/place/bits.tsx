"use client";

import Image from "next/image";
import { useState } from "react";
import { BadgeCheck, Heart, Star } from "lucide-react";
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
    const known = Boolean(hours.opens && hours.closes && hours.days.length);
    if (!known) {
        return compact ? null : <span className="text-xs font-medium text-muted">{t.spot.hoursUnknown}</span>;
    }
    // Time only exists on the client: reserve the space instead of guessing.
    if (!now) return <span className="nt-skeleton inline-block h-4 w-14 rounded" aria-hidden />;
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

// Prices are only shown when known; `showUnknown` is for the place page,
// where saying "to be confirmed" is useful rather than noise.
export function PriceLabel({
    min,
    max,
    className = "",
    showUnknown = false,
}: {
    min: number | null;
    max: number | null;
    className?: string;
    showUnknown?: boolean;
}) {
    const { locale, t } = useLocale();
    const text = formatPriceRange(min, max, locale);
    if (!text) return showUnknown ? <span className={`text-muted ${className}`}>{t.spot.priceUnknown}</span> : null;
    return <span className={`font-bold text-text ${className}`}>{text}</span>;
}

export function Rating({ rating, count }: { rating: number; count: number }) {
    if (!count) return null;
    return (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-text">
            <Star size={13} className="fill-brand-500 text-brand-500" />
            {rating.toFixed(1)}
            <span className="font-medium text-muted">({count})</span>
        </span>
    );
}

export function VerifiedMark({ verified, className = "" }: { verified: boolean; className?: string }) {
    const { t } = useLocale();
    if (!verified) return null;
    return (
        <BadgeCheck
            size={16}
            className={`shrink-0 fill-brand-500 text-surface ${className}`}
            aria-label={t.trust.verifiedTitle}
        />
    );
}

// The place's picture, or — for the many places without one yet — a calm
// tinted panel with the category's line icon. Broken image URLs fall back
// to the same panel instead of an empty box.
export function PlaceThumb({
    cover,
    category,
    name,
    sizes,
    className = "",
    priority = false,
    iconSize = 26,
}: {
    cover: string | null;
    category: string;
    name: string;
    sizes: string;
    className?: string;
    priority?: boolean;
    iconSize?: number;
}) {
    const style = categoryStyle(category);
    const [broken, setBroken] = useState(false);
    const Icon = style.icon;

    if (!cover || broken) {
        return (
            <div
                className={`nt-art relative grid place-items-center overflow-hidden ${className}`}
                style={{ "--tone": style.tone } as React.CSSProperties}
                aria-hidden
            >
                <Icon size={iconSize} strokeWidth={1.6} className="relative" />
                <Icon
                    size={iconSize * 3.4}
                    strokeWidth={1}
                    className="absolute -right-[12%] -bottom-[18%] opacity-[0.09]"
                />
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
            <Image
                src={cover}
                alt={name}
                fill
                sizes={sizes}
                className="object-cover"
                priority={priority}
                onError={() => setBroken(true)}
            />
        </div>
    );
}

export function SaveButton({ slug, className = "", onToggle }: { slug: string; className?: string; onToggle?: (saved: boolean) => void }) {
    const { t } = useLocale();
    const { isSaved, toggle } = useSaved();
    const saved = isSaved(slug);

    return (
        <button
            type="button"
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onToggle?.(toggle(slug));
            }}
            aria-pressed={saved}
            aria-label={saved ? t.spot.saved : t.spot.save}
            className={`grid h-10 w-10 place-items-center rounded-full bg-surface shadow-card transition active:scale-90 ${className}`}
        >
            <Heart
                size={19}
                className={`transition duration-300 ${saved ? "nt-pop fill-brand-500 text-brand-500" : "text-text"}`}
            />
        </button>
    );
}
