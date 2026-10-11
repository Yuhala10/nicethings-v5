"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { ADMIN_LANG_COOKIE, pickAdminLang, type AdminLang } from "@/lib/admin-lang";

// The team console in French or English. Each text is written in both
// languages where it is used — tr("Lieux publiés", "Published places") — so
// a screen can never be half translated. The choice is kept in a cookie, so
// the server sends the page in that language from the start; before any
// choice, a phone or computer set to English gets English.

export type { AdminLang };
const LEGACY_KEY = "nt_admin_lang"; // where the choice was kept before the cookie

type Context = { lang: AdminLang; setLang: (lang: AdminLang) => void };
const LangContext = createContext<Context>({ lang: "fr", setLang: () => {} });

// The choice lives outside React, so every part of the console reads the
// same one. A page first takes the language the server rendered it in, then
// the browser's own choice: the two agree while the page comes to life,
// which reading the choice during the first render did not guarantee (the
// sign-in screen rebuilt itself on English phones).
let choice: AdminLang | null = null;
const listeners = new Set<() => void>();

function remember(lang: AdminLang) {
    try {
        document.cookie = `${ADMIN_LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
        localStorage.setItem(LEGACY_KEY, lang);
    } catch {}
}

function read(): AdminLang {
    if (choice === null) {
        let cookie: string | undefined;
        let legacy: string | null = null;
        try {
            cookie = document.cookie.match(new RegExp(`(?:^|; )${ADMIN_LANG_COOKIE}=(fr|en)`))?.[1];
            legacy = localStorage.getItem(LEGACY_KEY);
        } catch {}
        choice = pickAdminLang(cookie ?? legacy, navigator.language);
        if (!cookie) remember(choice);
    }
    return choice;
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// For plain helpers outside components (dates, labels): the language on
// screen.
let current: AdminLang = "fr";
export function adminLang() {
    return current;
}

export function AdminLangProvider({ initial = "fr", children }: { initial?: AdminLang; children: ReactNode }) {
    const lang = useSyncExternalStore(subscribe, read, () => initial);

    useEffect(() => {
        current = lang;
        document.documentElement.lang = lang;
    }, [lang]);

    const setLang = useCallback((next: AdminLang) => {
        choice = next;
        remember(next);
        listeners.forEach((listener) => listener());
    }, []);

    return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useAdminLang() {
    return useContext(LangContext);
}

// tr("Bonjour", "Hello") → the text in the console's language.
export function useTr() {
    const { lang } = useContext(LangContext);
    return useCallback((fr: string, en: string) => (lang === "en" ? en : fr), [lang]);
}

export function LangSwitch({ className = "" }: { className?: string }) {
    const { lang, setLang } = useAdminLang();
    return (
        <div className={`inline-flex rounded-full border border-line bg-card p-0.5 text-xs font-semibold ${className}`} role="group" aria-label="Langue / Language">
            {(["fr", "en"] as const).map((value) => (
                <button
                    key={value}
                    type="button"
                    aria-pressed={lang === value}
                    onClick={() => setLang(value)}
                    className={`rounded-full px-2.5 py-1 transition ${lang === value ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
                >
                    {value.toUpperCase()}
                </button>
            ))}
        </div>
    );
}
