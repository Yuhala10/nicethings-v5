import type { DayKey } from "../places/types";

// A structured discovery request. Produced by the home-screen chips, the
// filter sheet, and the natural-language Concierge alike, so every entry
// point ranks places the same way.

export type TimeWindow = {
    day: DayKey;
    from: number; // minutes since midnight, Yaoundé time
    to: number;
    label: "now" | "morning" | "noon" | "afternoon" | "evening" | "night";
};

export type DiscoveryQuery = {
    text?: string;
    categories?: string[];
    neighborhood?: string | null;
    budgetMax?: number | null; // per person, FCFA
    budgetMin?: number | null;
    groupSize?: number | null;
    vibes?: string[];
    goodFor?: string[];
    amenities?: string[];
    cuisine?: string | null;
    openNow?: boolean;
    when?: TimeWindow | null;
    keywords?: string[]; // leftover words matched against names/cuisine
};

export type IntentKey = "eat" | "coffee" | "tonight" | "date" | "chill" | "family";

// Home-screen mood chips.
export const INTENTS: Record<IntentKey, { icon: string; query: DiscoveryQuery }> = {
    eat: { icon: "🍽️", query: { categories: ["Restaurant"] } },
    coffee: {
        icon: "☕",
        query: { categories: ["Cafe", "Bakery"], goodFor: ["study"], amenities: ["wifi"] },
    },
    tonight: {
        icon: "🌙",
        query: { categories: ["Bar", "Club", "Restaurant"], vibes: ["lively"], goodFor: ["party", "friends"] },
    },
    date: { icon: "❤️", query: { vibes: ["romantic", "chic", "calm"], goodFor: ["date"] } },
    chill: { icon: "😌", query: { vibes: ["calm", "outdoor", "casual"], goodFor: ["friends"] } },
    family: { icon: "👨‍👩‍👧", query: { goodFor: ["family"], categories: ["Restaurant", "Nature", "Entertainment"] } },
};

export function mergeQueries(...queries: (DiscoveryQuery | null | undefined)[]): DiscoveryQuery {
    const result: DiscoveryQuery = {};
    const lists = ["categories", "vibes", "goodFor", "amenities", "keywords"] as const;

    for (const query of queries) {
        if (!query) continue;
        for (const [key, value] of Object.entries(query)) {
            if (value === undefined) continue;
            if ((lists as readonly string[]).includes(key)) {
                const list = key as (typeof lists)[number];
                result[list] = Array.from(new Set([...(result[list] ?? []), ...(value as string[])]));
            } else {
                (result as Record<string, unknown>)[key] = value;
            }
        }
    }

    return result;
}

export function isEmptyQuery(query: DiscoveryQuery) {
    return !Object.entries(query).some(([key, value]) => {
        if (key === "text") return false;
        if (Array.isArray(value)) return value.length > 0;
        return value !== undefined && value !== null && value !== false;
    });
}
