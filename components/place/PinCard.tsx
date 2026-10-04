"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MapPin } from "lucide-react";
import { formatDistance } from "@/lib/i18n/format";
import { categoryStyle, cuisineLabel, posterInk } from "@/lib/places/display";
import { paths } from "@/lib/places/paths";
import type { PlaceSummary } from "@/lib/places/types";
import { CATEGORIES, VIBES, tagLabel } from "@/lib/tags";
import { useLocale } from "../site/LocaleProvider";
import { OpenBadge, PriceLabel, Rating, SaveButton, VerifiedMark } from "./bits";

// Pin heights, picked from the slug so a card always keeps its shape and
// the columns get Pinterest's staggered rhythm. Rails use one shape.
const PHOTO_SHAPES = ["aspect-[3/4]", "aspect-[4/5]", "aspect-[2/3]", "aspect-[4/5]", "aspect-square"];
const POSTER_SHAPES = ["aspect-[4/5]", "aspect-square", "aspect-[3/4]"];
const ANGLES = [160, 172, 148, 185];

function pick<T>(list: T[], slug: string) {
    let hash = 0;
    for (const char of slug) hash = (hash * 33 + char.charCodeAt(0)) | 0;
    return list[Math.abs(hash) % list.length];
}

// What kind of place it is, in a few words: "Grillades", "Bar & lounge".
export function placeKind(place: PlaceSummary, locale: "fr" | "en") {
    return (place.category === "Restaurant" && cuisineLabel(place.cuisine, locale, 1)) || tagLabel(CATEGORIES, place.category, locale);
}

// A place as a pin: the photo when there is one, otherwise a typeset poster
// in the category's printed colour, never an empty grey box.
export default function PinCard({
    place,
    distance = null,
    priority = false,
    shape = "auto",
}: {
    place: PlaceSummary;
    distance?: number | null;
    priority?: boolean;
    shape?: "auto" | "portrait";
}) {
    const { locale } = useLocale();
    const [broken, setBroken] = useState(false);
    const Icon = categoryStyle(place.category).icon;
    const kind = placeKind(place, locale);
    const mood = place.vibes[0] ? tagLabel(VIBES, place.vibes[0], locale) : null;
    const photo = place.cover && !broken;
    const aspect = shape === "portrait" ? "aspect-[4/5]" : photo ? pick(PHOTO_SHAPES, place.slug) : pick(POSTER_SHAPES, place.slug);
    // Under a photo: what it is, its mood, where. A poster already says the
    // kind and the area, so only the mood is added.
    const away = distance !== null && !photo ? formatDistance(distance, locale) : null;
    const context = (photo ? [kind, mood, place.neighborhood] : [away, mood]).filter(Boolean).join(" · ");
    const long = place.name.length > 30 ? "text-[1.2rem]" : place.name.length > 16 ? "text-[1.45rem]" : "text-[1.75rem]";

    return (
        <Link href={paths.place(locale, place.slug)} className="group nt-pressable block">
            <div className={`relative overflow-hidden rounded-[1.1rem] bg-surface-2 ${aspect}`}>
                {photo ? (
                    <>
                        <Image
                            src={place.cover!}
                            alt={place.name}
                            fill
                            sizes="(min-width: 1024px) 280px, (min-width: 768px) 30vw, 66vw"
                            className="object-cover transition duration-700 ease-out group-hover:scale-[1.03]"
                            priority={priority}
                            onError={() => setBroken(true)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                    </>
                ) : (
                    <div
                        className="nt-poster absolute inset-0 flex flex-col justify-between p-4"
                        style={{ "--poster": `linear-gradient(${pick(ANGLES, place.slug)}deg, color-mix(in oklab, ${posterInk(place.slug)} 86%, #f6efe4) 0%, ${posterInk(place.slug)} 70%)` } as React.CSSProperties}
                    >
                        <span className="flex items-center gap-1.5 pr-10 text-[0.64rem] font-semibold tracking-[0.14em] text-[#f6efe4]/70 uppercase">
                            <Icon size={13} strokeWidth={1.8} className="shrink-0" />
                            <span className="truncate">{kind}</span>
                        </span>
                        <span className="relative">
                            <span className={`nt-serif line-clamp-4 block [overflow-wrap:anywhere] ${long}`}>{place.name}</span>
                            {place.neighborhood && (
                                <span className="mt-2 flex items-center gap-1 text-[0.72rem] font-medium text-[#f6efe4]/70">
                                    <MapPin size={11} />
                                    <span className="truncate">{place.neighborhood}</span>
                                </span>
                            )}
                        </span>
                    </div>
                )}
                <SaveButton slug={place.slug} className="absolute top-2.5 right-2.5 h-9 w-9" />
                {photo && distance !== null && (
                    <span className="absolute bottom-2.5 left-2.5 rounded-full bg-black/45 px-2.5 py-1 text-[0.68rem] font-semibold text-white backdrop-blur-md">
                        {formatDistance(distance, locale)}
                    </span>
                )}
            </div>
            <div className="px-0.5 pt-2.5">
                {photo && (
                    <div className="flex items-center gap-1.5">
                        <h3 className="min-w-0 truncate text-[0.95rem] font-semibold tracking-[-0.01em] text-text">{place.name}</h3>
                        <VerifiedMark verified={place.verified} />
                    </div>
                )}
                {(context || (!photo && place.verified) || place.reviewCount > 0) && (
                    <p className="flex items-center gap-1.5 text-[0.8rem] text-muted">
                        {!photo && <VerifiedMark verified={place.verified} />}
                        <span className="truncate">{context}</span>
                        <span className="ml-auto">
                            <Rating rating={place.rating} count={place.reviewCount} />
                        </span>
                    </p>
                )}
                <div className="flex min-h-[1.15rem] items-center gap-2 text-[0.78rem] empty:hidden">
                    <OpenBadge hours={place.hours} compact />
                    <PriceLabel min={place.priceMin} max={place.priceMax} className="truncate !font-semibold" />
                </div>
            </div>
        </Link>
    );
}
