import webpush from "web-push";
import { notInstalled } from "./atlas/store";
import { cityBySlug, type City } from "./cities";
import { momentOf } from "./host/moment";
import { proposeNow } from "./host/propose";
import type { Weather } from "./host/weather";
import { SITE_URL, fill, getDictionary, isLocale, type Locale } from "./i18n";
import { cityNow, getOpenState } from "./places/hours";
import { paths } from "./places/paths";
import { getCityPlaces } from "./places/server";
import { getSupabaseAdminClient } from "./supabase/admin";

// Weather notices (server only). A visitor who asked for them is told when
// the rain starts over their city, or on a very hot afternoon, with a few
// places open at that moment. Useful or silent: never at night, never twice
// about the same sky, never more than once a day on one phone, and nothing
// at all when there is no open place to name.
//
// Off until database script 008 has been run and the two keys the notices
// are signed with are set on the host.

// Notices are for the day: these are minutes of the day, city time.
const DAY_STARTS = 7 * 60;
const DAY_ENDS = 21 * 60;
const HEAT_FROM = 11 * 60;
const HEAT_UNTIL = 16 * 60;
// A city is not told twice within this time, in hours.
const CITY_REST = 8;
// One phone is told once a day at most, in hours.
const PHONE_REST = 20;
const MAX_PHONES = 500;
// How many places a notice names.
const NAMED = 3;
// A notice about the rain is of no use an hour later, in seconds.
const KEPT_FOR = 3600;

// The services browsers receive notices through; nothing is ever sent elsewhere.
const NOTICE_SERVICES = /(^|\.)(googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com)$/;
const KEY_SHAPE = /^[A-Za-z0-9_-]{16,200}$/;

export function pushKeys() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    return publicKey && privateKey ? { publicKey, privateKey } : null;
}

// Whether a visitor can ask for notices: the keys are set and the tables exist.
export async function pushReady() {
    if (!pushKeys()) return false;
    // A plain read: a "head" request has no body, so a missing table would not say so.
    const { error } = await getSupabaseAdminClient().from("nt_push_subscriptions").select("id").limit(1);
    if (error && !notInstalled(error)) throw error;
    return !error;
}

export type PhoneAddress = { endpoint: string; p256dh: string; auth: string };

// What a browser hands over, checked: null when it is not a real address.
export function readPhoneAddress(body: Record<string, unknown>): PhoneAddress | null {
    const { endpoint, p256dh, auth } = body;
    if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string") return null;
    if (endpoint.length > 1000 || !KEY_SHAPE.test(p256dh) || !KEY_SHAPE.test(auth)) return null;
    try {
        const url = new URL(endpoint);
        return url.protocol === "https:" && NOTICE_SERVICES.test(url.hostname) ? { endpoint, p256dh, auth } : null;
    } catch {
        return null;
    }
}

export async function savePhone(address: PhoneAddress, city: string, lang: Locale) {
    const { error } = await getSupabaseAdminClient().from("nt_push_subscriptions").upsert({ ...address, city, lang, failures: 0 }, { onConflict: "endpoint" });
    if (error) throw error;
}

export async function forgetPhone(endpoint: string) {
    const { error } = await getSupabaseAdminClient().from("nt_push_subscriptions").delete().eq("endpoint", endpoint);
    // Before the tables exist there is nothing to forget.
    if (error && !notInstalled(error)) throw error;
}

