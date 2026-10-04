import { distanceMeters } from "./geo";
import type { PlaceSummary } from "./types";

// Is this place already on NiceThings? Names are compared after removing
// accents, punctuation and words that say nothing about which place it is
// ("Restaurant", "Chez", "Le"…), then by letter pairs, so "Restaurant Le
// Wenge", "le wengé" and "Wenge Bar" all match. Position settles close
// calls: two "Chez Marie" across town are different places.

const FILLER = new Set([
    "a", "and", "au", "aux", "bar", "boulangerie", "cabaret", "cafe", "chez", "club", "d", "de", "des", "du", "et", "hotel", "l", "la",
    "le", "les", "lounge", "maquis", "patisserie", "resto", "restaurant", "snack", "the", "chambre", "chambres", "auberge", "residence",
]);

export function nameKey(name: string) {
    return name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .split(" ")
        .filter((word) => word && !FILLER.has(word))
        .join(" ");
}

function pairs(text: string) {
    const compact = text.replace(/ /g, "");
    const list: string[] = [];
    for (let i = 0; i < compact.length - 1; i++) list.push(compact.slice(i, i + 2));
    return list;
}

// 0 (nothing in common) … 1 (same name).
export function nameSimilarity(a: string, b: string) {
    const ka = nameKey(a);
    const kb = nameKey(b);
    if (!ka || !kb) return a.trim().toLowerCase() === b.trim().toLowerCase() ? 1 : 0;
    if (ka === kb) return 1;
    // Every word of one name inside the other: "Wenge" / "Le Wenge Lounge
    // Bastos" (but not "Marie" / "Mariette").
    const [shorter, longer] = ka.length <= kb.length ? [ka, kb] : [kb, ka];
    const longerWords = new Set(longer.split(" "));
    if (shorter.replace(/ /g, "").length >= 4 && shorter.split(" ").every((word) => longerWords.has(word))) return 0.9;
    const left = pairs(ka);
    const right = pairs(kb);
    if (!left.length || !right.length) return 0;
    const pool = [...right];
    let shared = 0;
    for (const pair of left) {
        const at = pool.indexOf(pair);
        if (at >= 0) {
            shared++;
            pool.splice(at, 1);
        }
    }
    return (2 * shared) / (left.length + right.length);
}

export type Match = { place: PlaceSummary; score: number; distance: number | null; duplicate: boolean };

// Places of the same city that look like `name` (best first). `duplicate`
// marks the ones that are certainly the same place.
export function findSimilar(places: PlaceSummary[], query: { name: string; lat?: number | null; lng?: number | null; neighborhood?: string | null }, limit = 5): Match[] {
    const here = query.lat != null && query.lng != null ? { lat: query.lat, lng: query.lng } : null;
    const area = query.neighborhood ? nameKey(query.neighborhood) : null;
    const matches: Match[] = [];

    for (const place of places) {
        const score = nameSimilarity(query.name, place.name);
        const distance = here ? Math.round(distanceMeters(here, place)) : null;
        const sameArea = Boolean(area && place.neighborhood && nameKey(place.neighborhood) === area);
        const near = distance !== null && distance <= 150;
        const duplicate =
            (score === 1 && (distance === null ? sameArea || !area : distance <= 400)) || (score >= 0.85 && (near || sameArea)) || (score >= 0.7 && distance !== null && distance <= 40);
        if (duplicate || score >= 0.6 || (distance !== null && distance <= 60 && score >= 0.4)) {
            matches.push({ place, score, distance, duplicate });
        }
    }
    return matches
        .sort((a, b) => Number(b.duplicate) - Number(a.duplicate) || b.score - a.score || (a.distance ?? 1e9) - (b.distance ?? 1e9))
        .slice(0, limit);
}
