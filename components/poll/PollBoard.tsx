"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Check, Navigation, Plus, Send, Trophy } from "lucide-react";
import { fill } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import { MAX_VOTER_NAME, type PollState } from "@/lib/polls";
import { sharePlace } from "@/lib/share";
import { placeKind } from "../place/PinCard";
import { PlaceThumb, VerifiedMark } from "../place/bits";
import { visitorId } from "../site/Analytics";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";

// The vote as a group sees it: the places proposed, a tap to choose, the
// bars moving as friends answer. It asks again every few seconds while the
// page is in front, so nobody has to refresh.
const NAME_KEY = "nt_first_name";
const EVERY_MS = 8000;

export default function PollBoard({ initial }: { initial: PollState }) {
    const { locale, t } = useLocale();
    const toast = useToast();
    const [poll, setPoll] = useState(initial);
    const [name, setName] = useState("");
    const [busy, setBusy] = useState<string | null>(null);
    const code = initial.code;

    const refresh = useCallback(async () => {
        try {
            const answer = await fetch(`/api/polls?code=${code}&v=${visitorId()}`, { cache: "no-store" });
            const data = (await answer.json()) as { ok: boolean; poll?: PollState };
            if (data.ok && data.poll) setPoll(data.poll);
        } catch {
            // The next round will try again.
        }
    }, [code]);

    useEffect(() => {
        try {
            setName(localStorage.getItem(NAME_KEY) ?? "");
        } catch {
            // No storage: the name is simply typed again.
        }
        void refresh();
        const timer = window.setInterval(() => !document.hidden && void refresh(), EVERY_MS);
        return () => window.clearInterval(timer);
    }, [refresh]);

    const vote = async (slug: string) => {
        if (busy) return;
        setBusy(slug);
        const first = name.trim().slice(0, MAX_VOTER_NAME);
        try {
            if (first) localStorage.setItem(NAME_KEY, first);
        } catch {
            // Not kept: nothing depends on it.
        }
        try {
            const answer = await fetch("/api/polls/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, slug, v: visitorId(), name: first }) });
            const data = (await answer.json()) as { ok: boolean; poll?: PollState };
            if (!data.ok || !data.poll) throw new Error("refused");
            setPoll(data.poll);
            toast(t.poll.thanks);
        } catch {
            toast(t.poll.failed);
        } finally {
            setBusy(null);
        }
    };

    const share = async () => {
        const url = `${window.location.origin}${paths.poll(locale, code)}?ref=vote`;
        // The address alone: the chat shows the vote's card, and one short line under it.
        const result = await sharePlace(poll.title ?? t.poll.eyebrow, url, "");
        if (result === "copied") toast(t.common.copied);
    };

    const top = Math.max(0, ...poll.options.map((option) => option.votes));
    const leaders = top > 0 ? poll.options.filter((option) => option.votes === top) : [];
    const leader = leaders.length === 1 ? leaders[0] : null;

    return (
        <div className="mx-auto max-w-2xl px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-28 md:px-6 md:pt-14">
            <p className="nt-eyebrow flex items-center gap-2">
                <span className="nt-open-dot" aria-hidden />
                {t.poll.eyebrow}
            </p>
            <h1 className="nt-serif mt-2 text-[2.75rem] leading-[1] md:text-[3.5rem]">{poll.title ?? t.poll.title}</h1>
            <p className="mt-3 text-[1rem] text-text-2" aria-live="polite">
                {poll.total === 0 ? t.poll.votesNone : poll.total === 1 ? t.poll.votesOne : fill(t.poll.votesMany, { count: poll.total })}
            </p>

            <label className="mt-6 block">
                <span className="text-[0.875rem] font-semibold">{t.poll.nameLabel}</span>
                <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={MAX_VOTER_NAME}
                    autoComplete="given-name"
                    placeholder={t.poll.namePlaceholder}
                    className="mt-1.5 h-12 w-full rounded-[0.9rem] border border-line-strong bg-surface px-4 text-[1rem] outline-none focus:border-brand-500"
                />
            </label>

            <ol className="mt-5 space-y-3">
                {poll.options.map((option) => {
                    const mine = poll.mine === option.place.slug;
                    const share = poll.total > 0 ? Math.round((option.votes / poll.total) * 100) : 0;
                    return (
                        <li key={option.place.slug} className={`nt-card overflow-hidden transition-shadow ${mine ? "ring-2 ring-brand-600" : ""}`}>
                            <div className="flex gap-3.5 p-3">
                                <PlaceThumb cover={option.place.cover} category={option.place.category} name={option.place.name} sizes="96px" className="h-24 w-24 shrink-0 rounded-[0.9rem]" iconSize={24} />
                                <div className="min-w-0 flex-1">
                                    <p className="flex items-center gap-1.5 text-[1.125rem] leading-tight font-semibold">
                                        <span className="truncate">{option.place.name}</span>
                                        <VerifiedMark verified={option.place.verified} />
                                    </p>
                                    <p className="mt-0.5 truncate text-[0.875rem] text-muted">{[placeKind(option.place, locale), option.place.neighborhood].filter(Boolean).join(" · ")}</p>
                                    <div className="mt-2.5 flex items-center gap-2.5">
                                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                                            <div className="h-full rounded-full bg-brand-600 transition-[width] duration-700 ease-out" style={{ width: `${share}%` }} />
                                        </div>
                                        <span className="w-6 text-right text-[0.875rem] font-semibold tabular-nums">{option.votes}</span>
                                    </div>
                                    {option.voters.length > 0 && <p className="mt-1 truncate text-[0.75rem] text-muted">{option.voters.join(", ")}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 border-t border-line p-2.5">
                                <button type="button" onClick={() => void vote(option.place.slug)} disabled={busy !== null || mine} className={`nt-btn h-11 flex-1 ${mine ? "nt-btn-soft" : "nt-btn-primary"}`}>
                                    {mine && <Check size={17} />}
                                    {mine ? t.poll.voted : poll.mine ? t.poll.change : t.poll.vote}
                                </button>
                                <Link href={paths.place(locale, option.place.slug)} className="nt-btn nt-btn-outline h-11 px-4 text-[0.875rem]">
                                    {t.poll.seePlace}
                                </Link>
                            </div>
                        </li>
                    );
                })}
            </ol>

            {poll.total > 0 && (
                <div className="mt-5 flex items-center gap-3 rounded-[1.25rem] bg-surface-2 p-4">
                    <Trophy size={20} className="shrink-0 text-brand-600" />
                    <p className="min-w-0 flex-1 text-[1rem]">
                        {leader ? (
                            <>
                                <span className="text-muted">{t.poll.leader} : </span>
                                <span className="font-semibold">{leader.place.name}</span>
                            </>
                        ) : (
                            t.poll.tie
                        )}
                    </p>
                    {leader && (
                        <Link href={paths.place(locale, leader.place.slug)} className="nt-btn nt-btn-dark h-11 shrink-0 px-4 text-[0.875rem]">
                            <Navigation size={15} />
                            {t.poll.go}
                        </Link>
                    )}
                </div>
            )}

            <button type="button" onClick={() => void share()} className="nt-btn nt-btn-dark mt-5 w-full">
                <Send size={17} />
                {t.poll.share}
            </button>

            <div className="mt-8 flex flex-col gap-2.5 border-t border-line pt-6 sm:flex-row">
                <Link href={paths.saved(locale)} className="nt-btn nt-btn-outline">
                    <Plus size={17} />
                    {t.poll.make}
                </Link>
                <Link href={`${paths.home(locale)}?ref=vote`} className="nt-btn nt-btn-soft">
                    {t.poll.discover}
                    <ArrowRight size={17} />
                </Link>
            </div>
        </div>
    );
}
