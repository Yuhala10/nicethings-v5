"use client";

import Link from "next/link";
import { Camera, Heart, Images, MessageCircle, Play } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatRelativeDays } from "@/lib/i18n/format";
import { paths } from "@/lib/places/paths";
import { call, openOuting } from "@/lib/people/client";
import type { OutingView } from "@/lib/people/types";
import { useLocale } from "../site/LocaleProvider";
import OutingCard from "./OutingCard";

// Outings, read for the person looking: of a place, of a member, or of
// the people they follow. As cards, or as a grid of tiles (a profile).
// A new outing posted on this phone appears at once.

type Source = { place: string } | { handle: string } | { following: true };

function queryOf(source: Source) {
    if ("place" in source) return `place=${encodeURIComponent(source.place)}`;
    if ("handle" in source) return `handle=${encodeURIComponent(source.handle)}`;
    return "following=1";
}

export function useOutings(source: Source) {
    const [outings, setOutings] = useState<OutingView[] | null>(null);
    const [closed, setClosed] = useState(false);
    const key = queryOf(source);
    const load = useCallback(async () => {
        const answer = await call<{ outings: OutingView[] }>(`/api/outings?${key}`, "GET");
        if (answer.ok === true) setOutings(answer.outings);
        else {
            setClosed(answer.why === "closed");
            setOutings([]);
        }
    }, [key]);
    useEffect(() => {
        load();
        const again = () => load();
        window.addEventListener("nt:outing-posted", again);
        return () => window.removeEventListener("nt:outing-posted", again);
    }, [load]);
    return { outings, setOutings, closed };
}

export default function OutingList({ source, empty, grid = false }: { source: Source; empty?: React.ReactNode; grid?: boolean }) {
    const { locale, t } = useLocale();
    const { outings, setOutings } = useOutings(source);
    if (outings === null) return <div className="nt-skeleton h-40 rounded-[1.5rem]" />;
    if (!outings.length) return <>{empty ?? null}</>;
    if (grid) {
        // Each outing in its frame, like a photo printed and pinned: the
        // picture, the place and the mood on it, then what it got.
        return (
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
                {outings.map((outing) => (
                    <li key={outing.id}>
                        <Link href={paths.outing(locale, outing.id)} className="group block rounded-[1.35rem] border border-line bg-surface p-1.5 shadow-[var(--nt-shadow)] transition hover:-translate-y-0.5 hover:shadow-[var(--nt-shadow-lg)] active:scale-[0.98]">
                            <span className="relative block aspect-[4/5] overflow-hidden rounded-[1rem] bg-surface-2">
                                { }
                                <img src={outing.media[0].kind === "video" ? (outing.media[0].poster ?? "") : outing.media[0].url} alt={outing.place.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-2.5 pt-10 pb-2 text-white">
                                    <span className="block truncate text-[0.875rem] font-semibold">{outing.place.name}</span>
                                    {outing.mood && <span className="block truncate text-[0.75rem] text-white/85">{t.people.outing.moods[outing.mood as keyof typeof t.people.outing.moods]}</span>}
                                    {(outing.song || outing.sound) && outing.media[0].kind === "photo" && (
                                        <span className="block truncate text-[0.75rem] text-white/85">🎵 {outing.song ? outing.song.title : t.people.post.sounds[outing.sound as keyof typeof t.people.post.sounds]}</span>
                                    )}
                                </span>
                                {outing.media.length > 1 && (
                                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[0.75rem] font-semibold text-white">
                                        <Images size={12} />
                                        {outing.media.length}
                                    </span>
                                )}
                                {outing.media[0].kind === "video" && <Play size={16} fill="currentColor" className="absolute top-2.5 right-2.5 text-white drop-shadow" />}
                                {outing.status === "PENDING" && <span className="absolute top-2 left-2 rounded-full bg-[#f2c230] px-2 py-0.5 text-[0.75rem] font-bold text-[#15110e]">{t.people.outing.pending}</span>}
                            </span>
                            <span className="flex items-center gap-3 px-1.5 pt-2 pb-1 text-[0.75rem] text-muted">
                                <span className="inline-flex items-center gap-1">
                                    <Heart size={13} className={outing.liked ? "fill-brand-500 text-brand-500" : ""} />
                                    {outing.likes}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <MessageCircle size={13} />
                                    {outing.comments}
                                </span>
                                <span className="ml-auto truncate">{formatRelativeDays(outing.at, locale)}</span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        );
    }
    return (
        <ul className="flex flex-col gap-4">
            {outings.map((outing) => (
                <li key={outing.id}>
                    <OutingCard outing={outing} onRemoved={(id) => setOutings((list) => (list ?? []).filter((item) => item.id !== id))} />
                </li>
            ))}
        </ul>
    );
}

// The button that opens "Ma sortie", at a place or anywhere.
export function PostOutingButton({ place, label, className = "" }: { place?: { slug: string; name: string; neighborhood: string | null }; label: string; className?: string }) {
    return (
        <button type="button" onClick={() => openOuting(place)} className={`nt-btn nt-btn-primary ${className}`}>
            <Camera size={17} />
            {label}
        </button>
    );
}
