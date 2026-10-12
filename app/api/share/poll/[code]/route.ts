import { isLocale } from "@/lib/i18n";
import { POLL_CODE } from "@/lib/polls";
import { readPoll } from "@/lib/polls-server";
import { SHARE_CACHE, pollShareJpeg, siteShareJpeg } from "@/lib/share-image";

// The card of a vote, as a group chat shows it under the link: the places
// proposed and the question (lib/share-image.tsx). The places of a vote never
// change, so a card is made once per version (?v=…) and kept by the CDN.
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const raw = new URL(request.url).searchParams.get("l");
    const lang = isLocale(raw) ? raw : "fr";
    const poll = POLL_CODE.test(code) ? await readPoll(code, null).catch(() => null) : null;
    const ready = poll && poll.options.length > 0;

    const image = ready ? await pollShareJpeg(poll, lang) : await siteShareJpeg(lang);
    return new Response(new Uint8Array(image), {
        headers: { "Content-Type": "image/jpeg", "Cache-Control": ready ? SHARE_CACHE : "public, max-age=300, s-maxage=300" },
    });
}
