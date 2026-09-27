import { en } from "./en";
import { fr, type Dictionary } from "./fr";
import type { Locale } from "./config";

export * from "./config";
export type { Dictionary };

const DICTIONARIES: Record<Locale, Dictionary> = { fr, en };

export function getDictionary(locale: Locale): Dictionary {
    return DICTIONARIES[locale];
}

// "{count} lieux" + { count: 3 } → "3 lieux"
export function fill(template: string, values: Record<string, string | number>) {
    return template.replace(/\{(\w+)\}/g, (match, key) =>
        key in values ? String(values[key]) : match
    );
}
