import { isLocale } from "@/lib/i18n";
import { cleanGuestName } from "@/lib/invitations";
import { SHARE_CACHE, invitationShareJpeg, siteShareJpeg } from "@/lib/share-image";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// The card of a personal invitation: the guest's name, set like a printed
// invitation (lib/share-image.tsx); green and gold for a guest of honour
// (?t=h), and with the name of the guest of honour who gave it (?g=<their
// ref>). It only draws: it opens nothing, so it needs no secret. A giver's
// name is read from their own card, so nobody can put words in their mouth.
export async function GET(request: Request) {
    const query = new URL(request.url).searchParams;
    const raw = query.get("l");
    const lang = isLocale(raw) ? raw : "fr";
    const name = cleanGuestName(query.get("n"));
    const ref = query.get("g");

    let giver: { ref: string; name: string } | null = null;
    if (ref && /^[0-9a-f]{12}$/.test(ref)) {
        const { data } = await getSupabaseAdminClient().from("nt_guests").select("name,tier").eq("ref", ref).maybeSingle();
        if (data && data.tier === "honour") giver = { ref, name: data.name as string };
    }
    const image = name ? await invitationShareJpeg(name, lang, { tier: query.get("t") === "h" ? "honour" : "guest", giver }) : await siteShareJpeg(lang);
    return new Response(new Uint8Array(image), {
        headers: { "Content-Type": "image/jpeg", "Cache-Control": name ? SHARE_CACHE : "public, max-age=300, s-maxage=300" },
    });
}
