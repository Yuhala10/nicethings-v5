"use client";

import Link from "next/link";
import { formatDistance } from "@/lib/i18n/format";
import { paths } from "@/lib/places/paths";
import type { PlaceSummary } from "@/lib/places/types";
import { CATEGORIES, tagLabel } from "@/lib/tags";
import { OpenBadge, PlaceThumb, PriceLabel, Rating, VerifiedMark } from "../place/bits";
import { useLocale } from "../site/LocaleProvider";

export default function PlaceRow({
    place,
    distance,
    onFocus,
    active = false,
}: {
    place: PlaceSummary;
    distance: number | null;
    onFocus?: (id: string) => void;
    active?: boolean;
}) {
    const { locale } = useLocale();
    const category = tagLabel(CATEGORIES, place.category, locale);
    const meta = [category, place.neighborhood, distance !== null ? formatDistance(distance, locale) : null].filter(Boolean);

    return (
        <Link
            href={paths.place(locale, place.slug)}
            onMouseEnter={() => onFocus?.(place.id)}
            className={`group flex items-center gap-3.5 rounded-2xl p-2.5 transition hover:bg-surface-2 active:scale-[0.99] ${active ? "bg-surface-2" : ""}`}
        >
            <PlaceThumb
                cover={place.cover}
                category={place.category}
                name={place.name}
                sizes="72px"
                className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-2xl"
                iconSize={22}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                    <h3 className="min-w-0 truncate font-display text-[0.97rem] font-bold text-text">{place.name}</h3>
                    <VerifiedMark verified={place.verified} />
                    <span className="ml-auto">
                        <Rating rating={place.rating} count={place.reviewCount} />
                    </span>
                </div>
                <p className="truncate text-[0.8rem] text-muted">{meta.join(" · ")}</p>
                <div className="flex items-center gap-2 text-[0.8rem] empty:hidden">
                    <PriceLabel min={place.priceMin} max={place.priceMax} className="truncate" />
                    <OpenBadge hours={place.hours} compact />
                </div>
            </div>
        </Link>
    );
}
