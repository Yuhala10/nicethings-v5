"use client";

import Link from "next/link";
import { Camera, Images, Play } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
    const { locale } = useLocale();
    const { outings, setOutings } = useOutings(source);
    if (outings === null) return <div className="nt-skeleton h-40 rounded-[1.5rem]" />;
    if (!outings.length) return <>{empty ?? null}</>;
    if (grid) {
        return (
            <ul className="grid grid-cols-3 gap-1.5 md:gap-2">
                {outings.map((outing) => (
                    <li key={outing.id}>
                        <Link href={paths.outing(locale, outing.id)} className="group relative block aspect-[4/5] overflow-hidden rounded-[0.9rem] bg-surface-2">
                            { }
                            <img src={outing.media[0].kind === "video" ? (outing.media[0].poster ?? "") : outing.media[0].url} alt={outing.place.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pt-8 pb-1.5 text-[0.75rem] font-semibold text-white">
                                <span className="block truncate">{outing.place.name}</span>
                            </span>
                            {outing.media.length > 1 && <Images size={14} className="absolute top-2 right-2 text-white drop-shadow" />}
                            {outing.media[0].kind === "video" && <Play size={14} fill="currentColor" className="absolute top-2 right-2 text-white drop-shadow" />}
                            {outing.status === "PENDING" && <span className="absolute top-2 left-2 h-2.5 w-2.5 rounded-full bg-[#f2c230]" />}
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
