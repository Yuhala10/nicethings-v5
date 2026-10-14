import { isLocale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/i18n/config";
import { getGuest } from "@/lib/guests";
import { paths } from "@/lib/places/paths";
import { SHARE_CACHE, guestShareJpeg, guestStoryJpeg, siteShareJpeg } from "@/lib/share-image";

// A guest's card (lib/share-image.tsx): the preview of their page in a
// conversation, or with ?f=story the tall picture they post as a story.
// Only for guests whose page is out.
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const query = new URL(request.url).searchParams;
    const raw = query.get("l");
    const lang = isLocale(raw) ? raw : "fr";
    const guest = /^[a-z0-9-]{1,60}$/.test(slug) ? await getGuest(slug).catch(() => null) : null;

    if (!guest) {
        return new Response(new Uint8Array(await siteShareJpeg(lang)), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=300, s-maxage=300" } });
    }
    const story = query.get("f") === "story";
    const address = `${SITE_URL.replace(/^https:\/\/(www\.)?/, "")}${paths.guest(lang, guest.slug)}`;
    const image = story ? await guestStoryJpeg(guest, lang, address) : await guestShareJpeg(guest, lang);
    return new Response(new Uint8Array(image), {
        headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": SHARE_CACHE,
            // The story picture is saved to the phone under a name that says what it is.
            ...(story && { "Content-Disposition": `inline; filename="nicethings-${guest.slug}-story.jpg"` }),
        },
    });
}
