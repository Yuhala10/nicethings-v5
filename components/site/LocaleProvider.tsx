"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";

type LocaleContextValue = {
    locale: Locale;
    t: Dictionary;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
    locale,
    dictionary,
    children,
}: {
    locale: Locale;
    dictionary: Dictionary;
    children: ReactNode;
}) {
    return (
        <LocaleContext.Provider value={{ locale, t: dictionary }}>{children}</LocaleContext.Provider>
    );
}

export function useLocale() {
    const value = useContext(LocaleContext);
    if (!value) throw new Error("useLocale must be used inside <LocaleProvider>.");
    return value;
}
