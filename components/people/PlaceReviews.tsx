"use client";

import { Flag, MessageCircle, Pencil, ThumbsUp, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fill } from "@/lib/i18n";
import { formatNumber, formatPrice, formatRelativeDays } from "@/lib/i18n/format";
import { call, useMe, withMe } from "@/lib/people/client";
import { COMPANIES, DISLIKE_TAGS, FACT_TAGS, LIKE_TAGS, MAX_REVIEW } from "@/lib/people/rules";
import type { ReviewSummary, ReviewView } from "@/lib/people/types";
import { visitorId } from "../site/Analytics";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";
import { PersonLine, RatingChip } from "./Person";
import Sheet from "./Sheet";
import Talk from "./Talk";

// "Ce qu'on en dit": a place's reviews, each signed with a face and a rank,
// what they add up to (the mood, what people liked, what they paid), and
// the form to give one's own.

type Data = { summary: ReviewSummary; reviews: ReviewView[]; mine: ReviewView | null };

const SHOWN = 5;

// ---------------------------------------------------------------- the form

function Composer({ slug, mine, open, onClose, onSaved }: { slug: string; mine: ReviewView | null; open: boolean; onClose: () => void; onSaved: (data: Data) => void }) {
    const { locale, t } = useLocale();
    const words = t.people;
    const [rating, setRating] = useState(mine?.rating ?? 0);
    const [tags, setTags] = useState<string[]>(mine?.tags ?? []);
    const [company, setCompany] = useState<string | null>(mine?.company ?? null);
    const [price, setPrice] = useState(mine?.pricePaid ? String(mine.pricePaid) : "");
    const [body, setBody] = useState(mine?.body ?? "");
    const [busy, setBusy] = useState(false);
    const [trouble, setTrouble] = useState<string | null>(null);

    const toggle = (tag: string) => setTags((list) => (list.includes(tag) ? list.filter((item) => item !== tag) : [...list, tag]));

    const send = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!rating) return setTrouble(words.reviews.rateFirst);
        setBusy(true);
        setTrouble(null);
        const answer = await call<Data>("/api/reviews", "POST", { place: slug, rating, tags, company, pricePaid: Number(price.replace(/\D/g, "")) || null, body });
        setBusy(false);
        if (answer.ok === false) return setTrouble(answer.why === "many" ? words.common.many : answer.why === "closed" ? words.common.closed : words.common.failed);
        onSaved(answer);
        onClose();
    };

    const chip = (tag: string) => (
        <button key={tag} type="button" aria-pressed={tags.includes(tag)} onClick={() => toggle(tag)} className="nt-chip h-9 text-[0.875rem]">
            {words.tags[tag as keyof typeof words.tags]}
        </button>
    );

    return (
        <Sheet open={open} onClose={onClose} closeLabel={words.common.close} title={mine ? words.reviews.edit : words.reviews.write} wide>
            <form onSubmit={send}>
                <p className="mb-3 text-[1rem] font-semibold">{words.reviews.yourRating}</p>
                <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((value) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setRating(value)}
                            aria-pressed={rating === value}
                            className={`flex flex-col items-center gap-1 rounded-[1rem] border px-1 py-2.5 text-center transition active:scale-95 ${rating === value ? "border-text bg-surface-2" : "border-line"}`}
                        >
                            <span className={`text-[1.75rem] leading-none transition ${rating && rating !== value ? "opacity-40 grayscale" : ""}`} aria-hidden>
                                {words.ratingFaces[value - 1]}
                            </span>
                            <span className="text-[0.75rem] leading-tight font-semibold">{words.ratings[value - 1]}</span>
                        </button>
                    ))}
                </div>

                <p className="mt-6 mb-2.5 text-[0.875rem] font-semibold">{words.reviews.liked}</p>
                <div className="flex flex-wrap gap-2">{LIKE_TAGS.map(chip)}</div>
                <p className="mt-5 mb-2.5 text-[0.875rem] font-semibold">{words.reviews.disliked}</p>
                <div className="flex flex-wrap gap-2">{DISLIKE_TAGS.map(chip)}</div>
                <p className="mt-5 mb-2.5 text-[0.875rem] font-semibold">{words.reviews.facts}</p>
                <div className="flex flex-wrap gap-2">{FACT_TAGS.map(chip)}</div>

                <p className="mt-5 mb-2.5 text-[0.875rem] font-semibold">{words.reviews.with}</p>
                <div className="flex flex-wrap gap-2">
                    {COMPANIES.map((key) => (
                        <button key={key} type="button" aria-pressed={company === key} onClick={() => setCompany(company === key ? null : key)} className="nt-chip h-9 text-[0.875rem]">
                            {words.companies[key]}
                        </button>
                    ))}
                </div>

                <label htmlFor="review-price" className="mt-5 mb-2 block text-[0.875rem] font-semibold">
                    {words.reviews.paid}
                </label>
                <div className="flex items-center gap-2">
                    <input
                        id="review-price"
                        value={price}
                        inputMode="numeric"
                        onChange={(event) => {
                            const digits = event.target.value.replace(/\D/g, "").slice(0, 7);
                            setPrice(digits ? formatNumber(Number(digits), locale) : "");
                        }}
                        placeholder={words.reviews.paidPlaceholder}
                        className="nt-input max-w-[11rem]"
                    />
                    <span className="text-[0.875rem] font-semibold text-muted">{t.common.currency}</span>
                </div>

                <label htmlFor="review-body" className="mt-5 mb-2 block text-[0.875rem] font-semibold">
                    {words.reviews.body}
                </label>
                <textarea id="review-body" value={body} onChange={(event) => setBody(event.target.value.slice(0, MAX_REVIEW))} placeholder={words.reviews.bodyPlaceholder} rows={4} className="nt-input" />
                {trouble && (
                    <p role="alert" className="mt-3 text-[0.875rem] font-semibold text-closed">
                        {trouble}
                    </p>
                )}
                <button type="submit" disabled={busy} className="nt-btn nt-btn-primary sticky bottom-0 mt-5 w-full shadow-float disabled:opacity-60">
                    {busy ? words.reviews.sending : words.reviews.send}
                </button>
            </form>
        </Sheet>
    );
}

