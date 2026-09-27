"use client";

import {
    translations,
} from "./en";

export type Language =
    | "en"
    | "fr";

const STORAGE_KEY =
    "nicethings-language";

export function getInitialLanguage(): Language {
    if (
        typeof window === "undefined"
    ) {
        return "en";
    }

    const stored =
        window.localStorage.getItem(
            STORAGE_KEY
        );

    if (
        stored === "en" ||
        stored === "fr"
    ) {
        return stored;
    }

    const browserLanguage =
        window.navigator.language
            .toLowerCase();

    return browserLanguage.startsWith(
        "fr"
    )
        ? "fr"
        : "en";
}

export function setLanguage(
    language: Language
) {
    if (
        typeof window === "undefined"
    ) {
        return;
    }

    window.localStorage.setItem(
        STORAGE_KEY,
        language
    );

    document.documentElement.lang =
        language;
}

export function getLanguage(): Language {
    return getInitialLanguage();
}

export function getTranslations(
    language: Language
) {
    return translations[language];
}

export function t(
    language: Language,
    section: string,
    key: string
): string {
    const dictionary =
        translations[language] as Record<
            string,
            Record<string, string>
        >;

    return (
        dictionary?.[section]?.[key] ??
        key
    );
}