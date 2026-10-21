"use client";

import Link from "next/link";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { AlertCircle, Check, CheckCheck, Clock, MapPin, Reply } from "lucide-react";
import { useRef } from "react";
import { cityBySlug } from "@/lib/cities";
import { fill, type Locale } from "@/lib/i18n";
import type { PeopleWords } from "@/lib/i18n/people";
import { paths } from "@/lib/places/paths";
import type { ChatMessage } from "@/lib/people/types";
import { previewOf, timeOf } from "./format";
import Voice from "./Voice";

// One message, as on WhatsApp: green on the right for one's own, white on
// the left for the other's, the time and the ticks in the corner.

type Words = PeopleWords["chat"];
// `canTakeBack` is worked out when the menu opens (24 hours after sending).
export type Shown = ChatMessage & { failed?: boolean; canTakeBack?: boolean };

// ✓ sent · ✓✓ grey: they were on the site since · ✓✓ blue: read.
function Ticks({ message, theirRead, theirActive }: { message: Shown; theirRead: string | null; theirActive: string | null }) {
    if (message.failed) return <AlertCircle size={14} className="text-closed" />;
    if (message.pending) return <Clock size={13} className="opacity-60" />;
    if (theirRead && theirRead >= message.at) return <CheckCheck size={16} className="text-[#34b7f1]" />;
    if (theirActive && theirActive >= message.at) return <CheckCheck size={16} className="opacity-55" />;
    return <Check size={15} className="opacity-55" />;
}