// ---------------------------------------------------------------- one review

function ReviewCard({ review, onVote, onEdit, onDelete }: { review: ReviewView; onVote: (review: ReviewView) => void; onEdit: () => void; onDelete: (review: ReviewView) => void }) {
    const { locale, t } = useLocale();
    const words = t.people;
    const toast = useToast();
    const [replying, setReplying] = useState(false);
    const [replies, setReplies] = useState(review.replies);
    const said = [review.pricePaid ? fill(words.reviews.paidLabel, { price: formatPrice(review.pricePaid, locale) }) : null, review.company ? words.companies[review.company as keyof typeof words.companies] : null].filter(Boolean);

    return (
        <li className={`rounded-[1.25rem] border p-4 ${review.mine ? "border-brand-200 bg-brand-50/50 dark:border-brand-700/40 dark:bg-brand-700/10" : "border-line bg-surface"}`}>
            <PersonLine person={review.person} locale={locale} meta={formatRelativeDays(review.updatedAt, locale)} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <RatingChip rating={review.rating} locale={locale} />
                {review.tags.map((tag) => (
                    <span key={tag} className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[0.75rem] font-semibold ${(DISLIKE_TAGS as readonly string[]).includes(tag) ? "border-[#f2c9c4] text-[#a61b1b] dark:border-[#a61b1b]/40 dark:text-[#f5a5a0]" : "border-line-strong text-text-2"}`}>
                        {words.tags[tag as keyof typeof words.tags]}
                    </span>
                ))}
            </div>
            {said.length > 0 && <p className="mt-2 text-[0.75rem] font-semibold text-muted">{said.join(" · ")}</p>}
            {review.body && <p className="mt-2.5 text-[1rem] leading-[1.65] whitespace-pre-line text-text-2">{review.body}</p>}
            {review.pending && <p className="mt-2 text-[0.75rem] font-semibold text-[#b7791f]">{words.reviews.pending}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.875rem] font-semibold text-muted">
                {!review.mine && (
                    <button type="button" onClick={() => onVote(review)} aria-pressed={review.voted} className={`nt-tap inline-flex items-center gap-1.5 transition ${review.voted ? "text-brand-600" : "hover:text-text"}`}>
                        <ThumbsUp size={15} className={review.voted ? "nt-pop fill-brand-500/20" : ""} />
                        {words.reviews.helpful}
                        {review.helpful > 0 && <span className="tabular-nums">· {review.helpful}</span>}
                    </button>
                )}
                {review.mine && review.helpful > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-brand-600">
                        <ThumbsUp size={15} />
                        {review.helpful} {words.reviews.helpful.toLowerCase()}
                    </span>
                )}
                {!review.pending && (
                    <button type="button" onClick={() => setReplying((current) => !current)} className="nt-tap inline-flex items-center gap-1.5 hover:text-text">
                        <MessageCircle size={15} />
                        {replies > 0 ? fill(replies === 1 ? words.reviews.repliesOne : words.reviews.repliesMany, { count: replies }) : words.reviews.reply}
                    </button>
                )}
                <span className="ml-auto flex gap-3">
                    {review.mine ? (
                        <>
                            <button type="button" onClick={onEdit} className="nt-tap inline-flex items-center gap-1 hover:text-text">
                                <Pencil size={13} />
                                {words.me.edit}
                            </button>
                            <button type="button" onClick={() => onDelete(review)} className="nt-tap inline-flex items-center gap-1 hover:text-closed">
                                <Trash2 size={13} />
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={async () => {
                                await call("/api/flags", "POST", { kind: "review", id: review.id, v: visitorId() });
                                toast(words.reviews.reported);
                            }}
                            aria-label={words.reviews.report}
                            className="nt-tap inline-flex items-center gap-1 hover:text-text"
                        >
                            <Flag size={13} />
                        </button>
                    )}
                </span>
            </div>

            {replying && (
                <div className="mt-4 border-t border-line pt-4">
                    <Talk target="review" ids={[review.id]} postTo={review.id} compact autoFocus onCount={setReplies} />
                </div>
            )}
        </li>
    );
}

// ---------------------------------------------------------------- section

export default function PlaceReviews({ slug, initial }: { slug: string; initial: Data }) {
    const { locale, t } = useLocale();
    const words = t.people;
    const toast = useToast();
    const { me } = useMe();
    const [data, setData] = useState<Data>(initial);
    const [sort, setSort] = useState<"recent" | "useful">("recent");
    const [writing, setWriting] = useState(false);
    const [all, setAll] = useState(false);

    // Who is reading changes what they see: their own review first, what
    // they already validated.
    const load = useCallback(
        async (order: "recent" | "useful") => {
            const answer = await call<Data>(`/api/reviews?place=${encodeURIComponent(slug)}&sort=${order}`, "GET");
            if (answer.ok === true) setData({ summary: answer.summary, reviews: answer.reviews, mine: answer.mine });
        },
        [slug]
    );
    useEffect(() => {
        if (me) load(sort);
    }, [me, sort, load]);

    const vote = (review: ReviewView) =>
        withMe("like", async () => {
            const on = !review.voted;
            setData((current) => ({ ...current, reviews: current.reviews.map((item) => (item.id === review.id ? { ...item, voted: on, helpful: Math.max(0, item.helpful + (on ? 1 : -1)) } : item)) }));
            const answer = await call<{ helpful: number }>("/api/reviews/vote", "POST", { id: review.id, on });
            if (answer.ok === true) setData((current) => ({ ...current, reviews: current.reviews.map((item) => (item.id === review.id ? { ...item, helpful: answer.helpful } : item)) }));
        });

    const remove = async (review: ReviewView) => {
        if (!window.confirm(words.reviews.confirmDelete)) return;
        await call(`/api/reviews?id=${review.id}`, "DELETE");
        await load(sort);
    };

    const { summary } = data;
    const top = Math.max(...summary.spread, 1);
    const rounded = Math.min(5, Math.max(1, Math.round(summary.average)));
    const list = data.reviews;
    const shown = all ? list : list.slice(0, SHOWN);

    return (
        <div>
            {summary.count > 0 ? (
                <div className="rounded-[1.5rem] bg-surface-2 p-5">
                    <div className="flex items-center gap-5">
                        <div className="shrink-0 text-center">
                            <p className="nt-serif text-[3.5rem] leading-none">{summary.average.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
                            <p className="mt-1.5 text-[0.875rem] font-semibold">
                                {words.ratingFaces[rounded - 1]} {words.ratings[rounded - 1]}
                            </p>
                            <p className="text-[0.75rem] text-muted">{fill(summary.count === 1 ? words.reviews.countOne : words.reviews.countMany, { count: summary.count })}</p>
                        </div>
                        <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
                            {[5, 4, 3, 2, 1].map((value) => (
                                <li key={value} className="flex items-center gap-2 text-[0.75rem]">
                                    <span className="w-5 text-center" aria-hidden>
                                        {words.ratingFaces[value - 1]}
                                    </span>
                                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                                        <span className={`block h-full rounded-full ${value >= 4 ? "nt-sunset" : value === 3 ? "bg-text-2/40" : "bg-[#d9572b]/50"}`} style={{ width: `${(summary.spread[value - 1] / top) * 100}%` }} />
                                    </span>
                                    <span className="w-5 text-right font-semibold tabular-nums">{summary.spread[value - 1]}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    {summary.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {summary.tags.map(({ tag, count }) => (
                                <span key={tag} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-[0.75rem] font-semibold">
                                    {words.tags[tag as keyof typeof words.tags]}
                                    <span className="text-muted tabular-nums">{count}</span>
                                </span>
                            ))}
                        </div>
                    )}
                    {summary.facts?.length > 0 && (
                        <div className="mt-4">
                            <p className="mb-2 text-[0.75rem] font-semibold tracking-[0.12em] text-muted uppercase">{words.reviews.saidFacts}</p>
                            <div className="flex flex-wrap gap-2">
                                {summary.facts.map(({ tag, count }) => (
                                    <span key={tag} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#15110e] px-3 text-[0.75rem] font-semibold text-white">
                                        {words.tags[tag as keyof typeof words.tags]}
                                        <span className="text-white/60 tabular-nums">{count}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {summary.price && <p className="mt-4 text-[0.875rem] leading-relaxed font-semibold">{fill(words.reviews.priceSaid, { count: summary.price.count, price: formatPrice(summary.price.median, locale) })}</p>}
                </div>
            ) : (
                <p className="max-w-2xl text-[1rem] leading-relaxed text-text-2">{words.reviews.empty}</p>
            )}

            <button type="button" onClick={() => withMe("review", () => setWriting(true))} className="nt-btn nt-btn-primary mt-4 w-full sm:w-auto">
                <Pencil size={16} />
                {data.mine ? words.reviews.edit : words.reviews.write}
            </button>

            {list.length > 3 && (
                <div className="mt-6 flex gap-2">
                    {(["recent", "useful"] as const).map((key) => (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={sort === key}
                            onClick={() => {
                                setSort(key);
                                if (!me) load(key);
                            }}
                            className="nt-chip h-9 text-[0.875rem]"
                        >
                            {key === "recent" ? words.reviews.sortRecent : words.reviews.sortUseful}
                        </button>
                    ))}
                </div>
            )}

            {shown.length > 0 && (
                <ul className="mt-4 flex flex-col gap-3">
                    {shown.map((review) => (
                        <ReviewCard key={review.id} review={review} onVote={vote} onEdit={() => setWriting(true)} onDelete={remove} />
                    ))}
                </ul>
            )}
            {!all && list.length > SHOWN && (
                <button type="button" onClick={() => setAll(true)} className="nt-btn nt-btn-soft mt-3 w-full">
                    {words.reviews.more} · {list.length - SHOWN}
                </button>
            )}

            {writing && (
                <Composer
                    slug={slug}
                    mine={data.mine}
                    open={writing}
                    onClose={() => setWriting(false)}
                    onSaved={(next) => {
                        setData(next);
                        toast(next.mine?.pending ? words.reviews.pending : words.reviews.thanks);
                    }}
                />
            )}
        </div>
    );
}
