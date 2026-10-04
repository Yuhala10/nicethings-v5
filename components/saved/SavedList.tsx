"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, Heart, RotateCw } from "lucide-react";
import { fill } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import type { PlaceSummary } from "@/lib/places/types";
import { useSaved } from "@/lib/hooks/useSaved";
import { PlaceCardSkeleton } from "../place/PlaceCard";
import PinCard from "../place/PinCard";
import { useLocale } from "../site/LocaleProvider";

type State = { status: "loading" } | { status: "failed" } | { status: "done"; places: PlaceSummary[] };

export default function SavedList() {
    const { locale, t } = useLocale();
    const { saved } = useSaved();
    const [state, setState] = useState<State>({ status: "loading" });
    const [attempt, setAttempt] = useState(0);
    const [hydrated, setHydrated] = useState(false);
    const key = saved.join(",");

    useEffect(() => setHydrated(true), []);

    useEffect(() => {
        if (!hydrated) return;
        if (!key) {
            setState({ status: "done", places: [] });
            return;
        }
        let cancelled = false;
        // Keep showing the current cards while an unsave refreshes the list.
        setState((current) => (current.status === "done" ? current : { status: "loading" }));
        fetch(`/api/places?slugs=${encodeURIComponent(key)}`)
            .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
            .then((data: { places: PlaceSummary[] }) => !cancelled && setState({ status: "done", places: data.places }))
            .catch(() => !cancelled && setState({ status: "failed" }));
        return () => {
            cancelled = true;
        };
    }, [key, hydrated, attempt]);

    const places = state.status === "done" ? state.places.filter((place) => saved.includes(place.slug)) : [];

    return (
        <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6 md:pt-10">
            <h1 className="text-[1.9rem] leading-tight font-extrabold md:text-4xl">{t.saved.title}</h1>
            {state.status === "done" && places.length > 0 && (
                <p className="mt-1 text-sm text-muted">
                    {places.length === 1 ? t.city.placesCountOne : fill(t.city.placesCount, { count: places.length })}
                </p>
            )}

            {state.status === "loading" && (
                <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 lg:grid-cols-4" aria-busy>
                    {[0, 1, 2, 3].map((index) => (
                        <li key={index}>
                            <PlaceCardSkeleton className="w-full" />
                        </li>
                    ))}
                </ul>
            )}

            {state.status === "failed" && (
                <div className="mt-8 rounded-3xl bg-surface-2 px-6 py-10 text-center">
                    <p className="mb-4 text-text-2">{t.errors.network}</p>
                    <button type="button" onClick={() => setAttempt((value) => value + 1)} className="nt-btn nt-btn-dark">
                        <RotateCw size={17} />
                        {t.common.retry}
                    </button>
                </div>
            )}

            {state.status === "done" && places.length === 0 && (
                <div className="mt-8 rounded-3xl bg-surface-2 px-6 py-12 text-center">
                    <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-surface text-brand-500 shadow-card">
                        <Heart size={24} />
                    </div>
                    <p className="mx-auto mb-6 max-w-xs text-text-2">{t.saved.empty}</p>
                    <Link href={paths.map(locale)} className="nt-btn nt-btn-primary">
                        <Compass size={18} />
                        {t.saved.explore}
                    </Link>
                </div>
            )}

            {places.length > 0 && (
                <ul className="nt-masonry mt-6 columns-2 md:columns-3 lg:columns-4">
                    {places.map((place) => (
                        <li key={place.id}>
                            <PinCard place={place} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
