export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "nt_lang";

// Vercel serves the site on www (the bare domain redirects there), so
// canonical URLs, the sitemap and structured data must use www too.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.nicethings.site").replace(/\/$/, "");

// Cameroon is on West Africa Time (UTC+1, no daylight saving). Everything
// time-sensitive (open now, "ce soir", rush hour) is computed in this zone,
// never in the server's or the visitor's device zone.
export const CITY_TIME_ZONE = "Africa/Douala";

export function isLocale(value: string | undefined | null): value is Locale {
    return value === "fr" || value === "en";
}

export function otherLocale(locale: Locale): Locale {
    return locale === "fr" ? "en" : "fr";
}
