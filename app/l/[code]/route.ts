import { NextResponse, type NextRequest } from "next/server";
import { cityBySlug, DEFAULT_CITY } from "@/lib/cities";
import { DEFAULT_LOCALE, LOCALE_COOKIE, SITE_URL, isLocale, type Locale } from "@/lib/i18n/config";
import { formatPriceRange } from "@/lib/i18n/format";
import { paths } from "@/lib/places/paths";
import { getAllPlaces, getPlace } from "@/lib/places/server";
import { findByShort, readShort } from "@/lib/places/short";
import { placeKicker, placeShareImage } from "@/lib/share-image";

// The short address of a place (lib/places/short.ts): /l/chepele-3fa85f.
//
// A person is sent straight to the place's page, in their own language. A
// messaging app building the card of a shared link gets a page of a few
// lines instead, with only what the card needs: it reads it at once, so the
// card is there even when the message is sent quickly.

// The apps that build a card for a link, by the name they give themselves.
const CARD_BUILDERS = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|slackbot|discordbot|linkedinbot|skypeuripreview|pinterest|vkshare|redditbot|snapchat|viber|line\//i;

function preferred(request: NextRequest, fallback: Locale) {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    if (isLocale(saved)) return saved;
    const header = request.headers.get("accept-language") ?? "";
    for (const part of header.split(",")) {
        const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
        if (isLocale(code)) return code;
    }
    return fallback;
}

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const short = readShort(code);
    const summary = short ? findByShort(await getAllPlaces().catch(() => []), short) : null;
    const sharedIn: Locale = short?.english ? "en" : DEFAULT_LOCALE;
    // An address that leads nowhere any more: the home page, never an error.
    if (!summary) return NextResponse.redirect(`${SITE_URL}${paths.home(preferred(request, sharedIn))}`, 307);

    const agent = request.headers.get("user-agent") ?? "";
    const place = CARD_BUILDERS.test(agent) ? await getPlace(summary.slug).catch(() => null) : null;
    if (!place) return NextResponse.redirect(`${SITE_URL}${paths.place(preferred(request, sharedIn), summary.slug)}`, 307);

    // The card is drawn in the language the place was shared from.
    const page = `${SITE_URL}${paths.place(sharedIn, place.slug)}`;
    const image = placeShareImage(place, sharedIn);
    const city = (cityBySlug(place.city) ?? DEFAULT_CITY).name;
    const description = [placeKicker(place, sharedIn), [place.neighborhood, city].filter(Boolean).join(", "), formatPriceRange(place.priceMin, place.priceMax, sharedIn)].filter(Boolean).join(" · ");
    const html = `<!doctype html>
<html lang="${sharedIn}">
<head>
<meta charset="utf-8">
<title>${escape(place.name)}</title>
<meta name="description" content="${escape(description)}">
<meta name="robots" content="noindex">
<link rel="canonical" href="${page}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="NiceThings">
<meta property="og:title" content="${escape(place.name)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:image" content="${SITE_URL}${escape(image.url)}">
<meta property="og:image:type" content="${image.type}">
<meta property="og:image:width" content="${image.width}">
<meta property="og:image:height" content="${image.height}">
<meta property="og:image:alt" content="${escape(place.name)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE_URL}${escape(image.url)}">
<meta http-equiv="refresh" content="0;url=${page}">
</head>
<body><a href="${page}">${escape(place.name)}</a></body>
</html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