// Links to NiceThings itself are clickable; any other address stays plain
// text, to copy if wanted (no tapping a stranger's link by mistake).
function Text({ body }: { body: string }) {
    const parts = body.split(/(https?:\/\/(?:www\.)?nicethings\.site\/\S*)/g);
    return (
        <>
            {parts.map((part, index) =>
                index % 2 ? (
                    <a key={index} href={part} className="break-all underline">
                        {part.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                ) : (
                    <span key={index}>{part}</span>
                )
            )}
        </>
    );
}

export default function Bubble({
    message,
    name,
    words,
    locale,
    theirRead,
    theirActive,
    onMenu,
    onPhoto,
    onAnswer,
    onRetry,
    onListened,
    onReply,
}: {
    message: Shown;
    name: string;
    words: Words;
    locale: Locale;
    theirRead: string | null;
    theirActive: string | null;
    onMenu: (message: Shown) => void;
    onPhoto: (url: string) => void;
    onAnswer: (message: Shown, answer: "yes" | "no") => void;
    onRetry: (message: Shown) => void;
    onListened: (message: Shown) => void;
    onReply: (message: Shown) => void;
}) {
    const mine = message.mine;
    const press = useRef(0);
    // Pulled to the right, as on WhatsApp: the arrow shows, and let go past
    // it, the message is quoted in the reply.
    const pull = useMotionValue(0);
    const arrow = useTransform(pull, [0, 64], [0, 1]);
    const armed = useRef(false);
    const canReply = !message.deleted && !message.pending && !message.failed;
    // A long press (or a right click) opens the reactions and the actions.
    const holding = {
        onPointerDown: () => {
            press.current = window.setTimeout(() => onMenu(message), 450);
        },
        onPointerUp: () => window.clearTimeout(press.current),
        onPointerLeave: () => window.clearTimeout(press.current),
        onPointerCancel: () => window.clearTimeout(press.current),
        onContextMenu: (event: React.MouseEvent) => {
            event.preventDefault();
            onMenu(message);
        },
    };

    const shell = `relative max-w-[82%] rounded-[1.1rem] px-3 pt-2 pb-1.5 text-[0.95rem] leading-snug shadow-[0_1px_1px_rgba(0,0,0,0.08)] select-none ${
        mine ? "self-end rounded-br-md bg-[#d9fdd3] text-[#111b21] dark:bg-[#144d37] dark:text-[#e9edef]" : "self-start rounded-bl-md bg-white text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef]"
    }`;

    const meta = (
        <span className="ml-2 inline-flex translate-y-1 items-center gap-1 float-right text-[0.7rem] opacity-60">
            {timeOf(message.at, locale)}
            {mine && <Ticks message={message} theirRead={theirRead} theirActive={theirActive} />}
        </span>
    );

    if (message.deleted) {
        return (
            <div className={shell} {...holding}>
                <span className="italic opacity-60">{mine ? words.deletedMine : words.deleted}</span>
                {meta}
            </div>
        );
    }

    return (
        <div className="relative">
            <motion.span style={{ opacity: arrow, scale: arrow }} className="pointer-events-none absolute top-1/2 left-1 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/10 dark:bg-white/15" aria-hidden>
                <Reply size={16} />
            </motion.span>
        <motion.div
            drag={canReply ? "x" : false}
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.55 }}
            dragSnapToOrigin
            style={{ x: pull, touchAction: "pan-y" }}
            onDragStart={() => window.clearTimeout(press.current)}
            onDrag={(_, info) => {
                if (info.offset.x > 64 && !armed.current) {
                    armed.current = true;
                    navigator.vibrate?.(15);
                }
            }}
            onDragEnd={(_, info) => {
                armed.current = false;
                if (info.offset.x > 64) onReply(message);
            }}
            className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
        >
            <div className={shell} {...holding} onClick={message.failed ? () => onRetry(message) : undefined}>
                {message.reply && (
                    <div className={`mb-1.5 rounded-lg border-l-4 px-2.5 py-1.5 text-[0.8rem] ${message.reply.mine ? "border-[#1faa59] bg-black/5" : "border-[#e8590c] bg-black/5"} dark:bg-white/5`}>
                        <span className={`block font-bold ${message.reply.mine ? "text-[#1faa59]" : "text-[#e8590c]"}`}>{message.reply.mine ? words.you : name}</span>
                        <span className="line-clamp-2 opacity-80">{message.reply.deleted ? words.deleted : previewOf(message.reply.kind, message.reply.body, words)}</span>
                    </div>
                )}

                {message.kind === "photo" && message.media && (
                    <button type="button" onClick={() => onPhoto(message.media!.url)} className="-mx-1.5 mb-1 block overflow-hidden rounded-[0.8rem]">
                        { }
                        <img
                            src={message.media.url}
                            alt=""
                            className="max-h-80 w-64 max-w-full object-cover"
                            style={message.media.width && message.media.height ? { aspectRatio: `${message.media.width} / ${message.media.height}` } : undefined}
                        />
                    </button>
                )}
                {message.kind === "photo" && !message.media && <span className="block h-40 w-56 animate-pulse rounded-[0.8rem] bg-black/10" />}

                {message.kind === "voice" &&
                    (message.media ? (
                        <Voice id={message.id} url={message.media.url} duration={message.media.duration} waveform={message.media.waveform} mine={mine} listened={Boolean(message.listened)} words={words} onListened={() => onListened(message)} />
                    ) : (
                        <span className="block w-56 py-3 text-[0.875rem] opacity-70">🎤 {words.sending}</span>
                    ))}

                {(message.kind === "place" || message.kind === "plan") && message.place && (
                    <Link href={paths.place(locale, message.place.slug)} className="-mx-1.5 mb-1.5 block w-64 max-w-full overflow-hidden rounded-[0.8rem] bg-black/5 dark:bg-white/5">
                        {message.place.cover && <img src={message.place.cover} alt="" className="h-32 w-full object-cover" loading="lazy" />}
                        <span className="block px-3 py-2">
                            <span className="block truncate font-bold">{message.place.name}</span>
                            <span className="flex items-center gap-1 truncate text-[0.8rem] opacity-70">
                                <MapPin size={12} />
                                {[message.place.neighborhood, cityBySlug(message.place.city)?.name ?? message.place.city].filter(Boolean).join(", ")}
                            </span>
                        </span>
                    </Link>
                )}

                {message.kind === "plan" && message.plan && (
                    <div className="mb-1 w-64 max-w-full">
                        <p className="font-bold">📅 {words.plan.title}</p>
                        <p className="text-[0.875rem] capitalize opacity-80">
                            {new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" }).format(new Date(message.plan.at))}
                        </p>
                        <ul className="mt-1.5 text-[0.8rem] opacity-85">
                            <li>{message.plan.mine === "yes" ? words.plan.youYes : message.plan.mine === "no" ? words.plan.youNo : ""}</li>
                            <li>{message.plan.theirs === "yes" ? fill(words.plan.theyYes, { name }) : message.plan.theirs === "no" ? fill(words.plan.theyNo, { name }) : fill(words.plan.waiting, { name })}</li>
                        </ul>
                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                            <button type="button" onClick={() => onAnswer(message, "yes")} aria-pressed={message.plan.mine === "yes"} className={`h-10 rounded-full text-[0.8rem] font-bold ${message.plan.mine === "yes" ? "bg-[#1faa59] text-white" : "bg-black/5 dark:bg-white/10"}`}>
                                {words.plan.yes}
                            </button>
                            <button type="button" onClick={() => onAnswer(message, "no")} aria-pressed={message.plan.mine === "no"} className={`h-10 rounded-full text-[0.8rem] font-bold ${message.plan.mine === "no" ? "bg-[#15110e] text-white dark:bg-white dark:text-[#15110e]" : "bg-black/5 dark:bg-white/10"}`}>
                                {words.plan.no}
                            </button>
                        </div>
                    </div>
                )}

                {message.body && (
                    <span className="break-words whitespace-pre-wrap">
                        <Text body={message.body} />
                    </span>
                )}
                {meta}
                {message.failed && <span className="mt-1 block text-[0.75rem] font-semibold text-closed">{words.sendFailed}</span>}
            </div>
            {message.reactions.length > 0 && (
                <button type="button" onClick={() => onMenu(message)} className={`-mt-1.5 inline-flex items-center gap-0.5 rounded-full border border-line bg-surface px-1.5 py-0.5 text-[0.8rem] shadow-sm ${mine ? "mr-2" : "ml-2"}`}>
                    {message.reactions.map((reaction) => (
                        <span key={reaction.emoji}>{reaction.emoji}</span>
                    ))}
                    {message.reactions.reduce((sum, reaction) => sum + reaction.count, 0) > 1 && <span className="ml-0.5 text-[0.7rem] text-muted">{message.reactions.reduce((sum, reaction) => sum + reaction.count, 0)}</span>}
                </button>
            )}
        </motion.div>
        </div>
    );
}
