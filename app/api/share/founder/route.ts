import { isLocale } from "@/lib/i18n";
import { SHARE_CACHE, founderShareJpeg } from "@/lib/share-image";

// Link preview of the About page: the founder's portrait with his name.
export async function GET(request: Request) {
    const url = new URL(request.url);
    const raw = url.searchParams.get("l");
    const image = await founderShareJpeg(isLocale(raw) ? raw : "fr", url.origin);
    return new Response(new Uint8Array(image), { headers: { "Content-Type": "image/jpeg", "Cache-Control": SHARE_CACHE } });
}
