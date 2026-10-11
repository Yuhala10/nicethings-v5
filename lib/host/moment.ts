import type { DiscoveryQuery, IntentKey } from "../concierge/query";
import { fill, type Dictionary } from "../i18n";
import { CITY_TIME_ZONE, type Locale } from "../i18n/config";
import { cityNow } from "../places/hours";
import type { DayKey } from "../places/types";
import { specialDayOn, upcomingDay, type CalendarDate, type SpecialDay } from "./calendar";

// What moment it is in Cameroon: the part of the day, the day of the week,
// and what the calendar says. Everything the app proposes starts from here.

export type Slot = "morning" | "noon" | "afternoon" | "evening" | "night";

export type Moment = {
    slot: Slot;
    day: DayKey;
    special: SpecialDay | null;
    upcoming: { day: SpecialDay; inDays: number } | null;
    // The last days of the month, when salaries have just landed.
    payday: boolean;
};

function calendarDate(date: Date): CalendarDate {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: CITY_TIME_ZONE, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(date);
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    return { year: get("year"), month: get("month"), day: get("day") };
}

function slotAt(minutes: number): Slot {
    if (minutes >= 5 * 60 && minutes < 11 * 60) return "morning";
    if (minutes >= 11 * 60 && minutes < 14 * 60 + 30) return "noon";
    if (minutes >= 14 * 60 + 30 && minutes < 17 * 60 + 30) return "afternoon";
    if (minutes >= 17 * 60 + 30 && minutes < 22 * 60) return "evening";
    return "night";
}

const NIGHT_BELONGS_TO_EVE_MS = 5 * 3_600_000;

export function momentOf(now: Date): Moment {
    const clock = cityNow(now);
    // Until 5 a.m. the night still belongs to the day before: at 1 a.m. on
    // the 26th, people are still out for Christmas.
    const outing = new Date(now.getTime() - NIGHT_BELONGS_TO_EVE_MS);
    const date = calendarDate(outing);
    return {
        slot: slotAt(clock.minutes),
        day: cityNow(outing).day,
        special: specialDayOn(date),
        upcoming: upcomingDay(date),
        payday: date.day >= 26,
    };
}

// The kinds of places that fit the moment, most fitting first.
const SLOT_CATEGORIES: Record<Slot, string[]> = {
    morning: ["Bakery", "Cafe", "Restaurant"],
    noon: ["Restaurant", "Bakery", "Cafe"],
    afternoon: ["Cafe", "Nature", "Culture", "Entertainment", "Bakery"],
    evening: ["Restaurant", "Bar", "Cafe"],
    night: ["Bar", "Club", "Restaurant"],
};

export function momentCategories(moment: Moment): string[] {
    const daytime = moment.slot === "morning" || moment.slot === "noon" || moment.slot === "afternoon";
    if (moment.special?.mood === "date") return ["Restaurant", "Bar", "Cafe"];
    if (moment.special?.mood === "party" && !daytime) return ["Bar", "Club", "Restaurant"];
    // Sundays and family days: the outing matters as much as the table.
    if ((moment.day === "sunday" || moment.special?.mood === "family") && daytime) {
        return ["Restaurant", "Nature", "Cafe", "Culture", "Entertainment", "Bakery"];
    }
    return SLOT_CATEGORIES[moment.slot];
}

// The moment as a search, ranked like every other search on the site.
export function momentQuery(moment: Moment): DiscoveryQuery {
    const query: DiscoveryQuery = { categories: momentCategories(moment) };
    if (moment.special?.mood === "date") return { ...query, vibes: ["romantic", "chic", "calm"], goodFor: ["date"] };
    if (moment.special?.mood === "family" || moment.day === "sunday") return { ...query, goodFor: ["family"] };
    if (moment.slot === "night" || moment.special?.mood === "party") return { ...query, vibes: ["lively"], goodFor: ["friends", "party"] };
    return query;
}

// Where "See all" leads: the search page, already set for the moment.
export function momentIntent(moment: Moment): IntentKey {
    if (moment.special?.mood === "date") return "date";
    if (moment.special?.mood === "family") return "family";
    if (moment.slot === "morning") return "coffee";
    if (moment.slot === "noon") return "eat";
    if (moment.slot === "afternoon") return moment.day === "sunday" ? "family" : "chill";
    return moment.slot === "evening" ? "eat" : "tonight";
}

function capitalise(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

// The words on screen for a moment: a headline, the line under it, and a
// short note when there is something to know (a holiday, a date coming up).
export function momentCopy(moment: Moment, locale: Locale, t: Dictionary) {
    const { slot, day, special, upcoming } = moment;
    const late = slot === "evening" || slot === "night";

    let headline = {
        morning: t.greeting.questionMorning,
        noon: t.greeting.questionNoon,
        afternoon: t.greeting.questionAfternoon,
        evening: t.greeting.questionEvening,
        night: t.greeting.questionNight,
    }[slot];
    if (day === "friday" && late) headline = t.host.fridayNight;
    if (day === "saturday") headline = late ? t.host.saturdayNight : t.host.saturdayDay;
    if (day === "sunday") headline = late ? t.host.sundayNight : t.host.sundayDay;

    let lead = {
        morning: t.host.leadMorning,
        noon: t.host.leadNoon,
        afternoon: t.host.leadAfternoon,
        evening: t.host.leadEvening,
        night: t.host.leadNight,
    }[slot];
    if (moment.payday && late) lead = `${t.host.payday} ${lead}`;

    if (special) {
        headline = special.greeting[locale];
        lead = special.lead[locale];
    }

    const note = special?.holiday
        ? t.host.holidayNote
        : upcoming
          ? capitalise(fill(upcoming.inDays === 1 ? t.host.soonOne : t.host.soonMany, { name: upcoming.day.name[locale], n: upcoming.inDays }))
          : null;

    return { headline, lead, note };
}
