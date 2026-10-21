"use client";

import { useEffect, useSyncExternalStore } from "react";
import { listen, type Listening } from "./realtime";

// The unread messages and the requests, for the badge on the tab bar and
// the inbox, kept fresh by the instant signal (and, without it, by asking
// every minute while the page is on screen).

type State = { unread: number; requests: number; ready: boolean; closed: boolean };
const EMPTY: State = { unread: 0, requests: 0, ready: false, closed: false };
let state: State = EMPTY;
let owner: string | null = null;
let line: Listening | null = null;
let lineKey: string | null = null;
let loading: Promise<void> | null = null;
let timer = 0;
const listeners = new Set<() => void>();
const pings = new Set<() => void>();

function update(next: Partial<State>) {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
}

export function refreshInbox() {
    if (!owner) return Promise.resolve();
    loading ??= fetch("/api/chats?count=1", { cache: "no-store" })
        .then((response) => response.json() as Promise<{ ok?: boolean; why?: string; unread?: number; requests?: number; key?: string }>)
        .then((answer) => {
            if (answer.ok === false) return update({ ready: true, closed: answer.why === "closed" });
            update({ unread: answer.unread ?? 0, requests: answer.requests ?? 0, ready: true, closed: false });
            if (answer.key && answer.key !== lineKey) {
                line?.stop();
                lineKey = answer.key;
                const again = () => {
                    refreshInbox();
                    for (const ping of pings) ping();
                };
                line = listen(answer.key, { m: again, r: again });
            }
        })
        .catch(() => {})
        .finally(() => {
            loading = null;
        });
    return loading;
}

// Starts (or stops) following the inbox of the member signed in.
function follow(profileId: string | null) {
    if (profileId === owner) return;
    owner = profileId;
    line?.stop();
    line = null;
    lineKey = null;
    window.clearInterval(timer);
    update(EMPTY);
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

// The numbers, for the member `profileId` (null when nobody is signed in).
export function useInbox(profileId: string | null) {
    useEffect(() => follow(profileId), [profileId]);
    return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

// Called when the inbox's signal comes (the inbox page reloads its list).
export function onInboxSignal(callback: () => void) {
    pings.add(callback);
    return () => {
        pings.delete(callback);
    };
}
