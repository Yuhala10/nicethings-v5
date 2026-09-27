import { CITY_TIME_ZONE } from "../i18n/config";
import { DAY_KEYS, type DayKey, type PlaceHours } from "./types";

// Wall-clock time in Yaoundé, whatever zone the server or phone is in.
export function cityNow(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: CITY_TIME_ZONE,
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(date);

    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    const day = get("weekday").toLowerCase() as DayKey;
    const hour = Number(get("hour")) % 24;
    const minute = Number(get("minute"));

    return { day, dayIndex: DAY_KEYS.indexOf(day), minutes: hour * 60 + minute };
}

function toMinutes(time: string) {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + (m || 0);
}

export type OpenState =
    | { status: "unknown" }
    | { status: "open"; closes: string; closingSoon: boolean }
    | { status: "closed"; opens: string; opensDay: DayKey | null }; // null = today

const CLOSING_SOON_MINUTES = 45;

export function getOpenState(hours: PlaceHours, date = new Date()): OpenState {
    if (!hours.opens || !hours.closes || hours.days.length === 0) {
        return { status: "unknown" };
    }

    const now = cityNow(date);
    const opens = toMinutes(hours.opens);
    let closes = toMinutes(hours.closes);
    if (closes <= opens) closes += 24 * 60; // e.g. 18:00 → 02:00

    const yesterday = DAY_KEYS[(now.dayIndex + 6) % 7];
    const openToday = hours.days.includes(now.day);

    // Still inside yesterday's late session (after midnight)?
    if (hours.days.includes(yesterday) && closes > 24 * 60 && now.minutes < closes - 24 * 60) {
        const left = closes - 24 * 60 - now.minutes;
        return { status: "open", closes: hours.closes, closingSoon: left <= CLOSING_SOON_MINUTES };
    }

    if (openToday && now.minutes >= opens && now.minutes < closes) {
        const left = closes - now.minutes;
        return { status: "open", closes: hours.closes, closingSoon: left <= CLOSING_SOON_MINUTES };
    }

    if (openToday && now.minutes < opens) {
        return { status: "closed", opens: hours.opens, opensDay: null };
    }

    for (let offset = 1; offset <= 7; offset++) {
        const day = DAY_KEYS[(now.dayIndex + offset) % 7];
        if (hours.days.includes(day)) {
            return { status: "closed", opens: hours.opens, opensDay: day };
        }
    }

    return { status: "unknown" };
}

export function isOpenNow(hours: PlaceHours, date = new Date()) {
    return getOpenState(hours, date).status === "open";
}

// Is the place open at some point during a window (e.g. "Saturday afternoon")?
export function isOpenDuring(hours: PlaceHours, day: DayKey, fromMinutes: number, toMinutes_: number) {
    if (!hours.opens || !hours.closes) return true; // unknown: don't exclude
    if (!hours.days.includes(day)) return false;
    const opens = toMinutes(hours.opens);
    let closes = toMinutes(hours.closes);
    if (closes <= opens) closes += 24 * 60;
    return opens < toMinutes_ && closes > fromMinutes;
}
