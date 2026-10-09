import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./lib/i18n/config";

// Sends language-less URLs to /fr or /en: the visitor's saved choice first,
// then their phone's language, then French. Old app URLs are redirected to
// their new homes so shared links keep working.

const LEGACY: Record<string, string> = {
    "/nearby": "",
    "/search": "/recherche",
    "/saved": "/favoris",
    "/submit": "/ajouter",
    "/privacy": "/confidentialite",
    "/terms": "/conditions",
    "/profile": "/favoris",
    "/about": "/a-propos",
};

function preferredLocale(request: NextRequest) {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    if (isLocale(saved)) return saved;

    const header = request.headers.get("accept-language") ?? "";
    for (const part of header.split(",")) {
        const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
        if (isLocale(code)) return code;
    }
    return DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const first = pathname.split("/")[1];

    if (isLocale(first)) return NextResponse.next();

    const locale = preferredLocale(request);
    let target = pathname === "/" ? "" : pathname;

    if (target in LEGACY) target = LEGACY[target];
    else if (target.startsWith("/spots/")) target = `/p/${target.slice("/spots/".length)}`;

    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${target}`;
    url.search = search;
    return NextResponse.redirect(url, pathname === "/" ? 307 : 308);
}

export const config = {
    // Everything except admin, APIs, Next internals and files with extensions.
    matcher: ["/((?!admin|api|_next|.*\\..*).*)"],
};
