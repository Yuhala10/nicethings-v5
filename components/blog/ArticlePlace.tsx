"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin, Navigation } from "lucide-react";
import { cityBySlug } from "@/lib/cities";
import { cuisineLabel } from "@/lib/places/display";
import { paths } from "@/lib/places/paths";
import type { PlaceSummary } from "@/lib/places/types";
import { CATEGORIES, tagLabel } from "@/lib/tags";
import { OpenBadge, PlaceThumb, PriceLabel, Rating, SaveButton, VerifiedMark } from "../place/bits";
import { useLocale } from "../site/LocaleProvider";
import Inline from "./Inline";

// A place inside an article: picture, live facts (open now, prices), the
// writer's note, and the two actions that matter.
export default function ArticlePlace({ place, note, number }: { place: PlaceSummary; note: string; number?: number }) {
    const { locale, t } = useLocale();
    const kind = (place.category === "Restaurant" && cuisineLabel(place.cuisine, locale)) || tagLabel(CATEGORIES, place.category, locale);
    const area = [place.neighborhood, cityBySlug(place.city)?.name].filter(Boolean).join(", ");

    return (
        <article id={`lieu-${place.slug}`} className="my-8 scroll-mt-24 overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-card">
            <Link href={paths.place(locale, place.slug)} className="group relative block">
                <PlaceThumb
                    cover={place.cover}
                    category={place.category}
                    name={place.name}
                    sizes="(min-width: 768px) 672px, 100vw"
                    className="aspect-[16/10] w-full transition duration-500 group-hover:scale-[1.02]"
                    iconSize={40}
                />
                {number !== undefined && (
                    <span className="nt-sunset absolute top-3 left-3 grid h-9 min-w-9 place-items-center rounded-full px-2 font-display text-sm font-extrabold text-white shadow-lg">
                        {number}
                    </span>
                )}
                <SaveButton slug={place.slug} className="absolute top-3 right-3" />
            </Link>
            <div className="p-5">
                <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold tracking-wide text-brand-600 uppercase">{kind}</p>
                        <h3 className="nt-serif mt-1 flex min-w-0 items-center gap-1.5 text-[1.75rem] leading-tight">
                            <Link href={paths.place(locale, place.slug)} title={place.name} className="min-w-0 truncate hover:text-brand-600">
                                {place.name}
                            </Link>
                            <VerifiedMark verified={place.verified} />
                        </h3>
                        <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                            <MapPin size={14} className="shrink-0" />
                            <span className="truncate">{area}</span>
                        </p>
                    </div>
                    <Rating rating={place.rating} count={place.reviewCount} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <PriceLabel min={place.priceMin} max={place.priceMax} />
                    <OpenBadge hours={place.hours} compact />
                </div>
                {note && (
                    <p className="mt-4 text-[1.02rem] leading-relaxed whitespace-pre-line text-text-2">
                        <Inline text={note} />
                    </p>
                )}
                <div className="mt-5 flex gap-2">
                    <Link href={paths.place(locale, place.slug)} className="nt-btn nt-btn-soft h-11 flex-1 text-sm">
                        <ArrowUpRight size={17} />
                        {t.blog.openPlace}
                    </Link>
                    <Link href={paths.directions(locale, place.slug)} className="nt-btn nt-btn-primary h-11 flex-1 text-sm">
                        <Navigation size={16} />
                        {t.blog.directions}
                    </Link>
                </div>
            </div>
        </article>
    );
}
