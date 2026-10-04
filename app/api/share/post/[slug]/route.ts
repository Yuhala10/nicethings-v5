import { isLocale } from "@/lib/i18n";
import { getPost } from "@/lib/blog/server";
import { SHARE_CACHE, postShareJpeg, siteShareJpeg } from "@/lib/share-image";

// Link preview of an article: its cover with the title, or the card.
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const raw = new URL(request.url).searchParams.get("l");
    const lang = isLocale(raw) ? raw : "fr";
    const post = await getPost(slug).catch(() => null);

    const image = post ? await postShareJpeg(post, lang) : await siteShareJpeg(lang);
    return new Response(new Uint8Array(image), {
        headers: { "Content-Type": "image/jpeg", "Cache-Control": post ? SHARE_CACHE : "public, max-age=300, s-maxage=300" },
    });
}
