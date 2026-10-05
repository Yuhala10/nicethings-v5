"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { LOCALE_COOKIE, isLocale, otherLocale, type Locale } from "@/lib/i18n/config";
import { useLocale } from "./LocaleProvider";

// The browser's machine translation is switched off (see the root layout),
// so a reader whose phone is set to the other language is offered our own
// version of the page instead. Either answer is remembered, so the question
// comes once.
const TEXT: Record<Locale, { line: string; go: string; stay: string }> = {
    en: { line: "This page is available in English.", go: "Read in English", stay: "Stay in French" },
    fr: { line: "Cette page existe en français.", go: "Lire en français", stay: "Rester en anglais" },
};

function chosen() {
    const value = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([a-z]{2})`))?.[1];
    return isLocale(value) ? value : null;
}

function remember(locale: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export default function LanguagePrompt() {
    const { locale } = useLocale();
    const pathname = usePathname();
    const other = otherLocale(locale);
    const [offer, setOffer] = useState(false);

    useEffect(() => {
        // A language already picked on the site wins over the phone's setting.
        const phone = (navigator.languages?.[0] ?? navigator.language ?? "").slice(0, 2).toLowerCase();
        setOffer((chosen() ?? (isLocale(phone) ? phone : null)) === other);
    }, [other]);

    if (!offer) return null;
    const text = TEXT[other];

    return (
        <div lang={other} className="flex items-center justify-center gap-x-3 gap-y-1 bg-ink px-4 pt-[max(env(safe-area-inset-top),0.6rem)] pb-2.5 text-sm text-white">
            <p className="min-w-0">
                {text.line}{" "}
                <Link href={pathname.replace(/^\/(fr|en)(?=\/|$)/, `/${other}`)} hrefLang={other} onClick={() => remember(other)} className="font-bold whitespace-nowrap underline underline-offset-4">
                    {text.go}
                </Link>
            </p>
            <button
                type="button"
                aria-label={text.stay}
                title={text.stay}
                onClick={() => {
                    remember(locale);
                    setOffer(false);
                }}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-white/15"
            >
                <X size={16} />
            </button>
        </div>
    );
}
