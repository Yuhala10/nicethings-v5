import { isLocale } from "@/lib/i18n";
import { getPlace } from "@/lib/places/server";
import { SHARE_CACHE, placeShareJpeg, siteShareJpeg } from "@/lib/share-image";

// The card of a place, as conversations show it under a shared link: its
// photo beside its name (lib/share-image.tsx). Made once per version
// (?v=…), then served from the CDN.
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const raw = new URL(request.url).searchParams.get("l");
    const lang = isLocale(raw) ? raw : "fr";
    const place = await getPlace(slug).catch(() => null);

    const image = place ? await placeShareJpeg(place, lang) : await siteShareJpeg(lang);
    return new Response(new Uint8Array(image), {
        headers: {
            "Content-Type": "image/jpeg",
            // An unknown place may be published later: don't keep its stand-in.
            "Cache-Control": place ? SHARE_CACHE : "public, max-age=300, s-maxage=300",
        },
    });
}
