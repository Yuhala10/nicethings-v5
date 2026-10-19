"use client";

import { Check, Copy, Flag, MapPinned, Pencil, ThumbsUp, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { fill } from "@/lib/i18n";
import { call, useMe, withMe } from "@/lib/people/client";
import { MAX_TIP, MIN_TIP, type TipKind } from "@/lib/people/rules";
import type { TipView } from "@/lib/people/types";
import { visitorId } from "../site/Analytics";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";
import { PersonLine } from "./Person";
import Sheet from "./Sheet";

// "Comment y aller", the way people here actually go: the sentence to tell
// the taxi or the moto-taxi driver (a pin means nothing to them), then the
// path in words. Written by those who went, kept by "Ça m'a aidé"; until
// someone writes it, the place's landmark gives a first sentence.

export default function PlaceWay({
    slug,
    landmark,
    neighborhood,
    access,
    approximate,
    initial,
}: {
    slug: string;
    landmark: string | null;
    neighborhood: string | null;
    access: string | null;
    approximate: boolean;
    initial: TipView[];
}) {
    const { locale, t } = useLocale();
    const words = t.people.way;
    const toast = useToast();
    const { me } = useMe();
    const [tips, setTips] = useState<TipView[]>(initial);
    const [writing, setWriting] = useState<TipKind | null>(null);
    const [body, setBody] = useState("");
    const [busy, setBusy] = useState(false);
    const [trouble, setTrouble] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Signed in: their own ways (even waiting) and what they found useful.
    useEffect(() => {
        if (!me) return;
        let gone = false;
        call<{ tips: TipView[] }>(`/api/tips?place=${encodeURIComponent(slug)}`, "GET").then((answer) => {
            if (!gone && answer.ok === true) setTips(answer.tips);
        });
        return () => {
            gone = true;
        };
    }, [me, slug]);

    const taxis = tips.filter((tip) => tip.kind === "taxi");
    const ways = tips.filter((tip) => tip.kind === "way");
    const best = taxis[0] ?? null;
    // Before anyone writes it: the landmark, with the neighbourhood.
    const guessed = !best && landmark ? [neighborhood, landmark].filter(Boolean).join(", ") : null;
    const sentence = best?.body ?? guessed;

    const copy = async () => {
        if (!sentence) return;
        try {
            await navigator.clipboard.writeText(sentence);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {}
    };

    const vote = (tip: TipView) =>
        withMe("like", async () => {
            const on = !tip.voted;
            setTips((list) => list.map((item) => (item.id === tip.id ? { ...item, voted: on, helpful: Math.max(0, item.helpful + (on ? 1 : -1)) } : item)));
            await call("/api/tips/vote", "POST", { id: tip.id, on });
        });

    const open = (kind: TipKind) =>
        withMe("generic", () => {
            const mine = tips.find((tip) => tip.mine && tip.kind === kind);
            setBody(mine?.body ?? "");
            setTrouble(null);
            setWriting(kind);
        });

    const send = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!writing) return;
        if (body.trim().length < MIN_TIP) return setTrouble(words.short);
        setBusy(true);
        const answer = await call<{ tips: TipView[] }>("/api/tips", "POST", { place: slug, kind: writing, body });
        setBusy(false);
        if (answer.ok === false) return setTrouble(answer.why === "closed" ? t.people.common.closed : t.people.common.failed);
        setTips(answer.tips);
        setWriting(null);
        toast(answer.tips.some((tip) => tip.mine && tip.pending) ? words.pending : words.thanks);
    };

    const remove = async (tip: TipView) => {
        setTips((list) => list.filter((item) => item.id !== tip.id));
        await call(`/api/tips?id=${tip.id}`, "DELETE");
    };

    const useful = (tip: TipView, light = false) =>
        tip.mine ? (
            <button type="button" onClick={() => remove(tip)} className={`nt-tap inline-flex items-center gap-1 text-[0.75rem] font-semibold ${light ? "text-white/60" : "text-muted"}`}>
                <Trash2 size={12} />
                {words.delete}
            </button>
        ) : (
            <span className="inline-flex items-center gap-4">
                <button type="button" onClick={() => vote(tip)} aria-pressed={tip.voted} className={`nt-tap inline-flex items-center gap-1.5 text-[0.75rem] font-semibold ${tip.voted ? (light ? "text-[#f6dd86]" : "text-brand-600") : light ? "text-white/70" : "text-muted"}`}>
                    <ThumbsUp size={13} />
                    {words.helpful}
                    {tip.helpful > 0 && <span className="tabular-nums">· {tip.helpful}</span>}
                </button>
                <button
                    type="button"
                    aria-label={t.people.reviews.report}
                    onClick={async () => {
                        await call("/api/flags", "POST", { kind: "tip", id: tip.id, v: visitorId() });
                        toast(t.people.reviews.reported);
                    }}
                    className={`nt-tap ${light ? "text-white/50" : "text-muted"}`}
                >
                    <Flag size={12} />
                </button>
            </span>
        );

    return (
        <div>
            {/* The sentence for the driver: big, easy to copy or to show. */}
            <div className="relative overflow-hidden rounded-[1.5rem] bg-[#15110e] p-5 text-white">
                <span className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#d9572b]/30 blur-3xl" aria-hidden />
                <p className="relative text-[0.75rem] font-semibold tracking-[0.16em] text-[#d9bc8c] uppercase">🚕 {words.taxi}</p>
                {sentence ? (
                    <>
                        <p className="nt-serif relative mt-2 text-[1.75rem] leading-[1.15]">« {sentence} »</p>
                        <p className="relative mt-2 text-[0.75rem] text-white/60">{best ? fill(words.helpfulCount, { count: best.helpful }) : words.byTeam}</p>
                        {best && (
                            <div className="relative mt-3">
                                <PersonLine person={best.person} locale={locale} size={30} light />
                            </div>
                        )}
                        <div className="relative mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                            <button type="button" onClick={copy} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[0.875rem] font-semibold text-[#15110e]">
                                {copied ? <Check size={15} /> : <Copy size={15} />}
                                {copied ? words.copied : words.copy}
                            </button>
                            {best && useful(best, true)}
                        </div>
                    </>
                ) : (
                    <p className="relative mt-2 text-[1rem] leading-relaxed text-white/80">{words.taxiHint}</p>
                )}
                {taxis.length > 1 && (
                    <details className="relative mt-4 border-t border-white/10 pt-3">
                        <summary className="cursor-pointer text-[0.875rem] font-semibold text-white/80">
                            {words.others} · {taxis.length - 1}
                        </summary>
                        <ul className="mt-3 flex flex-col gap-3">
                            {taxis.slice(1).map((tip) => (
                                <li key={tip.id}>
                                    <p className="text-[1rem]">« {tip.body} »</p>
                                    <div className="mt-1 flex items-center justify-between gap-3 text-[0.75rem] text-white/60">
                                        <span>@{tip.person.handle}</span>
                                        {useful(tip, true)}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </details>
                )}
            </div>

            {/* The way in words: the team's, then those who went. */}
            {(access || approximate || ways.length > 0) && (
                <div className="mt-5">
                    <p className="nt-eyebrow mb-3">{words.path}</p>
                    {approximate && <p className="mb-3 rounded-[1rem] bg-surface-2 px-4 py-3 text-[0.875rem] font-semibold">{t.spot.accessApprox}</p>}
                    {access && (
                        <div className="mb-3 rounded-[1.1rem] border border-line bg-surface p-4">
                            <p className="mb-1.5 flex items-center gap-1.5 text-[0.75rem] font-semibold text-muted">
                                <MapPinned size={13} />
                                {words.team}
                            </p>
                            <p className="text-[1rem] leading-[1.7] whitespace-pre-line text-text-2">{access}</p>
                        </div>
                    )}
                    <ul className="flex flex-col gap-3">
                        {ways.map((tip) => (
                            <li key={tip.id} className={`rounded-[1.1rem] border p-4 ${tip.mine ? "border-brand-200 bg-brand-50/50 dark:border-brand-700/40 dark:bg-brand-700/10" : "border-line bg-surface"}`}>
                                <PersonLine person={tip.person} locale={locale} size={32} />
                                <p className="mt-2 text-[1rem] leading-[1.7] whitespace-pre-line text-text-2">{tip.body}</p>
                                {tip.pending && <p className="mt-1 text-[0.75rem] font-semibold text-[#b7791f]">{words.pending}</p>}
                                <div className="mt-2">
                                    {useful(tip)}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {!best && ways.length === 0 && <p className="mt-4 text-[0.875rem] text-muted">{words.empty}</p>}

            <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => open("taxi")} className="nt-btn nt-btn-soft h-11 px-4 text-[0.875rem]">
                    <Pencil size={15} />
                    {words.addTaxi}
                </button>
                <button type="button" onClick={() => open("way")} className="nt-btn nt-btn-soft h-11 px-4 text-[0.875rem]">
                    <Pencil size={15} />
                    {words.addWay}
                </button>
            </div>

            <Sheet open={writing !== null} onClose={() => setWriting(null)} closeLabel={t.people.common.close} title={writing === "taxi" ? words.addTaxi : words.addWay}>
                <form onSubmit={send}>
                    <p className="text-[0.875rem] leading-relaxed text-text-2">{writing === "taxi" ? words.taxiHint : words.add}</p>
                    <textarea
                        value={body}
                        onChange={(event) => setBody(event.target.value.slice(0, writing ? MAX_TIP[writing] : 400))}
                        placeholder={writing === "taxi" ? words.taxiPlaceholder : words.wayPlaceholder}
                        rows={writing === "taxi" ? 2 : 4}
                        autoFocus
                        className="nt-input mt-4"
                    />
                    <p className="mt-1 text-right text-[0.75rem] text-muted tabular-nums">
                        {body.length}/{writing ? MAX_TIP[writing] : 400}
                    </p>
                    {trouble && (
                        <p role="alert" className="mt-2 text-[0.875rem] font-semibold text-closed">
                            {trouble}
                        </p>
                    )}
                    <button type="submit" disabled={busy} className="nt-btn nt-btn-primary mt-4 w-full disabled:opacity-60">
                        {busy ? t.people.common.saving : words.send}
                    </button>
                </form>
            </Sheet>
        </div>
    );
}
