import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, SITE_URL, getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { fill } from "@/lib/i18n";
import { readInvitation } from "@/lib/invitations";
import { paths } from "@/lib/places/paths";
import { invitationShareImage } from "@/lib/share-image";

// The address of a personal invitation, as it is sent: /i/<code>.
//
// A person is taken to their invitation, in their own language. A messaging
// app building the card of the link gets a page of a few lines with only
// what the card needs, so the invitation arrives as a card bearing the
// guest's name even when the message is sent quickly.

const CARD_BUILDERS = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|slackbot|discordbot|linkedinbot|skypeuripreview|pinterest|vkshare|redditbot|snapchat|viber|line\//i;

function preferred(request: NextRequest): Locale {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    if (isLocale(saved)) return saved;
    for (const part of (request.headers.get("accept-language") ?? "").split(",")) {
        const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
        if (isLocale(code)) return code;
    }
    return DEFAULT_LOCALE;
}

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const invitation = readInvitation(code);
    const lang = preferred(request);
    // An invitation that has run out still leads somewhere kind: the page says so.
    const page = `${SITE_URL}${paths.invitation(lang, code)}`;
    if (!invitation || !CARD_BUILDERS.test(request.headers.get("user-agent") ?? "")) return NextResponse.redirect(page, 307);

    // The card is written in French, the language most invitations are sent in.
    const t = getDictionary(DEFAULT_LOCALE);
    const title = fill(t.invitation.cardTitle, { name: invitation.name });
    const image = invitationShareImage(invitation.name, DEFAULT_LOCALE);
    const html = `<!doctype html>
<html lang="${DEFAULT_LOCALE}">
<head>
<meta charset="utf-8">
<title>${escape(title)}</title>
<meta name="description" content="${escape(t.invitation.cardBody)}">
<meta name="robots" content="noindex">
<meta property="og:type" content="website">
<meta property="og:site_name" content="NiceThings">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(t.invitation.cardBody)}">
<meta property="og:image" content="${SITE_URL}${escape(image.url)}">
<meta property="og:image:type" content="${image.type}">
<meta property="og:image:width" content="${image.width}">
<meta property="og:image:height" content="${image.height}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE_URL}${escape(image.url)}">
<meta http-equiv="refresh" content="0;url=${page}">
</head>
<body><a href="${page}">${escape(title)}</a></body>
</html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
