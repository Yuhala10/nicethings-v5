import { cityNow } from "../places/hours";
import { DAY_KEYS, type DayKey } from "../places/types";
import type { DiscoveryQuery, TimeWindow } from "./query";

// Rule-based Concierge: turns everyday French, English and Cameroonian
// phrasing into a DiscoveryQuery. Instant, free and offline — no AI call.
//
//   "Je suis à Bastos, j'ai 10 000, samedi aprèm, 3 potes, un truc chill"
//   → Bastos · ≤10 000 FCFA · Saturday 12:00–18:00 · group of 3 · calm/friends

function normalize(text: string) {
    return ` ${text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[’']/g, " ")
        .replace(/[^a-z0-9\s.,]/g, " ")
        // Keep "10.000" / "2,5k" together, but "Bastos," → "Bastos".
        .replace(/(?<!\d)[.,]|[.,](?!\d)/g, " ")
        .replace(/\s+/g, " ")} `;
}

type Rule<T> = { patterns: RegExp[]; value: T };

const CATEGORY_RULES: Rule<string>[] = [
    { value: "Restaurant", patterns: [/\b(resto|restos|restaurant|restaurants|manger|bouffer|dejeuner|diner|dinner|lunch|eat|food|plat|braise|poisson braise|poulet|ndole|eru|koki|okok|pizza|burger|shawarma|chawarma|grillade)\b/] },
    { value: "Cafe", patterns: [/\b(cafe|cafes|coffee|the|tea|brunch|petit dej|petit dejeuner|breakfast)\b/] },
    { value: "Bar", patterns: [/\b(bar|bars|lounge|boire|verre|drink|drinks|biere|beer|cocktail|cocktails|chicha|shisha|snack bar|cabaret)\b/] },
    { value: "Club", patterns: [/\b(boite|boite de nuit|club|nightclub|danser|dance|dancing|ambiance de nuit)\b/] },
    { value: "Hotel", patterns: [/\b(hotel|hotels|dormir|chambre|nuit a|sleep|stay|auberge|guest ?house|motel)\b/] },
    { value: "Bakery", patterns: [/\b(boulangerie|patisserie|pain|croissant|gateau|cake|bakery|pastry|viennoiserie)\b/] },
    { value: "Shopping", patterns: [/\b(shopping|boutique|magasin|mall|supermarche|supermarket|acheter|habits|vetements)\b/] },
    { value: "Beauty", patterns: [/\b(coiffure|coiffeur|salon|tresses|ongles|nails|manucure|barber|barbier|spa beaute|beauty)\b/] },
    { value: "Wellness", patterns: [/\b(gym|sport|salle de sport|fitness|piscine|pool|massage|spa|yoga)\b/] },
    { value: "Entertainment", patterns: [/\b(cinema|jeux|games|bowling|karaoke|billard|activite|activites|activity|fun|loisir|loisirs)\b/] },
    { value: "Culture", patterns: [/\b(musee|museum|monument|visiter|visite|tourisme|touriste|culture|expo|exposition|galerie|art)\b/] },
    { value: "Nature", patterns: [/\b(parc|park|nature|jardin|garden|lac|lake|mont febe|randonnee|hike|plein air|pique nique|picnic)\b/] },
];

const VIBE_RULES: Rule<string>[] = [
    { value: "calm", patterns: [/\b(calme|tranquille|chill|posé|pose|relax|relaxe|relaxed|quiet|calm|peaceful|zen|cool)\b/] },
    { value: "lively", patterns: [/\b(anime|ambiance|ambiancer|lively|fete|party|bouger|jaime bouger|musique forte|ca bouge)\b/] },
    { value: "romantic", patterns: [/\b(romantique|romantic|date|rencard|rendez vous|en amoureux|ma go|mon gars|ma cherie|copine|copain|girlfriend|boyfriend)\b/] },
    { value: "chic", patterns: [/\b(chic|classe|luxe|haut de gamme|upscale|fancy|standing)\b/] },
    { value: "local", patterns: [/\b(local|authentique|traditionnel|mets du pays|cuisine camerounaise|cameroonian|tourne dos|tournedos|mapan|maquis)\b/] },
    { value: "outdoor", patterns: [/\b(terrasse|plein air|dehors|outdoor|outside|rooftop|jardin|vue|view)\b/] },
    { value: "trendy", patterns: [/\b(tendance|branche|trendy|instagrammable|nouveau|new|hype)\b/] },
];

