import type { Locale } from "../i18n/config";

// Article topics: a label per language and a colour for chips and cards.
export const TOPICS = {
    guide: { fr: "Guides", en: "Guides", tone: "#ff5b36" },
    food: { fr: "Bien manger", en: "Food", tone: "#e8590c" },
    nightlife: { fr: "Sortir", en: "Nightlife", tone: "#c2255c" },
    chill: { fr: "Se détendre", en: "Chill", tone: "#0c8599" },
    culture: { fr: "Culture", en: "Culture", tone: "#7048e8" },
    events: { fr: "Agenda", en: "Events", tone: "#d6336c" },
    tips: { fr: "Conseils", en: "Tips", tone: "#2b8a3e" },
    news: { fr: "Actus NiceThings", en: "NiceThings news", tone: "#17120e" },
} as const;

export type Topic = keyof typeof TOPICS;

export function isTopic(value: unknown): value is Topic {
    return typeof value === "string" && value in TOPICS;
}

export function topicLabel(topic: string, locale: Locale) {
    return isTopic(topic) ? TOPICS[topic][locale] : topic;
}
