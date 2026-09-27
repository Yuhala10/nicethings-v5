"use client";

import { useCallback, useSyncExternalStore } from "react";

// Saved places live on the phone: no account, no network, instant. Every
// component using the hook stays in sync, including across tabs.

const KEY = "nt_saved_v1";
const EVENT = "nt:saved";

function read(): string[] {
    try {
        const value = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
        return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
    } catch {
        return [];
    }
}

let cache: string[] | null = null;
const EMPTY: string[] = [];

function snapshot() {
    if (cache === null) cache = read();
    return cache;
}

function subscribe(callback: () => void) {
    const refresh = () => {
        cache = read();
        callback();
    };
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
        window.removeEventListener(EVENT, refresh);
        window.removeEventListener("storage", refresh);
    };
}

export function useSaved() {
    const saved = useSyncExternalStore(subscribe, snapshot, () => EMPTY);

    const toggle = useCallback((slug: string) => {
        const current = read();
        const next = current.includes(slug) ? current.filter((item) => item !== slug) : [slug, ...current];
        try {
            window.localStorage.setItem(KEY, JSON.stringify(next.slice(0, 500)));
        } catch {
            // Storage full or blocked (private mode): keep the in-memory state.
        }
        cache = next;
        window.dispatchEvent(new Event(EVENT));
        if (navigator.vibrate) navigator.vibrate(12);
        return next.includes(slug);
    }, []);

    return { saved, isSaved: (slug: string) => saved.includes(slug), toggle };
}
