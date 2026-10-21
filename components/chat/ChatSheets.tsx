"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Archive, Ban, BellOff, BellRing, Copy, Eraser, Flag, MapPin, Pin, Reply, Search, Trash2, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { PeopleWords } from "@/lib/i18n/people";
import type { ChatThread } from "@/lib/people/types";
import Sheet from "../people/Sheet";
import type { Shown } from "./Bubble";

type Words = PeopleWords["chat"];
const REACTIONS = ["❤️", "😂", "🔥", "👍", "😮", "🙏"];

function Row({ icon: Icon, label, onClick, danger = false }: { icon: typeof Reply; label: string; onClick: () => void; danger?: boolean }) {
    return (
        <button type="button" onClick={onClick} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left text-[1rem] font-semibold hover:bg-surface-2 ${danger ? "text-closed" : ""}`}>
            <Icon size={19} />
            {label}
        </button>
    );
}

// Long press on a message: a reaction, or what can be done with it.
export function MessageMenu({
    message,
    words,
    closeLabel,
    onClose,
    onReact,
    onReply,
    onDelete,
    onReport,
    onCopied,
}: {
    message: Shown | null;
    words: Words;
    closeLabel: string;
    onClose: () => void;
    onReact: (message: Shown, emoji: string | null) => void;
    onReply: (message: Shown) => void;
    onDelete: (message: Shown) => void;
    onReport: (message: Shown) => void;
    onCopied: () => void;
}) {
    const mineReaction = message?.reactions.find((reaction) => reaction.mine)?.emoji ?? null;
    return (
        <Sheet open={Boolean(message)} onClose={onClose} closeLabel={closeLabel}>
            {message && (
                <div className="flex flex-col gap-1 pb-2">
                    {!message.deleted && !message.pending && (
                        <div className="mb-2 flex justify-between rounded-full bg-surface-2 p-1.5">
                            {REACTIONS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => onReact(message, mineReaction === emoji ? null : emoji)}
                                    aria-pressed={mineReaction === emoji}
                                    className={`grid h-11 w-11 place-items-center rounded-full text-[1.5rem] transition active:scale-90 ${mineReaction === emoji ? "bg-surface shadow" : ""}`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                    {!message.deleted && !message.pending && <Row icon={Reply} label={words.reply} onClick={() => onReply(message)} />}
                    {message.body && !message.deleted && (
                        <Row
                            icon={Copy}
                            label={words.copy}
                            onClick={() => {
                                navigator.clipboard?.writeText(message.body ?? "").catch(() => {});
                                onCopied();
                            }}
                        />
                    )}
                    {message.mine && !message.deleted && !message.pending && message.canTakeBack && <Row icon={Trash2} label={words.delete} onClick={() => onDelete(message)} danger />}
                    {!message.mine && !message.deleted && <Row icon={Flag} label={words.report} onClick={() => onReport(message)} danger />}
                </div>
            )}
        </Sheet>
    );
}

// The ⋮ of a conversation.
export function ChatMenu({
    open,
    thread,
    words,
    closeLabel,
    onClose,
    onAction,
    onProfile,
}: {
    open: boolean;
    thread: ChatThread | null;
    words: Words;
    closeLabel: string;
    onClose: () => void;
    onAction: (action: string) => void;
    onProfile: () => void;
}) {
    const chat = thread?.chat;
    return (
        <Sheet open={open} onClose={onClose} closeLabel={closeLabel}>
            <div className="flex flex-col gap-1 pb-2">
                <Row icon={UserRound} label={words.menu.profile} onClick={onProfile} />
                {chat && <Row icon={chat.muted ? BellRing : BellOff} label={chat.muted ? words.menu.unmute : words.menu.mute} onClick={() => onAction(chat.muted ? "unmute" : "mute")} />}
                {chat && <Row icon={Pin} label={chat.pinned ? words.menu.unpin : words.menu.pin} onClick={() => onAction(chat.pinned ? "unpin" : "pin")} />}
                {chat && <Row icon={Archive} label={chat.archived ? words.menu.unarchive : words.menu.archive} onClick={() => onAction(chat.archived ? "unarchive" : "archive")} />}
                {chat && <Row icon={Eraser} label={words.menu.clear} onClick={() => onAction("clear")} />}
                <Row icon={Ban} label={thread?.blocked ? words.menu.unblock : words.menu.block} onClick={() => onAction(thread?.blocked ? "unblock" : "block")} danger={!thread?.blocked} />
            </div>
        </Sheet>
    );
}

type Choice = { slug: string; name: string; neighborhood: string | null; city?: string; cover?: string | null };

// A place to share, searched by name.
export function PlacePicker({ open, title, words, closeLabel, onClose, onPick }: { open: boolean; title: string; words: Words; closeLabel: string; onClose: () => void; onPick: (place: Choice) => void }) {
    const [query, setQuery] = useState("");
    const [found, setFound] = useState<Choice[]>([]);
    useEffect(() => {
        if (query.trim().length < 2) return;
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                const answer = (await (await fetch(`/api/places?q=${encodeURIComponent(query)}`, { signal: controller.signal })).json()) as { places?: Choice[] };
                setFound(answer.places ?? []);
            } catch {}
        }, 250);
        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [query]);
    return (
        <Sheet open={open} onClose={onClose} title={title} closeLabel={closeLabel}>
            <label className="flex h-12 items-center gap-2 rounded-2xl border border-line-strong bg-surface px-3">
                <Search size={18} className="text-muted" />
                <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={words.place.search} className="min-w-0 flex-1 bg-transparent text-[1rem] outline-none" />
            </label>
            <ul className="mt-3 flex flex-col gap-1">
                {query.trim().length >= 2 && found.length === 0 && <li className="px-2 py-3 text-muted">{words.place.none}</li>}
                {found.map((place) => (
                    <li key={place.slug}>
                        <button type="button" onClick={() => onPick(place)} className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2">
                            {place.cover ? (
                                <img src={place.cover} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                            ) : (
                                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface-2">
                                    <MapPin size={18} />
                                </span>
                            )}
                            <span className="min-w-0">
                                <span className="block truncate font-semibold">{place.name}</span>
                                <span className="block truncate text-[0.8rem] text-muted">{[place.neighborhood, place.city].filter(Boolean).join(", ")}</span>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </Sheet>
    );
}

// "On y va ?": a place and a time.
export function PlanSheet({ open, words, closeLabel, onClose, onSend }: { open: boolean; words: Words; closeLabel: string; onClose: () => void; onSend: (place: Choice, at: string) => void }) {
    const [place, setPlace] = useState<Choice | null>(null);
    const [picking, setPicking] = useState(false);
    const [when, setWhen] = useState("");
    const [trouble, setTrouble] = useState<string | null>(null);
    useEffect(() => {
        if (!open) return;
        setPlace(null);
        setWhen("");
        setTrouble(null);
    }, [open]);
    return (
        <>
            <Sheet open={open && !picking} onClose={onClose} title={words.plan.title} closeLabel={closeLabel}>
                <p className="text-text-2">{words.plan.lead}</p>
                <p className="mt-4 text-[0.875rem] font-semibold">{words.plan.where}</p>
                <button type="button" onClick={() => setPicking(true)} className="mt-1.5 flex min-h-12 w-full items-center gap-2 rounded-2xl border border-line-strong bg-surface px-3 text-left">
                    <MapPin size={18} className="text-brand-600" />
                    <span className={`min-w-0 flex-1 truncate ${place ? "font-semibold" : "text-muted"}`}>{place ? place.name : words.place.search}</span>
                    {place && <X size={16} className="text-muted" onClick={(event) => (event.stopPropagation(), setPlace(null))} />}
                </button>
                <p className="mt-4 text-[0.875rem] font-semibold">{words.plan.when}</p>
                <input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} className="mt-1.5 h-12 w-full rounded-2xl border border-line-strong bg-surface px-3 text-[1rem]" />
                {trouble && <p className="mt-3 text-[0.875rem] font-semibold text-closed">{trouble}</p>}
                <button
                    type="button"
                    onClick={() => {
                        if (!place) return setTrouble(words.plan.pickPlace);
                        // The time is read as Douala time, whatever the phone's zone.
                        const at = when ? new Date(`${when}:00+01:00`) : null;
                        if (!at || Number.isNaN(at.getTime())) return setTrouble(words.plan.pickWhen);
                        onSend(place, at.toISOString());
                    }}
                    className="nt-btn nt-btn-dark mt-5 w-full"
                >
                    {words.plan.send}
                </button>
            </Sheet>
            <PlacePicker
                open={open && picking}
                title={words.plan.where}
                words={words}
                closeLabel={closeLabel}
                onClose={() => setPicking(false)}
                onPick={(choice) => {
                    setPlace(choice);
                    setPicking(false);
                }}
            />
        </>
    );
}

// A photo of the conversation, on the whole screen.
export function PhotoViewer({ url, closeLabel, onClose }: { url: string | null; closeLabel: string; onClose: () => void }) {
    return (
        <AnimatePresence>
            {url && (
                <motion.div className="fixed inset-0 z-[95] grid place-items-center bg-black/95" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
                    <img src={url} alt="" className="max-h-full max-w-full object-contain" />
                    <button type="button" onClick={onClose} aria-label={closeLabel} className="absolute top-[max(env(safe-area-inset-top),1rem)] right-4 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white">
                        <X size={20} />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