const GOOD_FOR_RULES: Rule<string>[] = [
    { value: "date", patterns: [/\b(date|rencard|rendez vous|en amoureux|romantique|romantic|ma go|ma cherie|girlfriend|boyfriend)\b/] },
    { value: "friends", patterns: [/\b(potes|pote|amis|amies|copains|copines|les gars|les filles|friends|mates|squad|groupe|group|bande)\b/] },
    { value: "family", patterns: [/\b(famille|family|enfants|enfant|kids|kid|bebe|parents|maman|papa)\b/] },
    { value: "study", patterns: [/\b(reviser|revision|etudier|study|studying|travailler|work|bosser|laptop|ordi|memoire|examen|exams?)\b/] },
    { value: "business", patterns: [/\b(reunion|meeting|business|client|clients|rendez vous pro|pro|affaires)\b/] },
    { value: "football", patterns: [/\b(match|foot|football|ligue des champions|champions league|can|lions|premier league|ecran geant|regarder le match)\b/] },
    { value: "party", patterns: [/\b(fete|faire la fete|party|sortir ce soir|nightlife|danser|ambiancer)\b/] },
    { value: "celebration", patterns: [/\b(anniversaire|anniv|birthday|celebrer|celebrate|feter|fete de)\b/] },
    { value: "solo", patterns: [/\b(seul|seule|solo|alone|moi meme)\b/] },
];

const AMENITY_RULES: Rule<string>[] = [
    { value: "wifi", patterns: [/\b(wifi|wi fi|internet|connexion)\b/] },
    { value: "generator", patterns: [/\b(groupe|groupe electrogene|generateur|generator|coupure|delestage|sans coupure|courant)\b/] },
    { value: "ac", patterns: [/\b(clim|climatise|climatisation|air conditionne|ac|aircon)\b/] },
    { value: "parking", patterns: [/\b(parking|garer|park my car)\b/] },
    { value: "terrace", patterns: [/\b(terrasse|terrace|rooftop)\b/] },
    { value: "live_music", patterns: [/\b(live|concert|musique live|live music|orchestre|band)\b/] },
    { value: "screens", patterns: [/\b(ecran|ecrans|tv|tele|match|screen|screens)\b/] },
    { value: "delivery", patterns: [/\b(livraison|livrer|delivery|deliver)\b/] },
    { value: "mobile_money", patterns: [/\b(momo|mobile money|orange money|om)\b/] },
];

const DAY_WORDS: Record<string, DayKey> = {
    lundi: "monday", monday: "monday",
    mardi: "tuesday", tuesday: "tuesday",
    mercredi: "wednesday", wednesday: "wednesday",
    jeudi: "thursday", thursday: "thursday",
    vendredi: "friday", friday: "friday",
    samedi: "saturday", saturday: "saturday",
    dimanche: "sunday", sunday: "sunday",
};

const PERIODS: Record<TimeWindow["label"], [number, number]> = {
    now: [0, 0],
    morning: [6 * 60, 11 * 60 + 30],
    noon: [11 * 60 + 30, 15 * 60],
    afternoon: [12 * 60, 18 * 60],
    evening: [18 * 60, 23 * 60],
    night: [21 * 60, 28 * 60],
};

const NUMBER_WORDS: Record<string, number> = {
    un: 1, une: 1, one: 1, deux: 2, two: 2, trois: 3, three: 3, quatre: 4, four: 4,
    cinq: 5, five: 5, six: 6, sept: 7, seven: 7, huit: 8, eight: 8, dix: 10, ten: 10,
};

function matchAll<T>(text: string, rules: Rule<T>[]) {
    return rules.filter((rule) => rule.patterns.some((pattern) => pattern.test(text))).map((rule) => rule.value);
}

function parseAmount(raw: string) {
    const cleaned = raw.replace(/\s/g, "").replace(",", ".");
    const k = /k$/.test(cleaned);
    const value = parseFloat(cleaned.replace(/[^0-9.]/g, "").replace(/\.(?=\d{3}(\D|$))/g, ""));
    if (!Number.isFinite(value)) return null;
    return Math.round(k ? value * 1000 : value < 100 ? value * 1000 : value);
}

