"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MapPin } from "lucide-react";
import { formatDistance } from "@/lib/i18n/format";
import { categoryStyle, cuisineLabel } from "@/lib/places/display";
import { paths } from "@/lib/places/paths";
import type { PlaceSummary } from "@/lib/places/types";
import { CATEGORIES, tagLabel } from "@/lib/tags";
import { useLocale } from "../site/LocaleProvider";
import { OpenBadge, PriceLabel, Rating, SaveButton, VerifiedMark } from "./bits";

// Pin heights, picked from the slug so a card always keeps its shape and
// the columns get Pinterest's staggered rhythm.
const PHOTO_SHAPES = ["aspect-[3/4]", "aspect-[4/5]", "aspect-[2/3]", "aspect-[4/5]", "aspect-square"];
const POSTER_SHAPES = ["aspect-[4/5]", "aspect-square", "aspect-[3/4]"];
// The second colour of a poster: varied like a Pinterest board, always warm
// enough to sit with the brand.
const ACCENTS = ["#eb3a6f", "#7c3aed", "#0f766e", "#b45309", "#be123c", "#1d4ed8", "#9333ea", "#c2410c"];

function pick<T>(list: T[], slug: string) {
    let hash = 0;
    for (const char of slug) hash = (hash * 33 + char.charCodeAt(0)) | 0;
    return list[Math.abs(hash) % list.length];
}

// A place as a pin: the photo when there is one, otherwise a typeset
// poster in the category's colour, never an empty grey box.
export default function PinCard({ place, distance = null, priority = false }: { place: PlaceSummary; distance?: number | null; priority?: boolean }) {
    const { locale } = useLocale();
    const [broken, setBroken] = useState(false);
    const style = categoryStyle(place.category);
    const Icon = style.icon;
    const kind = (place.category === "Restaurant" && cuisineLabel(place.cuisine, locale)) || tagLabel(CATEGORIES, place.category, locale);
    const photo = place.cover && !broken;

    return (
        <Link href={paths.place(locale, place.slug)} className="group nt-pressable block">
            <div className={`relative overflow-hidden rounded-[1.6rem] ${photo ? pick(PHOTO_SHAPES, place.slug) : pick(POSTER_SHAPES, place.slug)}`}>
                {photo ? (
                    <>
                        <Image
                            src={place.cover!}
                            alt={place.name}
                            fill
                            sizes="(min-width: 1024px) 280px, (min-width: 768px) 33vw, 50vw"
                            className="object-cover transition duration-700 group-hover:scale-[1.04]"
                            priority={priority}
                            onError={() => setBroken(true)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10 opacity-70 transition group-hover:opacity-100" />
                    </>
                ) : (
                    <div
                        className="absolute inset-0 flex flex-col justify-between p-4 text-white"
                        style={{ background: `linear-gradient(${pick([150, 165, 135, 180], place.slug)}deg, ${style.tone} 10%, ${pick(ACCENTS, place.slug + "x")} 120%)` }}
                    >
                        <Icon size={150} strokeWidth={0.9} className="pointer-events-none absolute -right-8 -bottom-8 opacity-[0.16]" />
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm">
                            <Icon size={20} />
                        </span>
                        <span className="relative">
                            <span className="block font-display text-[1.25rem] leading-[1.08] font-extrabold tracking-tight [overflow-wrap:anywhere]">{place.name}</span>
                            {place.neighborhood && (
                                <span className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-white/80">
                                    <MapPin size={12} />
                                    {place.neighborhood}
                                </span>
                            )}
                        </span>
                    </div>
                )}
                <SaveButton slug={place.slug} className="absolute top-2.5 right-2.5 h-9 w-9 opacity-95" />
                {photo && distance !== null && (
                    <span className="absolute bottom-2.5 left-2.5 rounded-full bg-black/45 px-2.5 py-1 text-[0.7rem] font-bold text-white backdrop-blur-md">{formatDistance(distance, locale)}</span>
                )}
            </div>
            <div className="px-1 pt-2.5">
                {photo && (
                    <div className="flex items-center gap-1.5">
                        <h3 className="min-w-0 truncate font-display text-[0.95rem] font-bold text-text">{place.name}</h3>
                        <VerifiedMark verified={place.verified} />
                    </div>
                )}
                <p className="flex items-center gap-1.5 truncate text-[0.8rem] text-muted">
                    {!photo && <VerifiedMark verified={place.verified} />}
                    <span className="truncate">{[kind, photo ? place.neighborhood : null].filter(Boolean).join(" · ")}</span>
                    <span className="ml-auto">
                        <Rating rating={place.rating} count={place.reviewCount} />
                    </span>
                </p>
                <div className="flex min-h-[1.1rem] items-center gap-2 text-[0.8rem]">
                    <PriceLabel min={place.priceMin} max={place.priceMax} className="truncate" />
                    <OpenBadge hours={place.hours} compact />
                </div>
            </div>
        </Link>
    );
}
