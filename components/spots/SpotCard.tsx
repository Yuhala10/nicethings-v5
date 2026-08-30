"use client";

import Link from "next/link";

import {
    ArrowUpRight,
    Heart,
    MapPin,
    ShieldCheck,
} from "lucide-react";

import type {
    SpotSummary,
} from "../../lib/supabase/types";

import SpotImage from "./SpotImage";
import SpotRating from "./SpotRating";

type SpotCardProps = {
    spot: SpotSummary;
    imageUrl?: string | null;
    saved?: boolean;
    distanceLabel?: string | null;

    onSave?: (
        spot: SpotSummary
    ) => void;
};

export default function SpotCard({
    spot,
    imageUrl,
    saved = false,
    distanceLabel,
    onSave,
}: SpotCardProps) {
    const href =
        spot.slug
            ? `/spots/${encodeURIComponent(
                spot.slug
            )}`
            : `/spots/${encodeURIComponent(
                spot.id
            )}`;

    const location =
        distanceLabel ||
        spot.neighborhood ||
        spot.city ||
        "Cameroon";

    return (
        <article className="nt-spot-card">
            <Link
                href={href}
                className="nt-spot-card-media"
                aria-label={`View ${spot.name}`}
            >
                <SpotImage
                    src={imageUrl}
                    alt={spot.name}
                />

                <div className="nt-spot-card-gradient" />

                {spot.verified && (
                    <span className="nt-spot-verified">
                        <ShieldCheck
                            size={12}
                            strokeWidth={2.5}
                        />

                        Verified
                    </span>
                )}

                <span className="nt-spot-open">
                    <ArrowUpRight
                        size={17}
                        strokeWidth={2.2}
                    />
                </span>
            </Link>

            <div className="nt-spot-card-body">
                <div className="nt-spot-card-heading">
                    <div className="nt-spot-card-title-wrap">
                        <Link
                            href={href}
                            className="nt-spot-card-name"
                        >
                            {spot.name}
                        </Link>

                        <div className="nt-spot-card-category">
                            {spot.category || "Place"}

                            {spot.cuisine && (
                                <>
                                    <span> · </span>
                                    {spot.cuisine}
                                </>
                            )}
                        </div>
                    </div>

                    {onSave && (
                        <button
                            type="button"
                            className={[
                                "nt-spot-save",
                                saved
                                    ? "saved"
                                    : "",
                            ].join(" ")}
                            aria-label={
                                saved
                                    ? `Remove ${spot.name} from saved places`
                                    : `Save ${spot.name}`
                            }
                            aria-pressed={saved}
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();

                                onSave(spot);
                            }}
                        >
                            <Heart
                                size={17}
                                fill={
                                    saved
                                        ? "currentColor"
                                        : "none"
                                }
                            />
                        </button>
                    )}
                </div>

                <div className="nt-spot-card-meta">
                    <SpotRating
                        rating={spot.rating}
                        reviewCount={
                            spot.review_count
                        }
                        compact
                    />

                    <span className="nt-spot-meta-dot">
                        ·
                    </span>

                    <span className="nt-spot-location">
                        <MapPin
                            size={12}
                            strokeWidth={2}
                        />

                        {location}
                    </span>
                </div>

                {formatPrice(
                    spot.minimum_price,
                    spot.maximum_price,
                    spot.currency
                ) && (
                        <div className="nt-spot-price">
                            {formatPrice(
                                spot.minimum_price,
                                spot.maximum_price,
                                spot.currency
                            )}
                        </div>
                    )}
            </div>
        </article>
    );
}

function formatPrice(
    minimum?: number | null,
    maximum?: number | null,
    currency?: string | null
) {
    const low =
        typeof minimum === "number"
            ? minimum
            : null;

    const high =
        typeof maximum === "number"
            ? maximum
            : null;

    if (low === null && high === null) {
        return null;
    }

    const formatter =
        new Intl.NumberFormat(
            "fr-FR"
        );

    const money =
        currency || "XAF";

    if (
        low !== null &&
        high !== null &&
        low !== high
    ) {
        return `${formatter.format(
            low
        )} – ${formatter.format(
            high
        )} ${money}`;
    }

    const value =
        low ?? high;

    if (value === null) {
        return null;
    }

    return `From ${formatter.format(
        value
    )} ${money}`;
}