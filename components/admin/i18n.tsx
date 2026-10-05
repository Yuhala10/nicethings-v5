"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

// The team console in French or English. Each text is written in both
// languages where it is used — tr("Lieux publiés", "Published places") — so
// a screen can never be half translated. The choice is kept per browser;
// before any choice, a phone or computer set to English gets English.

export type AdminLang = "fr" | "en";
const KEY = "nt_admin_lang";

type Context = { lang: AdminLang; setLang: (lang: AdminLang) => void };
const LangContext = createContext<Context>({ lang: "fr", setLang: () => {} });

// For plain helpers outside components (dates, labels): the current choice.
let current: AdminLang = "fr";
export function adminLang() {
    return current;
}

export function AdminLangProvider({ children }: { children: ReactNode }) {
    const [lang, setState] = useState<AdminLang>("fr");

    useEffect(() => {
        try {
            const saved = localStorage.getItem(KEY);
            if (saved === "en" || (saved === null && navigator.language.toLowerCase().startsWith("en"))) {
                current = "en";
                setState("en");
            }
        } catch {}
    }, []);

    useEffect(() => {
        document.documentElement.lang = lang;
    }, [lang]);

    const setLang = useCallback((next: AdminLang) => {
        current = next;
        setState(next);
        try {
            localStorage.setItem(KEY, next);
        } catch {}
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
