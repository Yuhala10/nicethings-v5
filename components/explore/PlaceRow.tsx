"use client";

import Link from "next/link";
import { formatDistance } from "@/lib/i18n/format";
import { categoryStyle } from "@/lib/places/display";
import { paths } from "@/lib/places/paths";
import type { PlaceSummary } from "@/lib/places/types";
import { CATEGORIES, tagLabel } from "@/lib/tags";
import { OpenBadge, PlaceThumb, PriceLabel, Rating, SaveButton } from "../place/bits";
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

    return (
        <Link
            href={paths.place(locale, place.slug)}
            onMouseEnter={() => onFocus?.(place.id)}
            className={`group flex gap-3.5 rounded-2xl p-2.5 transition hover:bg-surface-2 active:scale-[0.99] ${active ? "bg-surface-2" : ""}`}
        >
            <PlaceThumb
                cover={place.cover}
                category={place.category}
                name={place.name}
                sizes="96px"
                className="h-[5.5rem] w-[5.5rem] shrink-0 rounded-2xl"
            />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate font-display text-[0.98rem] font-bold text-text">{place.name}</h3>
                    <Rating rating={place.rating} count={place.reviewCount} />
                </div>
                <p className="truncate text-[0.8rem] text-muted">
                    {categoryStyle(place.category).emoji} {category}
                    {place.neighborhood ? ` · ${place.neighborhood}` : ""}
                    {distance !== null ? ` · ${formatDistance(distance, locale)}` : ""}
                </p>
                <div className="flex items-center justify-between gap-2 text-[0.8rem]">
                    <PriceLabel min={place.priceMin} max={place.priceMax} className="truncate" />
                    <OpenBadge hours={place.hours} compact />
                </div>
            </div>
        </Link>
    );
}

export function PlaceRowSkeleton() {
    return (
        <div className="flex gap-3.5 p-2.5" aria-hidden>
            <div className="nt-skeleton h-[5.5rem] w-[5.5rem] rounded-2xl" />
            <div className="flex flex-1 flex-col justify-center gap-2">
                <div className="nt-skeleton h-4 w-3/5 rounded" />
                <div className="nt-skeleton h-3 w-4/5 rounded" />
                <div className="nt-skeleton h-3 w-2/5 rounded" />
            </div>
        </div>
    );
}

export function SaveOverlay({ slug }: { slug: string }) {
    return <SaveButton slug={slug} className="absolute top-3 right-3" />;
}
