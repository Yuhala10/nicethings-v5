import { isLocale } from "@/lib/i18n";
import { SHARE_CACHE, siteShareJpeg } from "@/lib/share-image";

// Link preview for every page without its own (home, cities, guides).
export async function GET(request: Request) {
    const raw = new URL(request.url).searchParams.get("l");
    const image = await siteShareJpeg(isLocale(raw) ? raw : "fr");
    return new Response(new Uint8Array(image), { headers: { "Content-Type": "image/jpeg", "Cache-Control": SHARE_CACHE } });
}
