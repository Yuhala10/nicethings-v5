import type { Locale } from "../i18n/config";

// Cameroon's calendar: the public holidays and the dates the whole country
// marks. Fixed dates and the ones that follow Easter are computed here. The
// Muslim feasts (the end of Ramadan, Tabaski) move with the moon and are
// announced each year, so they are not guessed.

type Text = Record<Locale, string>;

export type SpecialDay = {
    key: string;
    // As it reads inside a sentence: "Noël", "la fête nationale".
    name: Text;
    // The headline on the day itself, and the line under it.
    greeting: Text;
    lead: Text;
    // A public holiday: opening hours may differ from the usual.
    holiday: boolean;
    // What people look for that day, when it is not the usual.
    mood?: "date" | "party" | "family";
    // Worth announcing a few days ahead.
    announce: boolean;
};

type Rule = { month: number; day: number } | { easter: number };

const DAYS: (SpecialDay & { on: Rule })[] = [
    {
        key: "new-year",
        on: { month: 1, day: 1 },
        name: { fr: "le Nouvel An", en: "New Year's Day" },
        greeting: { fr: "Bonne année !", en: "Happy New Year!" },
        lead: { fr: "Le premier jour de l'année se passe à table.", en: "The first day of the year is best spent around a table." },
        holiday: true,
        mood: "family",
        announce: false,
    },
    {
        key: "youth-day",
        on: { month: 2, day: 11 },
        name: { fr: "la fête de la Jeunesse", en: "Youth Day" },
        greeting: { fr: "Bonne fête de la Jeunesse !", en: "Happy Youth Day!" },
        lead: { fr: "Après le défilé, on se retrouve où ?", en: "After the parade, where do we meet?" },
        holiday: true,
        mood: "party",
        announce: true,
    },
    {
        key: "valentine",
        on: { month: 2, day: 14 },
        name: { fr: "la Saint-Valentin", en: "Valentine's Day" },
        greeting: { fr: "C'est la Saint-Valentin.", en: "It's Valentine's Day." },
        lead: { fr: "Une table pour deux, ça se choisit bien.", en: "A table for two deserves a good choice." },
        holiday: false,
        mood: "date",
        announce: true,
    },
    {
        key: "women-day",
        on: { month: 3, day: 8 },
        name: { fr: "le 8 mars", en: "the 8th of March" },
        greeting: { fr: "Bonne fête du 8 mars !", en: "Happy 8th of March!" },
        lead: { fr: "Après le défilé, la fête continue.", en: "After the parade, the celebration goes on." },
        holiday: false,
        mood: "party",
        announce: true,
    },
    {
        key: "good-friday",
        on: { easter: -2 },
        name: { fr: "le Vendredi saint", en: "Good Friday" },
        greeting: { fr: "C'est le Vendredi saint.", en: "It's Good Friday." },
        lead: { fr: "Jour férié : la journée est à toi.", en: "A public holiday: the day is yours." },
        holiday: true,
        announce: false,
    },
    {
        key: "easter",
        on: { easter: 0 },
        name: { fr: "Pâques", en: "Easter" },
        greeting: { fr: "Joyeuses Pâques !", en: "Happy Easter!" },
        lead: { fr: "Un dimanche à passer en famille.", en: "A Sunday to spend with the family." },
        holiday: false,
        mood: "family",
        announce: false,
    },
    {
        key: "labour-day",
        on: { month: 5, day: 1 },
        name: { fr: "la fête du Travail", en: "Labour Day" },
        greeting: { fr: "Bonne fête du Travail !", en: "Happy Labour Day!" },
        lead: { fr: "Après le défilé, on se retrouve autour d'un verre.", en: "After the parade, we meet over a drink." },
        holiday: true,
        mood: "party",
        announce: true,
    },
    {
        key: "ascension",
        on: { easter: 39 },
        name: { fr: "l'Ascension", en: "Ascension Day" },
        greeting: { fr: "C'est l'Ascension.", en: "It's Ascension Day." },
        lead: { fr: "Jour férié : la journée est à toi.", en: "A public holiday: the day is yours." },
        holiday: true,
        announce: false,
    },
    {
        key: "national-day",
        on: { month: 5, day: 20 },
        name: { fr: "la fête nationale", en: "National Day" },
        greeting: { fr: "Bonne fête nationale !", en: "Happy National Day!" },
        lead: { fr: "Le 20 mai se fête dans tout le pays.", en: "The 20th of May is celebrated across the country." },
        holiday: true,
        mood: "party",
        announce: true,
    },
    {
        key: "assumption",
        on: { month: 8, day: 15 },
        name: { fr: "le 15 août", en: "the 15th of August" },
        greeting: { fr: "C'est le 15 août.", en: "It's the 15th of August." },
        lead: { fr: "Jour férié : une bonne table, et on se pose.", en: "A public holiday: a good table, and time to unwind." },
        holiday: true,
        mood: "family",
        announce: false,
    },
    {
        key: "christmas-eve",
        on: { month: 12, day: 24 },
        name: { fr: "le réveillon de Noël", en: "Christmas Eve" },
        greeting: { fr: "Ce soir, c'est le réveillon.", en: "It's Christmas Eve." },
        lead: { fr: "Où passer la veille de Noël ?", en: "Where to spend the evening?" },
        holiday: false,
        mood: "family",
        announce: false,
    },
    {
        key: "christmas",
        on: { month: 12, day: 25 },
        name: { fr: "Noël", en: "Christmas" },
        greeting: { fr: "Joyeux Noël !", en: "Merry Christmas!" },
        lead: { fr: "Les bonnes adresses pour fêter aujourd'hui.", en: "Good places to celebrate today." },
        holiday: true,
        mood: "family",
        announce: true,
    },
    {
        key: "new-year-eve",
        on: { month: 12, day: 31 },
        name: { fr: "le 31 décembre", en: "New Year's Eve" },
        greeting: { fr: "Ce soir, on change d'année.", en: "Tonight, the year turns." },
        lead: { fr: "Où faire le 31 ?", en: "Where to spend the 31st?" },
        holiday: false,
        mood: "party",
        announce: true,
    },
];

// Easter Sunday of a year (Gregorian calendar), as [month, day].
function easter(year: number): [number, number] {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return [month, day];
}

const DAY_MS = 86_400_000;

// A calendar date as a day number, so dates can be compared and counted.
function dayNumber(year: number, month: number, day: number) {
    return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function dayNumberOf(rule: Rule, year: number) {
    if ("easter" in rule) {
        const [month, day] = easter(year);
        return dayNumber(year, month, day) + rule.easter;
    }
    return dayNumber(year, rule.month, rule.day);
}

export type CalendarDate = { year: number; month: number; day: number };

export function specialDayOn({ year, month, day }: CalendarDate): SpecialDay | null {
    const today = dayNumber(year, month, day);
    return DAYS.find((item) => dayNumberOf(item.on, year) === today) ?? null;
}

// The next day worth announcing, when it is close (tomorrow to `within` days).
export function upcomingDay({ year, month, day }: CalendarDate, within = 6): { day: SpecialDay; inDays: number } | null {
    const today = dayNumber(year, month, day);
    let best: { day: SpecialDay; inDays: number } | null = null;
    for (const item of DAYS) {
        if (!item.announce) continue;
        // This year's date, or next year's when it has already passed.
        for (const candidate of [dayNumberOf(item.on, year), dayNumberOf(item.on, year + 1)]) {
            const inDays = candidate - today;
            if (inDays >= 1 && inDays <= within && (!best || inDays < best.inDays)) best = { day: item, inDays };
        }
    }
    return best;
}
