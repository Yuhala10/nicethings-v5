"use client";

import Link from "next/link";
import { ArrowRight, Navigation, Share2, X } from "lucide-react";
import { fill } from "@/lib/i18n";
import { formatDistance } from "@/lib/i18n/format";
import { paths } from "@/lib/places/paths";
import type { PlaceSummary } from "@/lib/places/types";
import { CATEGORIES, tagLabel } from "@/lib/tags";
import { OpenBadge, PlaceThumb, PriceLabel, Rating, SaveButton } from "../place/bits";
import { useLocale } from "../site/LocaleProvider";

export async function sharePlace(title: string, url: string, text: string) {
    try {
        if (navigator.share) {
            await navigator.share({ title, text, url });
            return "shared" as const;
        }
        await navigator.clipboard.writeText(url);
        return "copied" as const;
    } catch {
        return "failed" as const;
    }
}

// Preview shown in the sheet when a pin is tapped: enough to decide, with
// the three actions that matter one tap away.
export default function SelectedCard({
    place,
    distance,
    onClose,
    onCopied,
}: {
    place: PlaceSummary;
    distance: number | null;
    onClose: () => void;
    onCopied: () => void;
}) {
    const { locale, t } = useLocale();

    return (
        <div className="nt-card overflow-hidden">
            <div className="relative">
                <PlaceThumb
                    cover={place.cover}
                    category={place.category}
                    name={place.name}
                    sizes="420px"
                    className="h-32 w-full"
                    priority
                />
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-3 left-3 grid h-9 w-9 place-items-center rounded-full bg-surface/90 shadow-card backdrop-blur"
                    aria-label={t.common.close}
                >
                    <X size={17} />
                </button>
                <SaveButton slug={place.slug} className="absolute top-3 right-3" />
            </div>
            <div className="p-4">
                <div className="mb-1 flex items-start justify-between gap-2">
                    <h2 className="font-display text-lg leading-tight font-extrabold">{place.name}</h2>
                    <Rating rating={place.rating} count={place.reviewCount} />
                </div>
                <p className="mb-2 text-[0.82rem] text-muted">
                    {tagLabel(CATEGORIES, place.category, locale)}
                    {place.neighborhood ? ` · ${place.neighborhood}` : ""}
                    {distance !== null ? ` · ${fill(t.spot.away, { distance: formatDistance(distance, locale) })}` : ""}
                </p>
                <div className="mb-4 flex items-center justify-between text-sm">
                    <PriceLabel min={place.priceMin} max={place.priceMax} />
                    <OpenBadge hours={place.hours} />
                </div>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <Link href={paths.directions(locale, place.slug)} className="nt-btn nt-btn-primary">
                        <Navigation size={17} />
                        {t.spot.directions}
                    </Link>
                    <Link href={paths.place(locale, place.slug)} className="nt-btn nt-btn-soft">
                        {t.common.seeMore}
                        <ArrowRight size={16} />
                    </Link>
                    <button
                        type="button"
                        onClick={async () => {
                            const url = `${window.location.origin}${paths.place(locale, place.slug)}`;
                            const result = await sharePlace(place.name, url, fill(t.spot.shareText, { name: place.name }));
                            if (result === "copied") onCopied();
                        }}
                        className="nt-btn nt-btn-soft w-12 px-0"
                        aria-label={t.spot.share}
                    >
                        <Share2 size={17} />
                    </button>
                </div>
            </div>
        </div>
    );
}
