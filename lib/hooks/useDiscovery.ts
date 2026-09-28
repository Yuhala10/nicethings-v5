"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { buildRails } from "../concierge/discover";
import { parseDiscoveryText } from "../concierge/parse";
import { INTENTS, isEmptyQuery, mergeQueries, type DiscoveryQuery, type IntentKey } from "../concierge/query";
import { rankPlaces, type SortMode } from "../concierge/rank";
import type { Dictionary, Locale } from "../i18n";
import { formatPriceShort } from "../i18n/format";
import type { LatLng } from "../places/geo";
import { getOpenState } from "../places/hours";
import type { PlaceSummary } from "../places/types";
import { AMENITIES, BUDGETS, CATEGORIES, GOOD_FOR, VIBES, tagLabel } from "../tags";

// The shared "what are you looking for" state behind both the search page
// and the map: typed sentence, quick picks, filters, ranking, rails. Both
// screens rank places the same way and hand the query to each other in the
// URL (?q=…&i=…).

export type BudgetKey = (typeof BUDGETS)[number]["key"];

// Chips only appear once enough places carry the data behind them.
export const MIN_PRICED_FOR_BUDGETS = 30;
export const MIN_OPEN_FOR_CHIP = 5;

function budgetQuery(key: BudgetKey | null): DiscoveryQuery | null {
    const band = BUDGETS.find((item) => item.key === key);
    if (!band) return null;
    return { budgetMin: "min" in band ? band.min : null, budgetMax: "max" in band ? band.max : null };
}

export function useDiscovery({
    places,
    areas,
    origin,
    now,
    locale,
    t,
    initialText = "",
    initialIntent = null,
}: {
    places: PlaceSummary[];
    areas: readonly { name: string; lat: number; lng: number }[];
    origin: LatLng | null;
    now: Date | null;
    locale: Locale;
    t: Dictionary;
    initialText?: string;
    initialIntent?: IntentKey | null;
}) {
    const [text, setTextState] = useState(initialText);
    const deferredText = useDeferredValue(text);
    const [intent, setIntent] = useState<IntentKey | null>(initialIntent);
    const [categories, setCategories] = useState<string[] | null>(null);
    const [budget, setBudget] = useState<BudgetKey | null>(null);
    const [openNow, setOpenNow] = useState(false);
    const [sort, setSort] = useState<SortMode>("best");
    const [removed, setRemoved] = useState<string[]>([]); // understood tokens the visitor dismissed

    const setText = (value: string) => {
        setTextState(value);
        setRemoved([]);
    };

    const parsed = useMemo(
        () => (deferredText.trim().length > 1 ? parseDiscoveryText(deferredText, now ?? undefined, areas) : null),
        [deferredText, now, areas]
    );

    const understood = useMemo(() => {
        if (!parsed) return [];
        const tokens: { key: string; label: string }[] = [];
        parsed.categories?.forEach((value) => tokens.push({ key: `c:${value}`, label: tagLabel(CATEGORIES, value, locale) }));
        if (parsed.neighborhood) tokens.push({ key: "n", label: parsed.neighborhood });
        if (parsed.budgetMax) tokens.push({ key: "b", label: `≤ ${formatPriceShort(parsed.budgetMax, locale)} FCFA` });
        if (parsed.when) tokens.push({ key: "w", label: parsed.when.label === "now" ? t.filters.openNow : t.days[parsed.when.day] });
        if (parsed.groupSize) tokens.push({ key: "g", label: `${parsed.groupSize} pers.` });
        parsed.vibes?.forEach((value) => tokens.push({ key: `v:${value}`, label: tagLabel(VIBES, value, locale) }));
        parsed.goodFor?.forEach((value) => tokens.push({ key: `f:${value}`, label: tagLabel(GOOD_FOR, value, locale) }));
        parsed.amenities?.forEach((value) => tokens.push({ key: `a:${value}`, label: tagLabel(AMENITIES, value, locale) }));
        return tokens.filter((token) => !removed.includes(token.key));
    }, [parsed, removed, locale, t]);

    const query = useMemo(() => {
        let typed: DiscoveryQuery | null = parsed;
        if (typed && removed.length) {
            typed = {
                ...typed,
                categories: typed.categories?.filter((value) => !removed.includes(`c:${value}`)),
                vibes: typed.vibes?.filter((value) => !removed.includes(`v:${value}`)),
                goodFor: typed.goodFor?.filter((value) => !removed.includes(`f:${value}`)),
                amenities: typed.amenities?.filter((value) => !removed.includes(`a:${value}`)),
                neighborhood: removed.includes("n") ? null : typed.neighborhood,
                budgetMax: removed.includes("b") ? null : typed.budgetMax,
                when: removed.includes("w") ? null : typed.when,
                openNow: removed.includes("w") ? false : typed.openNow,
                groupSize: removed.includes("g") ? null : typed.groupSize,
            };
        }
        return mergeQueries(
            intent ? INTENTS[intent].query : null,
            categories ? { categories } : null,
            budgetQuery(budget),
            openNow ? { openNow: true } : null,
            typed
        );
    }, [parsed, removed, intent, categories, budget, openNow]);

    const ranked = useMemo(
        () => rankPlaces(places, query, { origin, now, areas }, sort),
        [places, query, origin, now, sort, areas]
    );

    const pricedCount = useMemo(() => places.filter((place) => place.priceMin || place.priceMax).length, [places]);
    const openCount = useMemo(
        () => (now ? places.filter((place) => getOpenState(place.hours, now).status === "open").length : 0),
        [places, now]
    );
    const rails = useMemo(() => (now ? buildRails(places, { origin, now }) : null), [places, origin, now]);

    const clearAll = () => {
        setTextState("");
        setRemoved([]);
        setIntent(null);
        setCategories(null);
        setBudget(null);
        setOpenNow(false);
        setSort("best");
    };

    const browsing = isEmptyQuery(query) && !text.trim();

    // What to carry over to the other screen.
    const handoff = [text.trim() && `q=${encodeURIComponent(text.trim())}`, intent && `i=${intent}`].filter(Boolean).join("&");

    return {
        text,
        setText,
        intent,
        setIntent,
        categories,
        setCategories,
        budget,
        setBudget,
        openNow,
        setOpenNow,
        sort,
        setSort,
        removeToken: (key: string) => setRemoved((current) => [...current, key]),
        understood,
        query,
        ranked,
        rails,
        pricedCount,
        openCount,
        clearAll,
        browsing,
        handoff,
    };
}

export function intentFromParam(value: string | null): IntentKey | null {
    return value && value in INTENTS ? (value as IntentKey) : null;
}