function parseBudget(text: string) {
    // "10 000", "10.000", "10k", "10 000 fcfa", "moins de 5000", "entre 5 et 10k"
    const between = text.match(/\bentre (\d[\d\s.]*k?) et (\d[\d\s.]*k?)\b|\bbetween (\d[\d\s.,]*k?) and (\d[\d\s.,]*k?)\b/);
    if (between) {
        const min = parseAmount(between[1] ?? between[3]);
        const max = parseAmount(between[2] ?? between[4]);
        if (min && max) return { budgetMin: Math.min(min, max), budgetMax: Math.max(min, max) };
    }

    const amount = text.match(/(\d{1,3}(?:[\s.,]\d{3})+|\d+(?:[.,]\d+)?\s?k|\d{3,6})(?:\s?(?:f|fcfa|cfa|francs|xaf|frs?))?/);
    if (!amount) return {};

    const value = parseAmount(amount[1]);
    if (!value || value < 500 || value > 500_000) return {};

    const context = text.slice(Math.max(0, (amount.index ?? 0) - 20), amount.index);
    if (/(plus de|au moins|minimum|more than|at least|over)\s*$/.test(context)) {
        return { budgetMin: value };
    }
    return { budgetMax: value, totalBudget: /\b(pour nous|a nous|au total|total|for us|all of us|ensemble|together)\b/.test(text) };
}

function parseGroupSize(text: string) {
    const explicit = text.match(/\b(?:on est|nous sommes|we are|we re|groupe de|group of|table pour|table for)\s(\d+|\w+)\b/);
    if (explicit) {
        const n = Number(explicit[1]) || NUMBER_WORDS[explicit[1]];
        if (n) return n;
    }

    const withFriends = text.match(/\b(\d+|\w+)\s(?:potes|amis|amies|copains|copines|friends|mates|personnes|people|gars|filles)\b/);
    if (withFriends) {
        const n = Number(withFriends[1]) || NUMBER_WORDS[withFriends[1]];
        // "avec 2 amis" means 3 people in total; "3 potes" usually means the group.
        if (n) return /\b(avec|with)\s/.test(text.slice(0, withFriends.index ?? 0).slice(-8)) ? n + 1 : n;
    }

    if (/\b(en couple|a deux|nous deux|the two of us|date|rencard)\b/.test(text)) return 2;
    return null;
}

function parseWhen(text: string, now = new Date()): TimeWindow | null {
    const city = cityNow(now);
    let day: DayKey = city.day;
    let explicitDay = false;

    if (/\b(demain|tomorrow)\b/.test(text)) {
        day = DAY_KEYS[(city.dayIndex + 1) % 7];
        explicitDay = true;
    } else if (/\b(ce week end|ce weekend|this weekend|le week end|weekend)\b/.test(text)) {
        day = city.dayIndex >= 5 ? city.day : "saturday";
        explicitDay = true;
    } else {
        for (const [word, key] of Object.entries(DAY_WORDS)) {
            if (new RegExp(`\\b${word}\\b`).test(text)) {
                day = key;
                explicitDay = true;
                break;
            }
        }
    }

    let label: TimeWindow["label"] | null = null;
    if (/\b(maintenant|tout de suite|la maintenant|right now|now|asap)\b/.test(text)) label = "now";
    else if (/\b(matin|morning|petit dej|breakfast)\b/.test(text)) label = "morning";
    else if (/\b(midi|lunch|dejeuner|noon)\b/.test(text)) label = "noon";
    else if (/\b(aprem|apres midi|afternoon|cet aprem)\b/.test(text)) label = "afternoon";
    else if (/\b(ce soir|soir|soiree|tonight|evening|diner|dinner)\b/.test(text)) label = "evening";
    else if (/\b(nuit|tard|late|night|apres minuit|after midnight)\b/.test(text)) label = "night";

    if (label === "now") {
        return { day: city.day, from: city.minutes, to: city.minutes + 60, label };
    }
    if (!label && !explicitDay) return null;

    const [from, to] = PERIODS[label ?? "afternoon"];
    return { day, from: label ? from : 10 * 60, to: label ? to : 22 * 60, label: label ?? "afternoon" };
}

