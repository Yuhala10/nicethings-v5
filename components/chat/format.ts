import { fill, type Locale } from "@/lib/i18n";
import type { PeopleWords } from "@/lib/i18n/people";
import type { ChatKind, ChatPresence } from "@/lib/people/types";

// Times and short texts of messages, in Douala time like the rest of the site.

type Words = PeopleWords["chat"];
const ZONE = "Africa/Douala";
const tag = (locale: Locale) => (locale === "fr" ? "fr-FR" : "en-GB");
const dayKey = (iso: string | number) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(new Date(iso));

export const timeOf = (iso: string, locale: Locale) => new Intl.DateTimeFormat(tag(locale), { hour: "2-digit", minute: "2-digit", timeZone: ZONE }).format(new Date(iso));

export function isSameDay(a: string, b: string) {
    return dayKey(a) === dayKey(b);
}

function relativeDay(iso: string) {
    const day = dayKey(iso);
    if (day === dayKey(Date.now())) return "today";
    if (day === dayKey(Date.now() - 86_400_000)) return "yesterday";
    return null;
}

// "Aujourd'hui", "Hier", "lundi 12 octobre".
export function dayLabel(iso: string, locale: Locale, words: Words) {
    const relative = relativeDay(iso);
    if (relative === "today") return words.today;
    if (relative === "yesterday") return words.yesterday;
    return new Intl.DateTimeFormat(tag(locale), { weekday: "long", day: "numeric", month: "long", timeZone: ZONE }).format(new Date(iso));
}

// In the inbox: the time today, "Hier", the weekday this week, the date before.
export function inboxTime(iso: string, locale: Locale, words: Words) {
    const relative = relativeDay(iso);
    if (relative === "today") return timeOf(iso, locale);
    if (relative === "yesterday") return words.yesterday;
    if (Date.now() - Date.parse(iso) < 6 * 86_400_000) return new Intl.DateTimeFormat(tag(locale), { weekday: "long", timeZone: ZONE }).format(new Date(iso));
    return new Intl.DateTimeFormat(tag(locale), { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: ZONE }).format(new Date(iso));
}

export function presenceText(presence: ChatPresence, locale: Locale, words: Words) {
    if (presence.online) return words.online;
    if (!presence.lastSeen) return "";
    const relative = relativeDay(presence.lastSeen);
    const time = timeOf(presence.lastSeen, locale);
    if (relative === "today") return fill(words.lastSeenToday, { time });
    if (relative === "yesterday") return fill(words.lastSeenYesterday, { time });
    return fill(words.lastSeenDate, { date: new Intl.DateTimeFormat(tag(locale), { day: "numeric", month: "short", timeZone: ZONE }).format(new Date(presence.lastSeen)) });
}

// What a message says in one line (inbox, reply quote).
export function previewOf(kind: ChatKind, body: string | null, words: Words, place?: string | null) {
    if (kind === "photo") return body ? `📷 ${body}` : words.preview.photo;
    if (kind === "voice") return words.preview.voice;
    if (kind === "place") return place ? `📍 ${place}` : words.preview.place;
    if (kind === "plan") return `📅 ${words.preview.plan}${place ? ` ${place}` : ""}`;
    return (body ?? "").replace(/\s+/g, " ").trim();
}

// "1:05" for a voice note.
export const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
