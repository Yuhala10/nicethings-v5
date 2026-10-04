"use client";

import Link from "next/link";
import { formatDistance } from "@/lib/i18n/format";
import { cuisineLabel } from "@/lib/places/display";
import { paths } from "@/lib/places/paths";
import type { PlaceSummary } from "@/lib/places/types";
import { CATEGORIES, tagLabel } from "@/lib/tags";
import { useLocale } from "../site/LocaleProvider";
import { OpenBadge, PlaceThumb, PriceLabel, Rating, SaveButton, VerifiedMark } from "./bits";

// Picture-first card for horizontal rails and guide grids.
export default function PlaceCard({
    place,
    distance = null,
    className = "w-[15rem] shrink-0",
    priority = false,
    showArea = true,
}: {
    place: PlaceSummary;
    distance?: number | null;
    className?: string;
    priority?: boolean;
    showArea?: boolean;
}) {
    const { locale } = useLocale();
    const meta = [
        (place.category === "Restaurant" && cuisineLabel(place.cuisine, locale)) ||
            tagLabel(CATEGORIES, place.category, locale),
        showArea ? place.neighborhood : null,
        distance !== null ? formatDistance(distance, locale) : null,
    ].filter(Boolean);

    return (
        <Link
            href={paths.place(locale, place.slug)}
            className={`group nt-pressable block rounded-[1.25rem] ${className}`}
        >
            <div className="relative">
                <PlaceThumb
                    cover={place.cover}
                    category={place.category}
                    name={place.name}
                    sizes="(min-width: 768px) 280px, 240px"
                    className="aspect-[4/3] w-full rounded-[1.1rem]"
                    priority={priority}
                    iconSize={30}
                />
                <SaveButton slug={place.slug} className="absolute top-2.5 right-2.5 h-9 w-9" />
            </div>
            <div className="px-0.5 pt-2.5">
                <div className="flex items-center gap-1.5">
                    <h3 className="min-w-0 truncate text-[0.95rem] font-semibold tracking-[-0.01em] text-text">{place.name}</h3>
                    <VerifiedMark verified={place.verified} />
                    <span className="ml-auto">
                        <Rating rating={place.rating} count={place.reviewCount} />
                    </span>
                </div>
                <p className="truncate text-[0.8rem] text-muted">{meta.join(" · ")}</p>
                <div className="mt-0.5 flex min-h-[1.1rem] items-center gap-2 text-[0.8rem]">
                    <PriceLabel min={place.priceMin} max={place.priceMax} className="truncate" />
                    <OpenBadge hours={place.hours} compact />
                </div>
            </div>
        </Link>
    );
}

export function PlaceCardSkeleton({ className = "w-[15rem] shrink-0" }: { className?: string }) {
    return (
        <div className={className} aria-hidden>
            <div className="nt-skeleton aspect-[4/3] w-full rounded-[1.25rem]" />
            <div className="nt-skeleton mt-3 h-4 w-3/4 rounded" />
            <div className="nt-skeleton mt-2 h-3 w-1/2 rounded" />
        </div>
    );
}
