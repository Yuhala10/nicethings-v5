"use client";

import Link from "next/link";
import { ChevronRight, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { fill } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import { cityBySlug, DEFAULT_CITY } from "@/lib/cities";
import { useMe, withMe } from "@/lib/people/client";
import type { KwatItem } from "@/lib/people/types";
import { useLocale } from "../site/LocaleProvider";
import { Face, RatingChip, VerifiedBadge } from "./Person";
import { Ago } from "./PlacePulse";
import OutingList, { PostOutingButton } from "./OutingList";

// "Ça bouge au kwat": the latest reviews, photos, live news and ways of the
// visitor's city, each with the face of who gave it; their neighbourhood
// first when they have a profile. A strip on the home page, the whole
// stream on its own page.

function useCity() {
    const { me } = useMe();
    const [saved, setSaved] = useState<string | null>(null);
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            try {
                setSaved(localStorage.getItem("nt_city"));
            } catch {}
        });
        return () => cancelAnimationFrame(frame);
    }, []);
    return cityBySlug(me?.city ?? saved)?.slug ?? DEFAULT_CITY.slug;
}

function Item({ item, wide = false }: { item: KwatItem; wide?: boolean }) {
    const { locale, t } = useLocale();
    const words = t.people.kwat;
    const href = item.type === "outing" ? paths.outing(locale, item.id) : `${paths.place(locale, item.place.slug)}${item.type === "review" ? "#avis" : item.type === "tip" ? "#y-aller" : ""}`;
    const who = item.person ? `@${item.person.handle}` : "";
    const head = (
        <span className="flex min-w-0 items-center gap-2.5">
            {item.person && <Face person={item.person} size={32} />}
            <span className="min-w-0 text-[0.75rem] leading-snug">
                <span className="font-semibold text-text">{who}</span>
                {item.person && <VerifiedBadge person={item.person} locale={locale} size={13} className="mx-0.5 -mt-0.5 align-middle" />}{" "}
                <span className="text-muted">{item.type === "review" ? words.review : item.type === "photo" ? words.photo : item.type === "tip" ? words.tip : item.type === "outing" ? words.outing : words.pulse}</span>
                <span className="block text-muted">
                    <Ago iso={item.at} words={t.people.pulse} />
                </span>
            </span>
        </span>
    );
    // A card takes the width of its place in the strip (or the grid): a fixed
    // width spilled over the next card on phones.
    const box = "group flex w-full flex-col overflow-hidden rounded-[1.25rem] border border-line bg-surface transition hover:border-text-2";

    if (item.type === "outing") {
        return (
            <Link href={paths.outing(locale, item.id)} className={box}>
                <span className="relative block aspect-[4/5] overflow-hidden bg-surface-2">
                    { }
                    <img src={item.cover} alt={item.place.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                    {item.count > 1 && <span className="absolute top-3 right-3 rounded-full bg-black/50 px-2 py-0.5 text-[0.75rem] font-semibold text-white">1/{item.count}</span>}
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10 text-white">
                        <span className="block truncate text-[1rem] font-semibold">{item.place.name}</span>
                        {item.mood && <span className="block text-[0.75rem] text-white/80">{t.people.outing.moods[item.mood as keyof typeof t.people.outing.moods]}</span>}
                    </span>
                </span>
                <span className="flex flex-1 flex-col gap-2 p-3.5">
                    {head}
                    {item.body && <span className="line-clamp-2 text-[0.875rem] text-text-2">{item.body}</span>}
                </span>
            </Link>
        );
    }
    if (item.type === "photo") {
        return (
            <Link href={href} className={box}>
                <span className="relative block aspect-[4/3] overflow-hidden bg-surface-2">
                    { }
                    <img src={item.url} alt={item.caption ?? item.place.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                    {item.kind === "video" && <Play size={16} fill="currentColor" className="absolute top-3 left-3 text-white drop-shadow" />}
                </span>
                <span className="flex flex-1 flex-col gap-2 p-3.5">
                    {head}
                    <span className="truncate text-[0.875rem] font-semibold">{item.place.name}</span>
                </span>
            </Link>
        );
    }
    return (
        <Link href={href} className={box}>
            {/* The place's photo, so a review or a way is not a bare white card. */}
            {item.place.cover && (
                <span className="relative block aspect-[16/9] overflow-hidden bg-surface-2">
                    { }
                    <img src={item.place.cover} alt={item.place.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                </span>
            )}
            <span className="flex flex-1 flex-col gap-2.5 p-3.5">
            {head}
            {item.type === "review" && (
                <>
                    <span className="flex items-center gap-2">
                        <RatingChip rating={item.rating} locale={locale} />
                    </span>
                    {item.body && <span className="line-clamp-3 text-[0.875rem] leading-relaxed text-text-2">{item.body}</span>}
                </>
            )}
            {item.type === "pulse" && (
                <span className="flex items-center gap-2 text-[1rem] font-bold">
                    <span className="text-[1.5rem]" aria-hidden>
                        {t.people.pulse.emoji[item.pulse as keyof typeof t.people.pulse.emoji]}
                    </span>
                    {t.people.pulse.kinds[item.pulse as keyof typeof t.people.pulse.kinds]}
                </span>
            )}
            {item.type === "tip" && <span className="nt-serif line-clamp-3 text-[1.125rem] leading-snug">🚕 « {item.body} »</span>}
            <span className="truncate text-[0.875rem] font-semibold">
                {fill(words.at, { place: item.place.name })}
                {item.place.neighborhood && <span className="font-normal text-muted"> · {item.place.neighborhood}</span>}
            </span>
            </span>
        </Link>
    );
}

function useFeed(city: string, area: string | null, limit: number) {
    const [items, setItems] = useState<KwatItem[] | null>(null);
    useEffect(() => {
        let gone = false;
        fetch(`/api/feed?city=${city}&n=${limit}${area ? `&area=${encodeURIComponent(area)}` : ""}`)
            .then((response) => response.json())
            .then((answer: { items?: KwatItem[] }) => !gone && setItems(answer.items ?? []))
            .catch(() => !gone && setItems([]));
        return () => {
            gone = true;
        };
    }, [city, area, limit]);
    return items;
}

function Empty() {
    const { t } = useLocale();
    const words = t.people.kwat;
    return (
        <div className="rounded-[1.25rem] border border-dashed border-line-strong p-5">
            <p className="text-[1rem] leading-relaxed text-text-2">{words.empty}</p>
            <button type="button" onClick={() => withMe("review", () => {})} className="nt-btn nt-btn-primary mt-4">
                {words.cta}
            </button>
        </div>
    );
}

// On the home page: a strip.
export default function KwatFeed() {
    const { locale, t } = useLocale();
    const words = t.people.kwat;
    const { me } = useMe();
    const city = useCity();
    const items = useFeed(city, me?.area ?? null, 10);

    return (
        <section className="mx-auto max-w-6xl pt-14 md:px-6 md:pt-24">
            <div className="mb-5 flex items-end justify-between gap-4 px-4 md:px-0">
                <div>
                    <p className="nt-eyebrow flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-closed" />
                        {words.eyebrow}
                    </p>
                    <h2 className="nt-section-title mt-1.5">{words.title}</h2>
                </div>
                <Link href={paths.kwat(locale)} className="nt-tap inline-flex min-h-11 shrink-0 items-center gap-1 text-[0.875rem] font-semibold">
                    {words.all}
                    <ChevronRight size={15} />
                </Link>
            </div>
            <div className="mb-4 px-4 md:px-0">
                <PostOutingButton label={t.people.outing.publish} className="h-11 px-5 text-[0.875rem]" />
            </div>
            {items === null ? (
                <div className="nt-rail">
                    {[0, 1, 2].map((index) => (
                        <div key={index} className="nt-skeleton h-44 rounded-[1.25rem]" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="px-4 md:px-0">
                    <Empty />
                </div>
            ) : (
                // Each card its own height: a short review is not stretched to
                // the height of a tall photo.
                <ul className="nt-rail items-start">
                    {items.map((item) => (
                        <li key={`${item.type}-${item.id}`}>
                            <Item item={item} />
                        </li>
                    ))}
                </ul>
            )}
            <p className="mt-3 px-4 text-[0.75rem] text-muted md:px-0">{words.lead}</p>
        </section>
    );
}

// The whole stream, on its own page.
export function KwatPage() {
    const { t } = useLocale();
    const words = t.people.kwat;
    const { me } = useMe();
    const city = useCity();
    const [view, setView] = useState<"near" | "city" | "friends">("near");
    const items = useFeed(city, view === "near" ? (me?.area ?? null) : null, 40);

    return (
        <div>
            <p className="nt-eyebrow flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-closed" />
                {words.eyebrow} · {cityBySlug(city)?.name}
            </p>
            <h1 className="nt-serif mt-2 text-[2.75rem] leading-[1.02]">{words.title}</h1>
            <p className="mt-3 max-w-xl text-[1rem] leading-relaxed text-text-2">{words.lead}</p>
            <PostOutingButton label={t.people.outing.publish} className="mt-5 h-11 px-5 text-[0.875rem]" />
            <div className="nt-scroll-x -mx-4 mt-5 gap-2 px-4">
                {me?.area && (
                    <button type="button" aria-pressed={view === "near"} onClick={() => setView("near")} className="nt-chip h-9 shrink-0 text-[0.875rem]">
                        {words.mine}
                    </button>
                )}
                <button type="button" aria-pressed={view === "city" || (view === "near" && !me?.area)} onClick={() => setView("city")} className="nt-chip h-9 shrink-0 text-[0.875rem]">
                    {words.city}
                </button>
                {me && (
                    <button type="button" aria-pressed={view === "friends"} onClick={() => setView("friends")} className="nt-chip h-9 shrink-0 text-[0.875rem]">
                        {t.people.follow.friends}
                    </button>
                )}
            </div>
            <div className="mt-6">
                {view === "friends" ? (
                    <OutingList source={{ following: true }} empty={<p className="rounded-[1.25rem] border border-dashed border-line-strong p-5 text-[1rem] leading-relaxed text-text-2">{t.people.follow.friendsEmpty}</p>} />
                ) : items === null ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {[0, 1, 2, 3].map((index) => (
                            <div key={index} className="nt-skeleton h-44 rounded-[1.25rem]" />
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <Empty />
                ) : (
                    <ul className="grid items-start gap-3 sm:grid-cols-2">
                        {items.map((item) => (
                            <li key={`${item.type}-${item.id}`}>
                                <Item item={item} wide />
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
