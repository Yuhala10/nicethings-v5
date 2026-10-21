"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, MoreVertical } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { compressImage } from "@/lib/compress-image";
import { fill } from "@/lib/i18n";
import { put } from "@/lib/media-upload";
import { paths } from "@/lib/places/paths";
import { call, openAuth, useMe } from "@/lib/people/client";
import { markSeen, refreshInbox } from "@/lib/people/inbox";
import { listen, type Listening } from "@/lib/people/realtime";
import type { ChatMessage, ChatThread } from "@/lib/people/types";
import { Face, VerifiedBadge, displayName } from "../people/Person";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";
import Bubble, { type Shown } from "./Bubble";
import { ChatMenu, MessageMenu, PhotoViewer, PlacePicker, PlanSheet } from "./ChatSheets";
import Composer from "./Composer";
import { dayLabel, isSameDay, presenceText } from "./format";

// A conversation with one member, as on WhatsApp: the messages arrive by
// themselves (an instant signal tells the phone to look; without it, the
// phone asks every few seconds), "écrit…" while they type, the ticks turn
// blue when they have read, la flamme counts the days in a row.

const REQUEST_MESSAGES = 3;
let localCount = 0;
const byTime = (a: Shown, b: Shown) => a.at.localeCompare(b.at);
type Meta = Omit<ChatThread, "messages" | "more">;
type Sent = { message: ChatMessage; chat: { id: string; key: string }; upload: { path: string; token: string } | null };

