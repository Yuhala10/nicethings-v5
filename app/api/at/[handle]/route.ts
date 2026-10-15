import { NextResponse, type NextRequest } from "next/server";
import { honourBySlug } from "@/lib/guests";
import { DEFAULT_LOCALE, LOCALE_COOKIE, SITE_URL, isLocale, type Locale } from "@/lib/i18n";
import { paths, slugify } from "@/lib/places/paths";

// nicethings.site/@theirname: the short address of a guest of honour
// (next.config.mjs sends /@… here). It leads to their page, in the
// visitor's language. A name that is not a guest of honour's leads to the
// guests' page, where anyone can ask for an invitation.

function preferred(request: NextRequest): Locale {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    if (isLocale(saved)) return saved;
    for (const part of (request.headers.get("accept-language") ?? "").split(",")) {
        const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
        if (isLocale(code)) return code;
    }
    return DEFAULT_LOCALE;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
    const { handle } = await params;
    const lang = preferred(request);
    const slug = slugify(decodeURIComponent(handle).replace(/^@+/, "")).slice(0, 60);
    const guest = slug ? await honourBySlug(slug).catch(() => null) : null;
    const target = guest ? paths.guest(lang, guest.slug) : paths.guests(lang);
    return NextResponse.redirect(`${SITE_URL}${target}`, 307);
}
