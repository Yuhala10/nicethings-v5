import { after } from "next/server";
import webpush from "web-push";
import { SITE_URL, fill, getDictionary, isLocale, type Locale } from "../i18n";
import { paths } from "../places/paths";
import { pushKeys } from "../push-server";
import { getSupabaseAdminClient } from "../supabase/admin";
import { levelOf, pointsOf } from "./rules";
import { statsOf } from "./server";
import type { Notice } from "./types";

// Activité (server only): what happens to a member's reviews, photos, words
// and ways, written down for them, and sent to their phones when they asked
// for it. Their own gestures never notify them, and a like taken back and
// given again is told once. Everything is quiet before script 012.

type Kind = Notice["kind"];
type Data = { place?: string; name?: string; level?: number; snippet?: string; post?: string; review?: string; tip?: string; outing?: string };

// The sentence of a notice, for Activité and for the phone.
export function noticeText(kind: Kind, data: Data, actor: string | null, lang: Locale) {
    const words = getDictionary(lang).people;
    return fill(words.activity[kind], { actor: actor ? `@${actor}` : "", place: data.name ?? "", level: words.levels[data.level ?? 0] ?? "" });
}

function noticeUrl(kind: Kind, data: Data, lang: Locale, actor: string | null) {
    if (data.outing) return paths.outing(lang, data.outing);
    if (kind === "follow" && actor) return paths.person(lang, actor);
    if (kind === "level" || !data.place) return paths.me(lang);
    return `${paths.place(lang, data.place)}${kind === "tip_vote" ? "#y-aller" : kind === "like" || kind === "comment" ? "" : "#avis"}`;
}

async function sendToPhones(profileId: string, kind: Kind, data: Data, actorHandle: string | null) {
    const keys = pushKeys();
    if (!keys) return;
    const db = getSupabaseAdminClient();
    const phones = await db.from("nt_profile_phones").select("endpoint,p256dh,auth,lang,failures").eq("profile_id", profileId).limit(5);
    if (phones.error || !phones.data?.length) return;
    webpush.setVapidDetails(SITE_URL, keys.publicKey, keys.privateKey);
    await Promise.all(
        phones.data.map(async (phone) => {
            const lang = isLocale(phone.lang) ? phone.lang : "fr";
            const payload = JSON.stringify({ title: "NiceThings", body: noticeText(kind, data, actorHandle, lang), url: noticeUrl(kind, data, lang, actorHandle), tag: `activity-${kind}`, lang });
            try {
                await webpush.sendNotification({ endpoint: phone.endpoint, keys: { p256dh: phone.p256dh, auth: phone.auth } }, payload, { TTL: 86_400 });
                await db.from("nt_profile_phones").update({ last_sent_at: new Date().toISOString(), failures: 0 }).eq("endpoint", phone.endpoint);
            } catch (error) {
                const status = (error as { statusCode?: number } | null)?.statusCode;
                // Gone for good, or failing again and again: forgotten.
                if (status === 404 || status === 410 || (phone.failures ?? 0) >= 4) await db.from("nt_profile_phones").delete().eq("endpoint", phone.endpoint);
                else await db.from("nt_profile_phones").update({ failures: (phone.failures ?? 0) + 1 }).eq("endpoint", phone.endpoint);
            }
        })
    );
}

// Tells `recipient` that `actor` did something to what they gave. Never
// fails the request it comes from.
export async function notify(recipient: string | null | undefined, kind: Kind, actor: { id: string; handle: string } | null, data: Data) {
    if (!recipient || recipient === actor?.id) return;
    try {
        const db = getSupabaseAdminClient();
        // A like (a "validé", a "utile", a follow…) taken back and given again is told once.
        const about: Record<string, string | undefined> | null =
            kind === "like" ? { post: data.post } : kind === "vote" ? { review: data.review } : kind === "tip_vote" ? { tip: data.tip } : kind === "outing_like" || kind === "going" ? { outing: data.outing } : kind === "follow" ? {} : null;
        if (about && actor && (kind === "follow" || Object.values(about)[0])) {
            const told = await db.from("nt_notices").select("id").eq("profile_id", recipient).eq("kind", kind).eq("actor_id", actor.id).contains("data", about).limit(1);
            if (told.data?.length) return;
        }
        const saved = await db.from("nt_notices").insert({ profile_id: recipient, kind, actor_id: actor?.id ?? null, data });
        if (saved.error) return;
        after(() => sendToPhones(recipient, kind, data, actor?.handle ?? null).catch((error) => console.error("Activity push failed:", error)));
    } catch (error) {
        console.error("Notice not written:", error);
    }
}

// After anything that gives points: a member who just reached a new level
// is told once, and the site celebrates it the next time they open it.
export async function checkLevel(profileId: string | null | undefined) {
    if (!profileId) return;
    try {
        const db = getSupabaseAdminClient();
        const [row, stats] = await Promise.all([db.from("nt_profiles").select("last_level").eq("id", profileId).maybeSingle(), statsOf([profileId])]);
        if (row.error || !row.data) return;
        const { level } = levelOf(pointsOf(stats.get(profileId) ?? { reviews: 0, photos: 0, comments: 0, cheers: 0 }));
        if (level <= Number(row.data.last_level ?? 0)) return;
        // Written first, so two requests at once celebrate it once.
        const moved = await db.from("nt_profiles").update({ last_level: level }).eq("id", profileId).lt("last_level", level).select("id");
        if (!moved.data?.length) return;
        await notify(profileId, "level", null, { level });
    } catch (error) {
        console.error("Level not checked:", error);
    }
}
