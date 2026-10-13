import { isLocale } from "@/lib/i18n";
import { cleanGuestName } from "@/lib/invitations";
import { SHARE_CACHE, invitationShareJpeg, siteShareJpeg } from "@/lib/share-image";

// The card of a personal invitation: the guest's name, set like a printed
// invitation (lib/share-image.tsx). It only draws a name: it opens nothing,
// so it needs no secret. Made once per name, then kept by the CDN.
export async function GET(request: Request) {
    const query = new URL(request.url).searchParams;
    const raw = query.get("l");
    const lang = isLocale(raw) ? raw : "fr";
    const name = cleanGuestName(query.get("n"));

    const image = name ? await invitationShareJpeg(name, lang) : await siteShareJpeg(lang);
    return new Response(new Uint8Array(image), {
        headers: { "Content-Type": "image/jpeg", "Cache-Control": name ? SHARE_CACHE : "public, max-age=300, s-maxage=300" },
    });
}
