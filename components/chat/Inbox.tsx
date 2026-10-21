"use client";

import Link from "next/link";
import { BellOff, MessageCircle, Pin, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { fill } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import { refreshInbox, useInbox } from "@/lib/people/inbox";
import { openAuth, useMe } from "@/lib/people/client";
import PeopleSearch from "../people/PeopleSearch";
import { Face, VerifiedBadge, displayName } from "../people/Person";
import { useLocale } from "../site/LocaleProvider";
import { inboxTime, previewOf } from "./format";

// "Messages": the conversations, newest first, pinned ones on top; the
// requests from people one does not follow; the archived ones. It moves on
// its own when a message comes (lib/people/inbox.ts).

type Tab = "chats" | "requests" | "archived";

export default function Inbox() {
    const { locale, t } = useLocale();
    const words = t.people.chat;
    const { me, ready } = useMe();
    // Shown at once from the phone's copy, brought up to date behind.
    const { lists, closed } = useInbox(me?.id ?? null);
    const [tab, setTab] = useState<Tab>("chats");
    const [query, setQuery] = useState("");

    useEffect(() => {
        if (me) refreshInbox(true);
    }, [me]);

    if (ready && !me) {
        return (
            <div className="mt-10 rounded-[1.6rem] border border-line bg-surface p-6 text-center">
                <MessageCircle size={32} className="mx-auto text-brand-600" />
                <p className="nt-serif mt-3 text-[1.75rem] leading-tight">{words.title}</p>
                <p className="mx-auto mt-2 max-w-sm text-text-2">{t.people.join.lead}</p>
                <button type="button" onClick={() => openAuth("generic")} className="nt-btn nt-btn-dark mt-5">
                    {t.people.join.create}
                </button>
            </div>
        );
    }
    if (closed) return <p className="mt-8 text-text-2">{words.errors.closed}</p>;

    // The search box filters the conversations, and finds members to write to.
    const needle = query.replace(/^@/, "").trim().toLowerCase();
    const shown = (lists ? lists[tab] : []).filter((chat) => !needle || chat.person.handle.includes(needle) || (chat.person.name ?? "").toLowerCase().includes(needle));
    const tabs: { key: Tab; label: string; count: number }[] = [
        { key: "chats", label: words.title, count: lists?.chats.filter((chat) => chat.unread > 0).length ?? 0 },
        { key: "requests", label: words.requests, count: lists?.requests.length ?? 0 },
        { key: "archived", label: words.archived, count: lists?.archived.length ?? 0 },
    ];

    return (
        <div>
            <label className="mt-5 flex h-12 items-center gap-2 rounded-full border border-line-strong bg-surface px-4">
                <Search size={18} className="shrink-0 text-muted" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={words.search} aria-label={words.search} className="min-w-0 flex-1 bg-transparent text-[1rem] outline-none" />
                {query && (
                    <button type="button" onClick={() => setQuery("")} aria-label={t.people.common.close} className="grid h-8 w-8 place-items-center rounded-full">
                        <X size={16} />
                    </button>
                )}
            </label>
            {needle.length >= 2 && (
                <div className="mt-4">
                    <PeopleSearch text={needle} to="chat" title={words.people} exclude={me?.handle} />
                </div>
            )}
            <div className="nt-rail -mx-4 mt-5 flex gap-2 px-4">
                {tabs
                    .filter((item) => item.key === "chats" || item.count > 0 || tab === item.key)
                    .map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => setTab(item.key)}
                            aria-pressed={tab === item.key}
                            className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[0.875rem] font-semibold transition ${tab === item.key ? "bg-[#15110e] text-white dark:bg-white dark:text-[#15110e]" : "border border-line-strong bg-surface text-text-2"}`}
                        >
                            {item.label}
                            {item.count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#25d366] px-1.5 text-[0.7rem] font-bold text-white">{item.count}</span>}
                        </button>
                    ))}
            </div>
            {tab === "requests" && <p className="mt-4 text-[0.875rem] text-muted">{words.requestsLead}</p>}

            {!lists ? (
                <ul className="mt-4 flex flex-col gap-2" aria-hidden>
                    {[0, 1, 2].map((index) => (
                        <li key={index} className="flex items-center gap-3 rounded-2xl p-3">
                            <span className="h-14 w-14 animate-pulse rounded-full bg-surface-2" />
                            <span className="flex-1">
                                <span className="block h-4 w-1/3 animate-pulse rounded bg-surface-2" />
                                <span className="mt-2 block h-3 w-2/3 animate-pulse rounded bg-surface-2" />
                            </span>
                        </li>
                    ))}
                </ul>
            ) : shown.length === 0 && needle ? null : shown.length === 0 ? (
                <div className="mt-8 rounded-[1.6rem] border border-dashed border-line-strong p-6 text-center">
                    <p className="text-text-2">{words.empty}</p>
                    <Link href={paths.kwat(locale)} className="nt-btn nt-btn-outline mt-4">
                        {words.emptyCta}
                    </Link>
                </div>
            ) : (
                <ul className="mt-3 flex flex-col">
                    {shown.map((chat) => (
                        <li key={chat.id}>
                            <Link href={paths.chat(locale, chat.person.handle)} className="flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-surface-2 active:scale-[0.99]">
                                <span className="relative shrink-0">
                                    <Face person={chat.person} size={56} />
                                    {chat.presence.online && <span className="absolute right-0.5 bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-bg bg-[#25d366]" aria-label={words.online} />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2">
                                        <span className="flex min-w-0 flex-1 items-center gap-1">
                                            <span className="truncate text-[1rem] font-semibold">{displayName(chat.person)}</span>
                                            <VerifiedBadge person={chat.person} locale={locale} size={15} />
                                        </span>
                                        {chat.last && <span className={`shrink-0 text-[0.75rem] ${chat.unread ? "font-bold text-[#1faa59]" : "text-muted"}`}>{inboxTime(chat.last.at, locale, words)}</span>}
                                    </span>
                                    <span className="mt-0.5 flex items-center gap-2">
                                        <span className={`min-w-0 flex-1 truncate text-[0.875rem] ${chat.unread ? "font-semibold text-text" : "text-muted"}`}>
                                            {chat.last
                                                ? chat.last.deleted
                                                    ? chat.last.mine
                                                        ? words.deletedMine
                                                        : words.deleted
                                                    : `${chat.last.mine ? `${words.you} : ` : ""}${previewOf(chat.last.kind, chat.last.body, words)}`
                                                : ""}
                                        </span>
                                        {chat.flame && (
                                            <span className="shrink-0 text-[0.8rem] font-bold text-[#e8590c]" title={fill(words.flame.label, { count: chat.flame.count })}>
                                                {chat.flame.ending ? "⏳" : "🔥"}
                                                {chat.flame.count}
                                            </span>
                                        )}
                                        {chat.muted && <BellOff size={14} className="shrink-0 text-muted" />}
                                        {chat.pinned && <Pin size={14} className="shrink-0 text-muted" />}
                                        {chat.unread > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[#25d366] px-1.5 text-[0.7rem] font-bold text-white">{chat.unread}</span>}
                                    </span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
