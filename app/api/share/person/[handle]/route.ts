import { isLocale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/i18n/config";
import { personShareJpeg, personStoryJpeg } from "@/lib/people/card";
import { getProfilePage } from "@/lib/people/pages";
import { normalizeHandle } from "@/lib/people/rules";
import { SHARE_CACHE, siteShareJpeg } from "@/lib/share-image";

// A member's card (lib/people/card.tsx): the preview of their profile in a
// conversation, or with ?f=story the tall card they post as a status or a
// story, with the QR code to their page.
export async function GET(request: Request, { params }: { params: Promise<{ handle: string }> }) {
    const { handle } = await params;
    const query = new URL(request.url).searchParams;
    const raw = query.get("l");
    const lang = isLocale(raw) ? raw : "fr";
    const page = await getProfilePage(normalizeHandle(decodeURIComponent(handle))).catch(() => null);

    if (!page) {
        return new Response(new Uint8Array(await siteShareJpeg(lang)), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=300, s-maxage=300" } });
    }
    const story = query.get("f") === "story";
    const short = `${SITE_URL.replace(/^https:\/\/(www\.)?/, "")}/@${page.person.handle}`;
    const image = story ? await personStoryJpeg(page, lang, short, `https://${short}`) : await personShareJpeg(page, lang);
    return new Response(new Uint8Array(image), {
        headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": SHARE_CACHE,
            ...(story && { "Content-Disposition": `inline; filename="nicethings-${page.person.handle}-carte.jpg"` }),
        },
    });
}
