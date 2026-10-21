"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ChatSummary } from "./types";
import { listen, type Listening } from "./realtime";

// One's messages on this phone: the conversations (kept on the phone, so
// "Messages" opens at once and is brought up to date behind), the numbers
// for the badge, and the news of a message just arrived (the banner at the
// top of the screen). Kept fresh by the instant signal, and without it by
// asking every minute while the page is on screen.

export type Lists = { chats: ChatSummary[]; requests: ChatSummary[]; archived: ChatSummary[] };
type State = { unread: number; requests: number; ready: boolean; closed: boolean; lists: Lists | null };
const EMPTY: State = { unread: 0, requests: 0, ready: false, closed: false, lists: null };

let state: State = EMPTY;
let owner: string | null = null;
let line: Listening | null = null;
let lineKey: string | null = null;
let loadingCounts: Promise<void> | null = null;
let loadingLists: Promise<void> | null = null;
let timer = 0;
// The newest message from someone else already told about (the banner).
let toldUpTo = "";
const listeners = new Set<() => void>();
const arrivals = new Set<(chat: ChatSummary, more: number) => void>();

const cacheKey = (id: string) => `nt_inbox:${id}`;

function update(next: Partial<State>) {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
}

function listenTo(key: string | undefined) {
    if (!key || key === lineKey) return;
    line?.stop();
    lineKey = key;
    // Something moved: the lists again (they carry the numbers too).
    line = listen(key, { m: () => refreshInbox(true), r: () => refreshInbox(true) });
}

// Unanswered messages from others, newest first, that the banner has not
// shown yet; muted conversations and archived ones stay quiet.
function announce(lists: Lists, first: boolean) {
    const waiting = [...lists.chats, ...lists.requests].filter((chat) => chat.unread > 0 && !chat.muted && chat.last && !chat.last.mine).sort((a, b) => b.last!.at.localeCompare(a.last!.at));
    const newest = waiting[0];
    if (!newest) return;
    if (newest.last!.at <= toldUpTo) return;
    // On opening the site, only what came while away is told, once.
    if (first) {
        try {
            const seen = sessionStorage.getItem("nt_told") ?? "";
            if (newest.last!.at <= seen) {
                toldUpTo = seen;
                return;
            }
        } catch {}
    }
    toldUpTo = newest.last!.at;
    try {
        sessionStorage.setItem("nt_told", toldUpTo);
    } catch {}
    for (const arrival of arrivals) arrival(newest, waiting.length - 1);
}

function countsOf(lists: Lists) {
    return { unread: lists.chats.filter((chat) => chat.unread > 0).length, requests: lists.requests.length };
}

// `full`: the conversations themselves; otherwise only the numbers.
export function refreshInbox(full = false): Promise<void> {
    if (!owner) return Promise.resolve();
    const me = owner;
    if (full) {
        const first = state.lists === null || !toldUpTo;
        loadingLists ??= fetch("/api/chats", { cache: "no-store" })
            .then((response) => response.json() as Promise<Partial<Lists> & { ok?: boolean; why?: string; key?: string }>)
            .then((answer) => {
                if (owner !== me) return;
                if (answer.ok === false) return update({ ready: true, closed: answer.why === "closed" });
                const lists: Lists = { chats: answer.chats ?? [], requests: answer.requests ?? [], archived: answer.archived ?? [] };
                update({ lists, ready: true, closed: false, ...countsOf(lists) });
                try {
                    localStorage.setItem(cacheKey(me), JSON.stringify(lists));
                } catch {}
                listenTo(answer.key);
                announce(lists, first);
            })
            .catch(() => {})
            .finally(() => {
                loadingLists = null;
            });
        return loadingLists;
    }
    loadingCounts ??= fetch("/api/chats?count=1", { cache: "no-store" })
        .then((response) => response.json() as Promise<{ ok?: boolean; why?: string; unread?: number; requests?: number; key?: string }>)
        .then((answer) => {
            if (owner !== me) return;
            if (answer.ok === false) return update({ ready: true, closed: answer.why === "closed" });
            const grew = (answer.unread ?? 0) > state.unread || (answer.requests ?? 0) > state.requests;
            update({ unread: answer.unread ?? 0, requests: answer.requests ?? 0, ready: true, closed: false });
            listenTo(answer.key);
            // Something new: fetch it, so the banner can say who and what.
            if (grew || !toldUpTo) refreshInbox(true);
        })
        .catch(() => {})
        .finally(() => {
            loadingCounts = null;
        });
    return loadingCounts;
}

// Starts (or stops) following the messages of the member signed in.
function follow(profileId: string | null) {
    if (profileId === owner) return;
    owner = profileId;
    line?.stop();
    line = null;
    lineKey = null;
    toldUpTo = "";
    window.clearInterval(timer);
    let cached: Lists | null = null;
    if (profileId) {
        try {
            cached = JSON.parse(localStorage.getItem(cacheKey(profileId)) ?? "null") as Lists | null;
        } catch {}
    }
    update({ ...EMPTY, lists: cached, ...(cached ? countsOf(cached) : {}) });
    if (!profileId) return;
    refreshInbox();
    timer = window.setInterval(() => {
        if (document.visibilityState === "visible") refreshInbox();
    }, 60_000);
}

if (typeof window !== "undefined") {
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") refreshInbox();
    });
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

// The messages of the member `profileId` (null when nobody is signed in).
export function useInbox(profileId: string | null) {
    useEffect(() => follow(profileId), [profileId]);
    return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

// A message just arrived (or was waiting when the site opened).
export function onArrival(callback: (chat: ChatSummary, more: number) => void) {
    arrivals.add(callback);
    return () => {
        arrivals.delete(callback);
    };
}

// What one sees in a conversation is read: the banner and the badge forget it.
export function markSeen(chatId: string) {
    if (!state.lists) return;
    const lists = { ...state.lists, chats: state.lists.chats.map((chat) => (chat.id === chatId ? { ...chat, unread: 0 } : chat)), requests: state.lists.requests.map((chat) => (chat.id === chatId ? { ...chat, unread: 0 } : chat)) };
    update({ lists, ...countsOf(lists) });
}