export default function ChatView({ handle }: { handle: string }) {
    const { locale, t } = useLocale();
    const words = t.people.chat;
    const toast = useToast();
    const router = useRouter();
    const { me, ready } = useMe();
    const [meta, setMeta] = useState<Meta | null>(null);
    const [messages, setMessages] = useState<Shown[]>([]);
    const [state, setState] = useState<"loading" | "ready" | "missing" | "closed">("loading");
    const [more, setMore] = useState(false);
    const [theyAreTyping, setTheyAreTyping] = useState(false);
    const [live, setLive] = useState(false);
    const [reply, setReply] = useState<Shown | null>(null);
    const [menuFor, setMenuFor] = useState<Shown | null>(null);
    const [chatMenu, setChatMenu] = useState(false);
    const [picking, setPicking] = useState(false);
    const [planning, setPlanning] = useState(false);
    const [photo, setPhoto] = useState<string | null>(null);
    const list = useRef<HTMLDivElement>(null);
    const stick = useRef(true);
    const since = useRef<string | null>(null);
    const line = useRef<Listening | null>(null);
    const typedAt = useRef(0);
    const retries = useRef(new Map<string, () => void>());
    const typingTimer = useRef(0);

    // "écrit…" for a few seconds after each signal of their typing.
    const theyType = useCallback(() => {
        setTheyAreTyping(true);
        window.clearTimeout(typingTimer.current);
        typingTimer.current = window.setTimeout(() => setTheyAreTyping(false), 4500);
    }, []);

    const name = meta ? displayName(meta.person) : `@${handle}`;
    const visible = () => document.visibilityState === "visible";

    // New and changed messages in; `advance` moves the "since" mark (only
    // for what was asked as "since", so nothing in between is skipped).
    const merge = useCallback((incoming: ChatMessage[], advance: boolean) => {
        if (!incoming.length) return;
        setMessages((current) => {
            const kept = new Map(current.map((message) => [message.id, message]));
            for (const message of incoming) kept.set(message.id, message);
            return [...kept.values()].sort(byTime);
        });
        if (advance) for (const message of incoming) if (!since.current || message.changedAt > since.current) since.current = message.changedAt;
        if (incoming.some((message) => !message.mine)) setTheyAreTyping(false);
    }, []);

    const ask = useCallback(
        async (extra: string) => {
            const response = await fetch(`/api/chats/thread?handle=${encodeURIComponent(handle)}${extra}${visible() ? "&read=1" : ""}`, { cache: "no-store" });
            return (await response.json()) as (ChatThread & { ok: true }) | { ok: false; why: string };
        },
        [handle]
    );

    const load = useCallback(async () => {
        try {
            const answer = await ask("");
            if (answer.ok === false) return setState(answer.why === "closed" ? "closed" : answer.why === "signin" ? "loading" : "missing");
            const { messages: first, more: older, ...rest } = answer;
            setMeta(rest);
            setMessages((current) => [...first, ...current.filter((message) => message.id.startsWith("local-"))].sort(byTime));
            since.current = first.reduce<string | null>((max, message) => (!max || message.changedAt > max ? message.changedAt : max), null);
            setMore(older);
            setState("ready");
            if (rest.chat && visible()) markSeen(rest.chat.id);
            refreshInbox();
            // The phone keeps the conversation, to open it at once next time.
            try {
                if (me) localStorage.setItem(`nt_chat:${me.id}:${handle}`, JSON.stringify({ meta: rest, messages: first.slice(-40), more: older }));
            } catch {}
        } catch {}
    }, [ask, me, handle]);

    const catchUp = useCallback(async () => {
        if (!since.current) return load();
        try {
            const answer = await ask(`&since=${encodeURIComponent(since.current)}`);
            if (answer.ok === false) return;
            const { messages: changed, more: _more, ...rest } = answer;
            void _more;
            setMeta(rest);
            merge(changed, true);
            if (changed.some((message) => !message.mine)) {
                if (rest.chat && visible()) markSeen(rest.chat.id);
                refreshInbox();
            }
        } catch {}
    }, [ask, load, merge]);

    useEffect(() => {
        if (!me) return;
        if (me.handle === handle) {
            router.replace(paths.messages(locale));
            return;
        }
        // What the phone kept, at once; then what is new.
        try {
            const kept = JSON.parse(localStorage.getItem(`nt_chat:${me.id}:${handle}`) ?? "null") as { meta: Meta; messages: ChatMessage[]; more: boolean } | null;
            if (kept?.meta) {
                setMeta(kept.meta);
                setMessages(kept.messages);
                setMore(kept.more);
                setState("ready");
            }
        } catch {}
        load();
    }, [me, handle, load, router, locale]);

    // The instant signal, and "écrit…".
    const key = meta?.chat?.key;
    useEffect(() => {
        if (!key || !me) return;
        const listening = listen(key, { m: catchUp, r: catchUp, typing: (payload) => payload.by !== me.id && theyType() }, setLive);
        line.current = listening;
        return () => {
            listening.stop();
            line.current = null;
            setLive(false);
        };
    }, [key, me, catchUp, theyType]);

    // Without the signal, ask often; with it, now and then (for "en ligne").
    useEffect(() => {
        if (state !== "ready") return;
        const timer = window.setInterval(() => visible() && catchUp(), live ? 25_000 : 4_000);
        const onVisible = () => visible() && catchUp();
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [state, live, catchUp]);

    // Stays at the bottom, unless one scrolled up to read.
    useLayoutEffect(() => {
        const element = list.current;
        if (element && stick.current) element.scrollTop = element.scrollHeight;
    }, [messages, state]);

    const older = async () => {
        const first = messages.find((message) => !message.id.startsWith("local-"));
        const element = list.current;
        if (!first || !element) return;
        const height = element.scrollHeight;
        stick.current = false;
        try {
            const answer = await ask(`&before=${encodeURIComponent(first.at)}`);
            if (answer.ok === false) return;
            merge(answer.messages, false);
            setMore(answer.more);
            requestAnimationFrame(() => {
                element.scrollTop += element.scrollHeight - height;
            });
        } catch {}
    };

    // ---------------------------------------------------------------- sending

    const addLocal = (partial: Partial<Shown> & Pick<Shown, "kind">) => {
        const local: Shown = {
            id: `local-${++localCount}`,
            mine: true,
            body: null,
            media: null,
            place: null,
            plan: null,
            reply: reply ? { id: reply.id, mine: reply.mine, kind: reply.kind, body: reply.body, deleted: reply.deleted } : null,
            reactions: [],
            deleted: false,
            pending: true,
            at: new Date().toISOString(),
            changedAt: "",
            ...partial,
        };
        stick.current = true;
        setMessages((current) => [...current, local]);
        setReply(null);
        return local;
    };

    const settle = (localId: string, real: ChatMessage | null) => {
        if (real) {
            retries.current.delete(localId);
            setMessages((current) => [...current.filter((message) => message.id !== localId && message.id !== real.id), real].sort(byTime));
        } else {
            setMessages((current) => current.map((message) => (message.id === localId ? { ...message, failed: true } : message)));
        }
    };

    const refused = (why: string) => {
        const reasons: Record<string, string> = { many: words.errors.many, heavy: words.errors.heavy, long: words.errors.long, closed: words.errors.closed, "request-media": words.request.media };
        if (reasons[why]) toast(reasons[why]);
        if (["blocked", "unavailable", "closed", "following", "limit"].includes(why)) load();
    };

    // Sends; a photo or a voice note sends its file, then goes out.
    const send = async (local: Shown, payload: Record<string, unknown>, file?: Blob) => {
        const attempt = async () => {
            setMessages((current) => current.map((message) => (message.id === local.id ? { ...message, failed: false } : message)));
            const answer = await call<Sent>("/api/chats/messages", "POST", { to: handle, reply: local.reply?.id, ...payload });
            if (answer.ok === false) {
                refused(answer.why);
                return settle(local.id, null);
            }
            let message = answer.message;
            if (file && answer.upload) {
                try {
                    await put(answer.upload.path, answer.upload.token, file, file.type, undefined, "chats");
                    const out = await call<{ message: ChatMessage }>("/api/chats/messages", "PATCH", { id: message.id, action: "sent" });
                    if (out.ok === false) return settle(local.id, null);
                    message = out.message;
                } catch {
                    return settle(local.id, null);
                }
            }
            settle(local.id, message);
            if (!meta?.chat) load();
        };
        retries.current.set(local.id, attempt);
        await attempt();
    };

    const sendText = (text: string) => send(addLocal({ kind: "text", body: text }), { kind: "text", body: text });

    const sendPhoto = async (raw: File) => {
        const file = await compressImage(raw, 1600);
        let width = 0;
        let height = 0;
        try {
            const bitmap = await createImageBitmap(file);
            width = bitmap.width;
            height = bitmap.height;
        } catch {}
        const local = addLocal({ kind: "photo", media: { url: URL.createObjectURL(file), width, height, duration: null } });
        await send(local, { kind: "photo", media: { type: file.type, size: file.size, width, height } }, file);
    };

    const sendVoice = (voice: Blob, seconds: number, waveform: number[]) =>
        send(addLocal({ kind: "voice", media: { url: URL.createObjectURL(voice), width: null, height: null, duration: seconds, waveform } }), { kind: "voice", media: { type: voice.type, size: voice.size, duration: seconds, waveform } }, voice);

    const typing = () => {
        if (!me || Date.now() - typedAt.current < 2500) return;
        typedAt.current = Date.now();
        line.current?.send("typing", { by: me.id });
    };

    // ---------------------------------------------------------------- doing things

    const change = async (message: Shown, payload: Record<string, unknown>) => {
        const answer = await call<{ message: ChatMessage }>("/api/chats/messages", "PATCH", { id: message.id, ...payload });
        if (answer.ok === false) return toast(t.people.common.failed);
        merge([answer.message], false);
    };

    const chatAction = async (action: string) => {
        setChatMenu(false);
        if (!meta) return;
        if (action === "clear" && !window.confirm(words.menu.confirmClear)) return;
        if (action === "block" && !window.confirm(fill(words.menu.confirmBlock, { name }))) return;
        const body = action === "block" || action === "unblock" ? { handle, action } : { chat: meta.chat?.id, action };
        const answer = await call("/api/chats/actions", "POST", body);
        if (answer.ok === false) return toast(answer.why === "pinned" ? words.menu.pinned : t.people.common.failed);
        if (action === "decline") return router.push(paths.messages(locale));
        if (action === "clear") {
            setMessages([]);
            since.current = null;
        }
        load();
    };

    // ---------------------------------------------------------------- the screen

    if (ready && !me) {
        return (
            <div className="grid h-dvh place-items-center p-6 text-center">
                <div>
                    <p className="nt-serif text-[1.75rem]">{words.title}</p>
                    <button type="button" onClick={() => openAuth("generic")} className="nt-btn nt-btn-dark mt-4">
                        {t.people.join.create}
                    </button>
                </div>
            </div>
        );
    }

    const write = meta?.write;
    const request = meta?.chat?.request ?? null;
    const typingNow = theyAreTyping;

    return (
        <div className="flex h-dvh flex-col bg-[#efe7dc] dark:bg-[#0e0c0a]">
            <header className="flex shrink-0 items-center gap-2 border-b border-line bg-bg/95 px-2 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2 backdrop-blur">
                <Link href={paths.messages(locale)} aria-label={words.back} className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-surface-2">
                    <ArrowLeft size={22} />
                </Link>
                {meta ? (
                    <Link href={paths.person(locale, meta.person.handle)} className="flex min-w-0 flex-1 items-center gap-2.5">
                        <span className="relative shrink-0">
                            <Face person={meta.person} size={42} />
                            {meta.presence.online && <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-bg bg-[#25d366]" />}
                        </span>
                        <span className="min-w-0">
                            <span className="flex items-center gap-1">
                                <span className="truncate text-[1rem] font-bold">{name}</span>
                                <VerifiedBadge person={meta.person} locale={locale} size={15} />
                            </span>
                            <span className={`block truncate text-[0.8rem] ${typingNow || meta.presence.online ? "font-semibold text-[#1faa59]" : "text-muted"}`}>
                                {typingNow ? words.typing : presenceText(meta.presence, locale, words) || `@${meta.person.handle}`}
                            </span>
                        </span>
                    </Link>
                ) : (
                    <span className="flex-1" />
                )}
                {meta?.chat?.flame && (
                    <button
                        type="button"
                        onClick={() => toast(`${meta.chat!.flame!.ending ? `${words.flame.ending} ` : ""}${words.flame.what} ${fill(words.flame.best, { count: meta.chat!.flame!.best })}`)}
                        className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#fff1e6] px-3 text-[0.875rem] font-bold text-[#e8590c] dark:bg-[#e8590c]/15"
                        title={fill(words.flame.label, { count: meta.chat.flame.count })}
                    >
                        {meta.chat.flame.ending ? "⏳" : "🔥"} {meta.chat.flame.count}
                    </button>
                )}
                <button type="button" onClick={() => setChatMenu(true)} aria-label={words.menu.open} className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-surface-2">
                    <MoreVertical size={20} />
                </button>
            </header>

            <div
                ref={list}
                onScroll={(event) => {
                    const element = event.currentTarget;
                    stick.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
                }}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3"
            >
                <div className="mx-auto flex max-w-2xl flex-col gap-1.5">
                    {state === "missing" && <p className="mt-10 text-center text-text-2">{t.people.profile.notFound}</p>}
                    {state === "closed" && <p className="mt-10 text-center text-text-2">{words.errors.closed}</p>}
                    {more && (
                        <button type="button" onClick={older} className="mx-auto mb-2 rounded-full bg-bg/80 px-4 py-2 text-[0.8rem] font-semibold">
                            {words.older}
                        </button>
                    )}
                    {meta?.chat?.flame && meta.chat.flame.ending && <p className="mx-auto my-2 rounded-full bg-[#fff1e6] px-4 py-2 text-center text-[0.8rem] font-semibold text-[#e8590c] dark:bg-[#e8590c]/15">{words.flame.ending}</p>}
                    {messages.map((message, index) => (
                        <div key={message.id} data-message className="flex flex-col">
                            {(index === 0 || !isSameDay(messages[index - 1].at, message.at)) && (
                                <span className="mx-auto my-2 rounded-lg bg-bg/85 px-3 py-1 text-[0.75rem] font-semibold text-text-2 capitalize shadow-sm">{dayLabel(message.at, locale, words)}</span>
                            )}
                            <Bubble
                                message={message}
                                name={name}
                                words={words}
                                locale={locale}
                                theirRead={meta?.theirRead ?? null}
                                theirActive={meta?.theirActive ?? null}
                                onMenu={(item) => setMenuFor({ ...item, canTakeBack: Date.now() - Date.parse(item.at) < 24 * 3_600_000 })}
                                onPhoto={setPhoto}
                                onAnswer={(item, answer) => change(item, { action: "answer", answer })}
                                onRetry={(item) => retries.current.get(item.id)?.()}
                                onListened={(item) => {
                                    // Quietly: before script 015 there is nothing to note.
                                    if (item.pending) return;
                                    call<{ message: ChatMessage }>("/api/chats/messages", "PATCH", { id: item.id, action: "listened" }).then((answer) => answer.ok === true && merge([answer.message], false));
                                }}
                            />
                        </div>
                    ))}
                    {request === "outgoing" && <p className="mx-auto mt-3 max-w-sm rounded-xl bg-bg/85 px-4 py-2 text-center text-[0.8rem] text-text-2">{fill(words.request.outgoing, { name, count: REQUEST_MESSAGES })}</p>}
                </div>
            </div>

            {request === "incoming" && (
                <div className="shrink-0 border-t border-line bg-bg px-4 py-3 text-center">
                    <p className="text-[0.875rem] text-text-2">{fill(words.request.incoming, { name })}</p>
                    <div className="mt-3 flex justify-center gap-2">
                        <button type="button" onClick={() => chatAction("block")} className="nt-btn nt-btn-outline h-11 px-4 text-closed">
                            {words.menu.block}
                        </button>
                        <button type="button" onClick={() => chatAction("decline")} className="nt-btn nt-btn-outline h-11 px-4">
                            {words.request.decline}
                        </button>
                        <button type="button" onClick={() => chatAction("accept")} className="nt-btn nt-btn-dark h-11 px-5">
                            {words.request.accept}
                        </button>
                    </div>
                </div>
            )}

            {write && write.ok === false ? (
                <div className="shrink-0 border-t border-line bg-bg px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] text-center">
                    <p className="flex items-center justify-center gap-2 text-[0.875rem] text-text-2">
                        <Ban size={15} />
                        {fill(words.cannot[write.why], { name })}
                    </p>
                    {write.why === "blocked" && (
                        <button type="button" onClick={() => chatAction("unblock")} className="nt-btn nt-btn-outline mt-2 h-10 px-4">
                            {words.menu.unblock}
                        </button>
                    )}
                </div>
            ) : (
                state === "ready" && (
                    <Composer
                        words={words}
                        reply={reply}
                        replyName={name}
                        canMedia={request !== "outgoing"}
                        onCancelReply={() => setReply(null)}
                        onText={sendText}
                        onTyping={typing}
                        onPhoto={sendPhoto}
                        onPlace={() => setPicking(true)}
                        onPlan={() => setPlanning(true)}
                        onVoice={sendVoice}
                        onTrouble={toast}
                    />
                )
            )}

            <MessageMenu
                message={menuFor}
                words={words}
                closeLabel={t.people.common.close}
                onClose={() => setMenuFor(null)}
                onReact={(message, emoji) => {
                    setMenuFor(null);
                    change(message, { action: "react", emoji });
                }}
                onReply={(message) => {
                    setMenuFor(null);
                    setReply(message);
                }}
                onDelete={(message) => {
                    setMenuFor(null);
                    if (window.confirm(words.confirmDelete)) change(message, { action: "delete" });
                }}
                onReport={async (message) => {
                    setMenuFor(null);
                    await call("/api/chats/actions", "POST", { message: message.id, action: "report" });
                    toast(words.reported);
                }}
                onCopied={() => {
                    setMenuFor(null);
                    toast(words.copied);
                }}
            />
            <ChatMenu
                open={chatMenu}
                thread={meta ? { ...meta, messages: [], more: false } : null}
                words={words}
                closeLabel={t.people.common.close}
                onClose={() => setChatMenu(false)}
                onAction={chatAction}
                onProfile={() => router.push(paths.person(locale, handle))}
            />
            <PlacePicker
                open={picking}
                title={words.place.title}
                words={words}
                closeLabel={t.people.common.close}
                onClose={() => setPicking(false)}
                onPick={(place) => {
                    setPicking(false);
                    send(addLocal({ kind: "place", place: { slug: place.slug, name: place.name, neighborhood: place.neighborhood, city: place.city ?? "", cover: place.cover ?? null } }), { kind: "place", place: place.slug });
                }}
            />
            <PlanSheet
                open={planning}
                words={words}
                closeLabel={t.people.common.close}
                onClose={() => setPlanning(false)}
                onSend={(place, at) => {
                    setPlanning(false);
                    send(addLocal({ kind: "plan", place: { slug: place.slug, name: place.name, neighborhood: place.neighborhood, city: place.city ?? "", cover: place.cover ?? null }, plan: { at, mine: "yes", theirs: null } }), { kind: "plan", place: place.slug, at });
                }}
            />
            <PhotoViewer url={photo} closeLabel={t.people.common.close} onClose={() => setPhoto(null)} />
        </div>
    );
}
