"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Compass, Heart, RotateCw, Users, X } from "lucide-react";
import { fill } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import type { PlaceSummary } from "@/lib/places/types";
import { MAX_POLL_TITLE, POLL_MAX, POLL_MIN } from "@/lib/polls";
import { useSaved } from "@/lib/hooks/useSaved";
import { PlaceCardSkeleton } from "../place/PlaceCard";
import PinCard from "../place/PinCard";
import { visitorId } from "../site/Analytics";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";

type State = { status: "loading" } | { status: "failed" } | { status: "done"; places: PlaceSummary[] };

export default function SavedList() {
    const { locale, t } = useLocale();
    const router = useRouter();
    const toast = useToast();
    const { saved } = useSaved();
    const [state, setState] = useState<State>({ status: "loading" });
    const [attempt, setAttempt] = useState(0);
    const [hydrated, setHydrated] = useState(false);
    const key = saved.join(",");

    // "On se voit où ?": pick two to four of the saved places and send the
    // group a link to vote. Offered only once the votes can be kept
    // (database script 007).
    const [canPoll, setCanPoll] = useState(false);
    const [picking, setPicking] = useState(false);
    const [chosen, setChosen] = useState<string[]>([]);
    const [title, setTitle] = useState("");
    const [creating, setCreating] = useState(false);

    useEffect(() => setHydrated(true), []);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/polls?ready=1")
            .then((response) => (response.ok ? response.json() : null))
            .then((data: { ready?: boolean } | null) => !cancelled && setCanPoll(Boolean(data?.ready)))
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

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

    const toggle = (slug: string) =>
        setChosen((current) => (current.includes(slug) ? current.filter((item) => item !== slug) : current.length < POLL_MAX ? [...current, slug] : current));
    const stop = () => {
        setPicking(false);
        setChosen([]);
    };
    const create = async () => {
        if (creating || chosen.length < POLL_MIN) return;
        setCreating(true);
        try {
            const answer = await fetch("/api/polls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slugs: chosen, title: title.trim(), v: visitorId() }) });
            const data = (await answer.json()) as { ok: boolean; code?: string; why?: string };
            if (!data.ok || !data.code) {
                toast(data.why === "many" ? t.poll.many : t.poll.failed);
                return;
            }
            router.push(paths.poll(locale, data.code));
        } catch {
            toast(t.poll.failed);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className={`mx-auto max-w-6xl px-4 pt-6 md:px-6 md:pt-10 ${picking ? "pb-44" : ""}`}>
            <h1 className="text-[1.75rem] leading-tight font-extrabold md:text-4xl">{t.saved.title}</h1>
            {state.status === "done" && places.length > 0 && (
                <p className="mt-1 text-sm text-muted">
                    {places.length === 1 ? t.city.placesCountOne : fill(t.city.placesCount, { count: places.length })}
                </p>
            )}

            {canPoll && !picking && places.length >= POLL_MIN && (
                <div className="mt-5 flex flex-col gap-3 rounded-[1.25rem] bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
                    <div className="min-w-0">
                        <p className="nt-serif text-[1.5rem] leading-tight">{t.poll.start}</p>
                        <p className="mt-1 text-[0.875rem] leading-relaxed text-text-2">{t.poll.startHint}</p>
                    </div>
                    <button type="button" onClick={() => setPicking(true)} className="nt-btn nt-btn-primary shrink-0">
                        <Users size={17} />
                        {t.poll.begin}
                    </button>
                </div>
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
                    {places.map((place) => {
                        const on = chosen.includes(place.slug);
                        return (
                            <li key={place.id} className="relative">
                                <div className={picking ? `rounded-[1.1rem] transition ${on ? "ring-[3px] ring-brand-600 ring-offset-2 ring-offset-bg" : "opacity-80"}` : ""}>
                                    <PinCard place={place} />
                                </div>
                                {/* While choosing, a tap picks the place instead of opening it. */}
                                {picking && (
                                    <button type="button" onClick={() => toggle(place.slug)} aria-pressed={on} aria-label={place.name} className="absolute inset-0 z-10 rounded-[1.1rem]">
                                        <span className={`absolute top-2.5 left-2.5 grid h-8 w-8 place-items-center rounded-full border-2 border-white shadow-card ${on ? "bg-brand-600 text-white" : "bg-black/35 text-transparent"}`}>
                                            <Check size={17} strokeWidth={3} />
                                        </span>
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            {picking && (
                <div className="nt-card fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-40 mx-auto max-w-xl p-3 shadow-float md:bottom-6">
                    <div className="flex items-center justify-between gap-3 px-1">
                        <p className="text-[0.875rem] font-semibold">{chosen.length === 0 ? t.poll.pick : fill(t.poll.picked, { count: chosen.length })}</p>
                        <button type="button" onClick={stop} aria-label={t.poll.cancel} className="nt-tap grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="mt-2 flex gap-2">
                        <input
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            maxLength={MAX_POLL_TITLE}
                            placeholder={t.poll.titlePlaceholder}
                            className="h-12 min-w-0 flex-1 rounded-[0.9rem] border border-line-strong bg-bg px-3.5 text-[1rem] outline-none focus:border-brand-500"
                        />
                        <button type="button" onClick={() => void create()} disabled={creating || chosen.length < POLL_MIN} className="nt-btn nt-btn-primary h-12 shrink-0 px-4">
                            {t.poll.create}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