// Tells the phones of a city about its sky, if there is something to say
// and someone to say it to. Returns how many phones were reached.
export async function weatherNotice(city: City, weather: Weather, now = new Date()) {
    const keys = pushKeys();
    const sky = weather.sky;
    if (!keys || !sky) return 0;
    const minutes = cityNow(now).minutes;
    if (minutes < DAY_STARTS || minutes > DAY_ENDS) return 0;
    if (sky === "heat" && (minutes < HEAT_FROM || minutes > HEAT_UNTIL)) return 0;

    const db = getSupabaseAdminClient();
    const ago = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();
    const told = await db.from("nt_push_notices").select("id").eq("city", city.slug).gte("created_at", ago(CITY_REST)).limit(1);
    if (told.error) {
        if (notInstalled(told.error)) return 0;
        throw told.error;
    }
    if (told.data?.length) return 0;

    const phones = await db
        .from("nt_push_subscriptions")
        .select("id,endpoint,p256dh,auth,lang")
        .eq("city", city.slug)
        .or(`last_sent_at.is.null,last_sent_at.lt.${ago(PHONE_REST)}`)
        .limit(MAX_PHONES);
    if (phones.error) throw phones.error;
    if (!phones.data?.length) return 0;

    // Places open at this hour that fit the sky, the way "right now" picks them.
    const open = (await getCityPlaces(city.slug)).filter((place) => getOpenState(place.hours, now).status === "open");
    const names = proposeNow(open, { moment: { ...momentOf(now), weather }, now, origin: null, limit: NAMED }).map((item) => item.place.name);
    if (names.length === 0) return 0;

    // Written down before sending: a second request in the same minute finds it and stays quiet.
    const noted = await db.from("nt_push_notices").insert({ city: city.slug, sky }).select("id").single();
    if (noted.error) throw noted.error;

    const words = (lang: Locale) => {
        const t = getDictionary(lang);
        const places = new Intl.ListFormat(lang, { style: "long", type: "conjunction" }).format(names);
        return JSON.stringify({
            title: fill(sky === "rain" ? t.notice.rainTitle : t.notice.heatTitle, { city: city.name, temperature: Math.round(weather.temperature ?? 0) }),
            body: fill(sky === "rain" ? t.notice.rainBody : t.notice.heatBody, { places }),
            url: `${paths.city(lang, city.slug)}?ref=meteo`,
            tag: `weather-${city.slug}`,
            lang,
        });
    };

    webpush.setVapidDetails(SITE_URL, keys.publicKey, keys.privateKey);
    let sent = 0;
    await Promise.all(
        phones.data.map(async (phone) => {
            try {
                await webpush.sendNotification({ endpoint: phone.endpoint, keys: { p256dh: phone.p256dh, auth: phone.auth } }, words(isLocale(phone.lang) ? phone.lang : "fr"), { TTL: KEPT_FOR });
                sent++;
                await db.from("nt_push_subscriptions").update({ last_sent_at: now.toISOString(), failures: 0 }).eq("id", phone.id);
            } catch (error) {
                const status = (error as { statusCode?: number } | null)?.statusCode;
                // The browser has withdrawn its address: it is forgotten.
                if (status === 404 || status === 410) await db.from("nt_push_subscriptions").delete().eq("id", phone.id);
                else console.error("Notice not sent:", status ?? error);
            }
        })
    );
    await db.from("nt_push_notices").update({ sent }).eq("id", noted.data.id);
    return sent;
}

// ---- For the team's console ---------------------------------------------------

// How many phones asked to be told, city by city, and the last notices sent.
export async function pushStatus() {
    const db = getSupabaseAdminClient();
    const phones = await db.from("nt_push_subscriptions").select("city").limit(5000);
    if (phones.error) {
        if (notInstalled(phones.error)) return { ready: false, phones: 0, cities: [], notices: [] };
        throw phones.error;
    }
    const counts = new Map<string, number>();
    for (const row of phones.data ?? []) counts.set(row.city, (counts.get(row.city) ?? 0) + 1);
    const notices = await db.from("nt_push_notices").select("city,sky,sent,created_at").order("created_at", { ascending: false }).limit(5);
    if (notices.error) throw notices.error;
    return {
        ready: Boolean(pushKeys()),
        phones: phones.data?.length ?? 0,
        cities: [...counts].map(([city, count]) => ({ city, phones: count })).sort((a, b) => b.phones - a.phones),
        notices: notices.data ?? [],
    };
}

// A trial notice to the phone that signed up last: the way for the team to
// see one arrive without waiting for the rain. It says what it is, and
// counts for nothing in the once-a-day rule.
export async function sendTrialNotice(): Promise<{ sent: boolean; why?: "keys" | "nobody" | "gone" | "refused"; city?: string }> {
    const keys = pushKeys();
    if (!keys) return { sent: false, why: "keys" };
    const db = getSupabaseAdminClient();
    const latest = await db.from("nt_push_subscriptions").select("id,endpoint,p256dh,auth,lang,city").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (latest.error) throw latest.error;
    const phone = latest.data;
    if (!phone) return { sent: false, why: "nobody" };

    const lang: Locale = isLocale(phone.lang) ? phone.lang : "fr";
    const t = getDictionary(lang);
    const city = cityBySlug(phone.city);
    const notice = JSON.stringify({ title: t.notice.trialTitle, body: fill(t.notice.trialBody, { city: city?.name ?? phone.city }), url: `${paths.city(lang, phone.city)}?ref=meteo`, tag: "trial", lang });
    webpush.setVapidDetails(SITE_URL, keys.publicKey, keys.privateKey);
    try {
        await webpush.sendNotification({ endpoint: phone.endpoint, keys: { p256dh: phone.p256dh, auth: phone.auth } }, notice, { TTL: 600 });
        return { sent: true, city: city?.name ?? phone.city };
    } catch (error) {
        const status = (error as { statusCode?: number } | null)?.statusCode;
        if (status === 404 || status === 410) {
            await db.from("nt_push_subscriptions").delete().eq("id", phone.id);
            return { sent: false, why: "gone" };
        }
        console.error("Trial notice not sent:", status ?? error);
        return { sent: false, why: "refused" };
    }
}