function parseNeighborhood(text: string, areas: readonly { name: string }[]) {
    // Longest names first so "Bonamoussadi" wins over "Bona".
    for (const area of [...areas].sort((a, b) => b.name.length - a.name.length)) {
        const key = normalize(area.name).trim();
        if (text.includes(` ${key} `) || text.includes(` ${key.replace(/-/g, " ")} `)) return area.name;
    }
    // Common alternative spellings and nicknames, when the city has them.
    const known = new Set(areas.map((area) => area.name));
    const nick = (pattern: RegExp, name: string) => (known.has(name) && pattern.test(text) ? name : null);
    const alias =
        nick(/\b(centre ville|center|downtown|en ville|poste centrale)\b/, "Centre-ville") ??
        nick(/\b(omnisports|stade omnisport)\b/, "Omnisport") ??
        nick(/\b(biyem assi|biyemassi)\b/, "Biyem-Assi") ??
        nick(/\b(elig essono)\b/, "Elig-Essono");
    if (alias) return alias;
    return null;
}

const STOP_WORDS = new Set(
    "je suis a au aux avec pour un une des de du la le les on veut voudrais cherche chercher trouve trouver quelque chose truc coin endroit lieu lieux place places spot ou est ce que qui il y avoir j ai jai nous sommes moins plus fcfa cfa francs f k and the a an with for in at to find looking somewhere something where is are we i im i m have me my our some good nice bien bon bonne sympa cool pas cher chere sans regarder soir matin aprem apres midi nuit tard maintenant demain weekend week end tonight afternoon evening morning today tomorrow now aller sortir go going out want watch cheap budget total ensemble together".split(" ")
);

export type ParsedQuery = DiscoveryQuery & {
    totalBudget?: boolean;
};

export function parseDiscoveryText(
    input: string,
    now = new Date(),
    areas: readonly { name: string }[] = []
): ParsedQuery {
    const text = normalize(input);
    const budget = parseBudget(text);
    const groupSize = parseGroupSize(text);
    const query: ParsedQuery = {
        text: input.trim(),
        categories: matchAll(text, CATEGORY_RULES),
        vibes: matchAll(text, VIBE_RULES),
        goodFor: matchAll(text, GOOD_FOR_RULES),
        amenities: matchAll(text, AMENITY_RULES),
        neighborhood: parseNeighborhood(text, areas),
        groupSize,
        when: parseWhen(text, now),
        ...budget,
    };

    if (!query.budgetMax && /\b(pas cher|pas chere|bon marche|petit budget|cheap|affordable|budget)\b/.test(text)) {
        query.budgetMax = 5000;
    }

    // "10 000 pour nous 3" is a total — convert to a per-person budget.
    if (budget.totalBudget && query.budgetMax && groupSize && groupSize > 1) {
        query.budgetMax = Math.round(query.budgetMax / groupSize);
    }

    if (query.when?.label === "now") query.openNow = true;
    if (groupSize && groupSize >= 3 && !query.goodFor?.includes("friends") && !query.goodFor?.includes("family")) {
        query.goodFor = [...(query.goodFor ?? []), "friends"];
    }

    // Words we did not understand are kept to match names and cuisines
    // ("ndolé", "Le Biniou", "pizza").
    const understood = new Set(
        [query.neighborhood ?? ""].flatMap((value) => normalize(value).trim().split(" "))
    );
    const allRules = [...CATEGORY_RULES, ...VIBE_RULES, ...GOOD_FOR_RULES, ...AMENITY_RULES];
    // Dishes imply "Restaurant" but are also worth matching against names
    // and cuisines, so they stay keywords.
    const DISHES = /^(ndole|eru|koki|okok|pizza|burger|shawarma|chawarma|poisson|poulet|braise|grillade|brunch|croissant|gateau|chicha|shisha|cocktail|cocktails|sushi)$/;
    const isRuleWord = (word: string) =>
        !DISHES.test(word) &&
        allRules.some((rule) => rule.patterns.some((pattern) => pattern.test(` ${word} `)));

    query.keywords = text
        .trim()
        .split(" ")
        .filter((word) => word.length > 2 && !STOP_WORDS.has(word) && !/^\d/.test(word) && !understood.has(word))
        .filter((word) => !Object.keys(DAY_WORDS).includes(word) && !NUMBER_WORDS[word] && !isRuleWord(word))
        .slice(0, 6);

    return query;
}
