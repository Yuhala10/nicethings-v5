import { cityBySlug } from "./cities";
import { isLocale, type Locale } from "./i18n/config";

// Audience measurement: what a public URL is (kind of page, city, place)
// and where a visit came from. Shared by the browser beacon, /api/visits
// and the team console.

export const PAGE_KINDS = ["landing", "city", "guide", "search", "map", "place", "directions", "saved", "submit", "blog", "article", "pro", "other"] as const;
export type PageKind = (typeof PAGE_KINDS)[number];

export type PageInfo = { lang: Locale; page: PageKind; city: string | null; place: string | null };

// null = not counted: not a public page, or one of the two entry pages
// (/fr/carte, /fr/recherche) that only forward to the visitor's city.
export function describePath(pathname: string): PageInfo | null {
    const [lang, first, second, ...more] = pathname.split("/").filter(Boolean);
    if (!isLocale(lang)) return null;
    const info = (page: PageKind, city: string | null = null, place: string | null = null) => ({ lang, page, city, place });

    if (!first) return info("landing");
    if (first === "carte" || first === "recherche") return null;
    if (first === "p") return second ? info("place", null, second.slice(0, 200)) : null;
    if (first === "y-aller") return second ? info("directions", null, second.slice(0, 200)) : null;
    if (first === "favoris") return info("saved");
    if (first === "ajouter") return info("submit");
    if (first === "blog") return info(second ? "article" : "blog");
    if (first === "pro") return info("pro");

    const city = cityBySlug(first)?.slug;
    if (!city) return info("other");
    if (!second) return info("city", city);
    if (more.length === 0 && second === "carte") return info("map", city);
    if (more.length === 0 && second === "recherche") return info("search", city);
    return info("guide", city);
}

const KNOWN_SOURCES: [RegExp, string][] = [
    [/google/, "google"],
    [/bing\./, "bing"],
    [/duckduckgo/, "duckduckgo"],
    [/yahoo/, "yahoo"],
    [/whatsapp|wa\.me/, "whatsapp"],
    [/instagram/, "instagram"],
    [/facebook|messenger|(^|\.)fb\./, "facebook"],
    [/tiktok/, "tiktok"],
    [/twitter|(^|\.)x\.com$|(^|\.)t\.co$/, "twitter"],
    [/youtube|youtu\.be/, "youtube"],
    [/linkedin|lnkd\.in/, "linkedin"],
    [/telegram|(^|\.)t\.me$/, "telegram"],
];

// Where a visit started: a tagged link (?utm_source=…) wins, then the
// installed app, then the site the visitor came from, otherwise "direct".
export function visitSource({ tag, referrer, installed }: { tag?: unknown; referrer?: unknown; installed?: unknown }) {
    if (typeof tag === "string") {
        const clean = tag.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
        if (clean) return clean;
    }
    if (installed === true) return "app";
    if (typeof referrer === "string" && referrer) {
        const host = referrer.toLowerCase().replace(/^www\./, "").slice(0, 60);
        return KNOWN_SOURCES.find(([pattern]) => pattern.test(host))?.[1] ?? host;
    }
    return "direct";
}
