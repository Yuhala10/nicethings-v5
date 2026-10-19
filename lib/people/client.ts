"use client";

import { useSyncExternalStore } from "react";
import { mergeSaved, readSaved } from "../hooks/useSaved";
import type { Me } from "./types";

// Who is signed in on this phone, for every component at once. Pages are
// cached for everyone, so the browser asks /api/me once and remembers; the
// last answer is kept for the tab so the face shows at once on the next page.

type State = { me: Me | null; ready: boolean; closed: boolean };

const CACHE = "nt_me_v1";
const SERVER: State = { me: null, ready: false, closed: false };
let state: State = SERVER;
let loading: Promise<void> | null = null;
let synced: string | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
    try {
        const cached = JSON.parse(sessionStorage.getItem(CACHE) ?? "null") as Me | null;
        if (cached?.handle) state = { me: cached, ready: false, closed: false };
    } catch {}
    // A heart given on this phone is also given on the profile.
    window.addEventListener("nt:save-toggle", (event) => {
        const detail = (event as CustomEvent<{ slug: string; on: boolean }>).detail;
        if (!state.me || !detail) return;
        fetch("/api/me/saves", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(detail), keepalive: true }).catch(() => {});
    });
}

function update(next: Partial<State>) {
    state = { ...state, ...next };
    try {
        if (state.me) sessionStorage.setItem(CACHE, JSON.stringify(state.me));
        else sessionStorage.removeItem(CACHE);
    } catch {}
    for (const listener of listeners) listener();
}

// The saved places of this phone and of the profile become one list, once
// per profile and page load.
async function syncSaves(me: Me) {
    if (synced === me.id) return;
    synced = me.id;
    const local = readSaved();
    mergeSaved(me.saves);
    if (!local.some((slug) => !me.saves.includes(slug))) return;
    try {
        const response = await fetch("/api/me/saves", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slugs: local }) });
        const answer = (await response.json()) as { ok?: boolean; saves?: string[] };
        if (answer.ok && answer.saves) mergeSaved(answer.saves);
    } catch {}
}

export function loadMe() {
    loading ??= fetch("/api/me", { cache: "no-store" })
        .then((response) => response.json() as Promise<{ ok?: boolean; me?: Me | null; closed?: boolean }>)
        .then((answer) => {
            if (answer.ok === false) return update({ ready: true });
            update({ me: answer.me ?? null, ready: true, closed: Boolean(answer.closed) });
            if (answer.me) syncSaves(answer.me);
        })
        .catch(() => update({ ready: true }))
        .finally(() => {
            loading = null;
        });
    return loading;
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    if (!state.ready && !loading) loadMe();
    return () => {
        listeners.delete(listener);
    };
}

export function useMe() {
    return useSyncExternalStore(subscribe, () => state, () => SERVER);
}

// The state right now, outside React (the welcome reads it at the tap).
export function peekMe() {
    return state;
}

export function setMe(me: Me | null) {
    update({ me, ready: true });
    if (me) syncSaves(me);
}

// ---------------------------------------------------------------- the sheet

// "Plus tard" after the welcome: not asked again for three days.
export const JOIN_LATER_KEY = "nt_join_later";
export const JOIN_LATER_MS = 3 * 86_400_000;

export type AuthReason = "review" | "comment" | "like" | "generic" | "welcome";
let afterAuth: (() => void) | null = null;

// Opens the profile sheet (components/people/AuthSheet.tsx). `then` runs
// once the person is signed in: the review form opens, the like is given.
export function openAuth(reason: AuthReason = "generic", then?: () => void, mode: "join" | "login" = "join") {
    afterAuth = then ?? null;
    window.dispatchEvent(new CustomEvent("nt:auth", { detail: { reason, mode } }));
}

export function runAfterAuth() {
    const next = afterAuth;
    afterAuth = null;
    next?.();
}

export function dropAfterAuth() {
    afterAuth = null;
}

// Signed in, or asked to be: runs `action` now, or after the sheet.
export function withMe(reason: AuthReason, action: () => void) {
    if (state.me) action();
    else openAuth(reason, action);
}

// ---------------------------------------------------------------- calls

export type Answer<T> = (T & { ok: true }) | { ok: false; why: string; [key: string]: unknown };

// A JSON call to the site's own API. A "signin" refusal means the phone was
// signed out elsewhere: forget the profile here too.
export async function call<T = Record<string, unknown>>(path: string, method = "POST", body?: unknown): Promise<Answer<T>> {
    try {
        const response = await fetch(path, {
            method,
            headers: body === undefined ? undefined : { "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const answer = (await response.json().catch(() => ({ ok: false, why: "failed" }))) as Answer<T>;
        if (answer.ok === false && answer.why === "signin") update({ me: null, ready: true });
        return answer;
    } catch {
        return { ok: false, why: "failed" };
    }
}
