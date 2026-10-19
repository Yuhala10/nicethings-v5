"use client";

import { Flag, MessageCircle, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fill } from "@/lib/i18n";
import { formatRelativeDays } from "@/lib/i18n/format";
import { call, useMe, withMe } from "@/lib/people/client";
import { MAX_COMMENT, MIN_COMMENT } from "@/lib/people/rules";
import type { CommentView } from "@/lib/people/types";
import type { Target } from "@/lib/people/talk";
import { visitorId } from "../site/Analytics";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";
import { Face, PersonLine } from "./Person";

// A conversation under something: each comment with the face, name and rank
// of who wrote it; a box to add one's own, signed with one's profile.
// `ids` are what is read (a guest's book gathers several notebooks);
// `postTo` is where a new comment goes.

export default function Talk({
    target,
    ids,
    postTo,
    initial,
    light = false,
    compact = false,
    autoFocus = false,
    onCount,
}: {
    target: Target;
    ids: string[];
    postTo: string;
    initial?: CommentView[] | null;
    light?: boolean;
    compact?: boolean;
    autoFocus?: boolean;
    onCount?: (count: number) => void;
}) {
    const { locale, t } = useLocale();
    const words = t.people;
    const toast = useToast();
    const { me } = useMe();
    const [comments, setComments] = useState<CommentView[]>(initial ?? []);
    const [loaded, setLoaded] = useState(initial !== undefined && initial !== null);
    const [body, setBody] = useState("");
    const [busy, setBusy] = useState(false);
    const [trouble, setTrouble] = useState<string | null>(null);
    const box = useRef<HTMLTextAreaElement>(null);
    const key = ids.join(",");

    // The version that knows who is reading (their words waiting to be read
    // show to them), fetched once it is needed.
    useEffect(() => {
        let gone = false;
        if (initial && !me) return;
        call<{ comments: CommentView[] }>(`/api/talk?target=${target}&id=${key}`, "GET").then((answer) => {
            if (gone || answer.ok === false) return setLoaded(true);
            setComments(answer.comments);
            setLoaded(true);
        });
        return () => {
            gone = true;
        };
        // Read again when the person signs in or out.
    }, [target, key, me?.id]);

    useEffect(() => {
        onCount?.(comments.filter((comment) => !comment.pending).length);
    }, [comments, onCount]);

    const send = async (event: React.FormEvent) => {
        event.preventDefault();
        setTrouble(null);
        if (body.trim().length < MIN_COMMENT) return setTrouble(words.talk.short);
        setBusy(true);
        const answer = await call<{ comments: CommentView[] }>("/api/talk", "POST", { target, id: postTo, body });
        setBusy(false);
        if (answer.ok === false) {
            if (answer.why === "signin") return withMe("comment", () => box.current?.focus());
            return setTrouble(answer.why === "many" ? words.common.many : answer.why === "closed" ? words.common.closed : answer.why === "short" ? words.talk.short : words.common.failed);
        }
        setBody("");
        // The answer holds the conversation of `postTo`; a guest's book reads
        // several notebooks, so it is read again whole.
        if (ids.length === 1) return setComments(answer.comments);
        const all = await call<{ comments: CommentView[] }>(`/api/talk?target=${target}&id=${key}`, "GET");
        if (all.ok === true) setComments(all.comments);
    };

    const remove = async (comment: CommentView) => {
        setComments((list) => list.filter((item) => item.id !== comment.id));
        await call(`/api/talk?id=${comment.id}`, "DELETE");
    };

    const report = async (comment: CommentView) => {
        await call("/api/flags", "POST", { kind: "comment", id: comment.id, v: visitorId() });
        toast(words.reviews.reported);
    };

    const muted = light ? "text-white/60" : "text-muted";

    return (
        <div>
            {loaded && comments.length === 0 && !compact && <p className={`text-[0.875rem] ${muted}`}>{words.talk.empty}</p>}
            {comments.length > 0 && (
                <ul className={`flex flex-col ${compact ? "gap-4" : "gap-3"}`}>
                    {comments.map((comment) => (
                        <li key={comment.id} className={compact ? "" : `rounded-[1.25rem] border p-4 ${light ? "border-white/10 bg-white/5" : "border-line bg-surface"}`}>
                            <PersonLine person={comment.person} locale={locale} meta={formatRelativeDays(comment.createdAt, locale)} size={compact ? 32 : 40} light={light} />
                            <p className={`mt-2 text-[0.875rem] leading-[1.65] whitespace-pre-line ${light ? "text-white/90" : "text-text-2"} ${compact ? "pl-11" : ""}`}>{comment.body}</p>
                            {comment.pending && <p className={`mt-1.5 text-[0.75rem] font-semibold ${compact ? "pl-11" : ""} text-[#b7791f]`}>{words.talk.pending}</p>}
                            <div className={`mt-1 flex gap-4 text-[0.75rem] font-semibold ${muted} ${compact ? "pl-11" : ""}`}>
                                {comment.mine ? (
                                    <button type="button" onClick={() => remove(comment)} className="nt-tap inline-flex items-center gap-1 hover:underline">
                                        <Trash2 size={12} />
                                        {words.talk.delete}
                                    </button>
                                ) : (
                                    <button type="button" onClick={() => report(comment)} className="nt-tap inline-flex items-center gap-1 hover:underline">
                                        <Flag size={12} />
                                        {words.talk.report}
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {me ? (
                <form onSubmit={send} className={`mt-4 flex items-end gap-2.5 ${compact ? "" : `rounded-[1.25rem] border p-3 ${light ? "border-white/10 bg-white/5" : "border-line bg-surface"}`}`}>
                    <Face person={me} size={34} className="mb-1" />
                    <label className="sr-only" htmlFor={`talk-${postTo}`}>
                        {words.talk.placeholder}
                    </label>
                    <textarea
                        ref={box}
                        id={`talk-${postTo}`}
                        value={body}
                        autoFocus={autoFocus}
                        onChange={(event) => setBody(event.target.value.slice(0, MAX_COMMENT))}
                        placeholder={target === "review" ? words.talk.replyPlaceholder : words.talk.placeholder}
                        rows={1}
                        disabled={busy}
                        onInput={(event) => {
                            const field = event.currentTarget;
                            field.style.height = "auto";
                            field.style.height = `${Math.min(field.scrollHeight, 160)}px`;
                        }}
                        className={`min-h-11 flex-1 resize-none rounded-[0.9rem] border px-3.5 py-2.5 text-[1rem] leading-snug outline-none ${light ? "border-white/15 bg-white/10 text-white placeholder:text-white/50 focus:border-white/40" : "border-line-strong bg-surface text-text focus:border-text-2"}`}
                    />
                    <button type="submit" disabled={busy || body.trim().length < MIN_COMMENT} aria-label={words.talk.send} className="nt-btn nt-btn-primary h-11 w-11 shrink-0 !px-0 disabled:opacity-40">
                        <Send size={17} />
                    </button>
                </form>
            ) : (
                <button
                    type="button"
                    onClick={() => withMe("comment", () => {})}
                    className={`mt-4 flex w-full items-center gap-3 rounded-[1.25rem] border border-dashed px-4 py-3.5 text-left text-[0.875rem] font-semibold transition ${light ? "border-white/20 text-white hover:border-white/50" : "border-line-strong hover:border-text-2"}`}
                >
                    <MessageCircle size={18} className="shrink-0 text-brand-500" />
                    <span className="flex-1">{words.talk.join}</span>
                </button>
            )}
            {me && !compact && <p className={`mt-2 text-[0.75rem] ${muted}`}>{fill(words.talk.as, { handle: me.handle })}</p>}
            {trouble && (
                <p role="alert" className="mt-2 text-[0.875rem] font-semibold text-closed">
                    {trouble}
                </p>
            )}
        </div>
    );
}
