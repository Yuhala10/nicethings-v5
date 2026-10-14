"use client";

import { Check, MessageCircle } from "lucide-react";
import { useState } from "react";
import { MAX_COMMENT, MAX_NAME, MIN_COMMENT } from "@/lib/blog/comment-rules";
import { fill } from "@/lib/i18n";
import { visitorId } from "../site/Analytics";
import { useLocale } from "../site/LocaleProvider";

// Under an article: what readers think, and a place to say it. A comment
// is read by the team before it shows, and the form says so. A guest's page
// uses it as their guest book, with its own words (`words`).

export type ShownComment = { id: string; name: string | null; body: string; date: string };

type Words = { eyebrow?: string; title: string; lead: string; empty: string };

export default function Comments({ postId, comments, words }: { postId: string; comments: ShownComment[]; words?: Words }) {
    const { t } = useLocale();
    const [name, setName] = useState("");
    const [body, setBody] = useState("");
    const [trap, setTrap] = useState("");
    const [state, setState] = useState<"idle" | "sending" | "done">("idle");
    const [trouble, setTrouble] = useState<"tooShort" | "tooMany" | "failed" | null>(null);

    const send = async (event: React.FormEvent) => {
        event.preventDefault();
        setTrouble(null);
        if (body.trim().length < MIN_COMMENT) {
            setTrouble("tooShort");
            return;
        }
        setState("sending");
        try {
            const response = await fetch("/api/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ post: postId, v: visitorId(), name: name.trim() || null, body, website: trap }),
            });
            const answer = (await response.json().catch(() => ({}))) as { ok?: boolean; why?: string };
            if (!response.ok || !answer.ok) throw new Error(answer.why === "many" ? "tooMany" : answer.why === "short" ? "tooShort" : "failed");
            setBody("");
            setState("done");
        } catch (caught) {
            const why = (caught as Error).message;
            setTrouble(why === "tooMany" || why === "tooShort" ? why : "failed");
            setState("idle");
        }
    };

    return (
        <div>
            <p className="nt-eyebrow flex items-center gap-2">
                <MessageCircle size={14} />
                {comments.length ? fill(comments.length === 1 ? t.comments.countOne : t.comments.countMany, { count: comments.length }) : (words?.eyebrow ?? t.comments.eyebrow)}
            </p>
            <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.05] md:text-[2.75rem]">{words?.title ?? t.comments.title}</h2>
            <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-text-2">{comments.length ? (words?.lead ?? t.comments.lead) : (words?.empty ?? t.comments.empty)}</p>

            {comments.length > 0 && (
                <ul className="mt-7 flex flex-col gap-3">
                    {comments.map((comment) => (
                        <li key={comment.id} className="rounded-[1.25rem] border border-line bg-surface p-5">
                            <div className="flex items-center gap-3">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-[1rem] font-bold text-text-2 uppercase" aria-hidden>
                                    {(comment.name ?? t.comments.anonymous).trim().charAt(0)}
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-[1rem] font-semibold">{comment.name ?? t.comments.anonymous}</span>
                                    <span className="block text-[0.75rem] text-muted">{comment.date}</span>
                                </span>
                            </div>
                            <p className="mt-3 text-[1rem] leading-[1.7] whitespace-pre-line text-text-2">{comment.body}</p>
                        </li>
                    ))}
                </ul>
            )}

            {state === "done" ? (
                <p className="mt-7 flex items-start gap-2 rounded-[1rem] bg-surface-2 px-4 py-3.5 text-[0.875rem] font-semibold">
                    <Check size={16} className="mt-0.5 shrink-0 text-open" />
                    <span>
                        {t.comments.done}{" "}
                        <button type="button" onClick={() => setState("idle")} className="underline underline-offset-4">
                            {t.comments.another}
                        </button>
                    </span>
                </p>
            ) : (
                <form onSubmit={send} className="mt-7 rounded-[1.25rem] border border-line bg-surface p-4 md:p-5">
                    <label className="sr-only" htmlFor="comment-body">
                        {t.comments.body}
                    </label>
                    <textarea
                        id="comment-body"
                        value={body}
                        onChange={(event) => setBody(event.target.value.slice(0, MAX_COMMENT))}
                        placeholder={t.comments.body}
                        rows={4}
                        disabled={state === "sending"}
                        className="w-full resize-none rounded-[0.9rem] border border-line-strong bg-surface px-3.5 py-3 text-[1rem] leading-relaxed text-text outline-none focus:border-text-2"
                    />
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                        <label className="sr-only" htmlFor="comment-name">
                            {t.comments.name}
                        </label>
                        <input
                            id="comment-name"
                            value={name}
                            onChange={(event) => setName(event.target.value.slice(0, MAX_NAME))}
                            placeholder={t.comments.name}
                            autoComplete="given-name"
                            disabled={state === "sending"}
                            className="nt-input sm:flex-1"
                        />
                        {/* Left empty by people; filled by robots. */}
                        <input value={trap} onChange={(event) => setTrap(event.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
                        <button type="submit" disabled={state === "sending"} className="nt-btn nt-btn-primary sm:w-auto">
                            {state === "sending" ? t.comments.sending : t.comments.send}
                        </button>
                    </div>
                    <p className="mt-3 text-[0.75rem] leading-relaxed text-muted">{t.comments.note}</p>
                    {trouble && (
                        <p role="alert" className="mt-2 text-[0.875rem] font-semibold text-closed">
                            {t.comments[trouble]}
                        </p>
                    )}
                </form>
            )}
        </div>
    );
}
