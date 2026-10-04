import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanPhone, cleanPrice, cleanText } from "../feedback";
import { DAY_KEYS } from "../places/types";
import { AMENITIES, GOOD_FOR, VIBES } from "../tags";

// What a verified owner may change on their listing, and how each value is
// checked. Identity fields (name, category, position…) are not here: they
// go to the team as a change request, so a stolen account can't move or
// rename a place.

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function cleanUrl(value: unknown) {
    const text = cleanText(value, 200);
    if (!text) return null;
    try {
        const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
        return /^https?:$/.test(url.protocol) && url.hostname.includes(".") ? url.toString() : undefined;
    } catch {
        return undefined;
    }
}

function cleanInstagram(value: unknown) {
    const text = cleanText(value, 100);
    if (!text) return null;
    const handle = text.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "");
    return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle : undefined;
}

function cleanTags(value: unknown, vocabulary: Record<string, unknown>) {
    if (!Array.isArray(value)) return undefined;
    return [...new Set(value.filter((item): item is string => typeof item === "string" && item in vocabulary))];
}

const VALIDATORS: Record<string, (value: unknown) => unknown> = {
    description: (value) => cleanText(value, 1500),
    cuisine: (value) => cleanText(value, 80),
    phone: cleanPhone,
    whatsapp: cleanPhone,
    website: cleanUrl,
    instagram: cleanInstagram,
    minimum_price: cleanPrice,
    maximum_price: cleanPrice,
    opening_time: (value) => (value === null || value === "" ? null : typeof value === "string" && TIME.test(value.slice(0, 5)) ? value.slice(0, 5) : undefined),
    closing_time: (value) => (value === null || value === "" ? null : typeof value === "string" && TIME.test(value.slice(0, 5)) ? value.slice(0, 5) : undefined),
    vibes: (value) => cleanTags(value, VIBES),
    good_for: (value) => cleanTags(value, GOOD_FOR),
    amenities: (value) => cleanTags(value, AMENITIES),
    ...Object.fromEntries(DAY_KEYS.map((day) => [`${day}_open`, (value: unknown) => (typeof value === "boolean" ? value : undefined)])),
};

export const OWNER_FIELDS = Object.keys(VALIDATORS);

export const FIELD_LABELS: Record<string, string> = {
    description: "Description",
    cuisine: "Cuisine",
    phone: "Téléphone",
    whatsapp: "WhatsApp",
    website: "Site web",
    instagram: "Instagram",
    minimum_price: "Prix minimum",
    maximum_price: "Prix maximum",
    opening_time: "Ouverture",
    closing_time: "Fermeture",
    vibes: "Ambiance",
    good_for: "Idéal pour",
    amenities: "Sur place",
    menu: "Menu",
    photo_added: "Photo ajoutée",
    photo_removed: "Photo retirée",
    request: "Demande de correction",
};

// { field: value } from the browser → checked changes, or the name of the
// first invalid field.
export function readOwnerChanges(body: Record<string, unknown>) {
    const changes: Record<string, unknown> = {};
    for (const field of OWNER_FIELDS) {
        if (!(field in body)) continue;
        const value = VALIDATORS[field](body[field]);
        if (value === undefined) return { invalid: field } as const;
        changes[field] = value;
    }
    const min = changes.minimum_price as number | null | undefined;
    const max = changes.maximum_price as number | null | undefined;
    if (typeof min === "number" && typeof max === "number" && min > max) return { invalid: "maximum_price" } as const;
    return { changes } as const;
}

export type MenuItem = { name: string; description: string | null; price: number; popular: boolean; available: boolean };

export function readMenu(value: unknown): MenuItem[] | null {
    if (!Array.isArray(value)) return null;
    const items: MenuItem[] = [];
    for (const raw of value.slice(0, 80)) {
        if (!raw || typeof raw !== "object") continue;
        const item = raw as Record<string, unknown>;
        const name = cleanText(item.name, 80);
        const price = cleanPrice(item.price);
        if (!name || typeof price !== "number") continue;
        items.push({ name, description: cleanText(item.description, 200), price, popular: item.popular === true, available: item.available !== false });
    }
    return items;
}

// Writes the changes and one history line per field that really changed.
export async function applyOwnerChanges(db: SupabaseClient, spotId: string, userId: string, changes: Record<string, unknown>) {
    const { data: current, error } = await db.from("nt_spots").select(Object.keys(changes).join(",")).eq("id", spotId).single();
    if (error) throw error;
    const before = current as unknown as Record<string, unknown>;
    const changed = Object.keys(changes).filter((field) => JSON.stringify(before[field] ?? null) !== JSON.stringify(changes[field] ?? null));
    if (!changed.length) return 0;

    const update = Object.fromEntries(changed.map((field) => [field, changes[field]]));
    const { error: updateError } = await db.from("nt_spots").update(update).eq("id", spotId);
    if (updateError) throw updateError;
    await db.from("nt_spot_changes").insert(
        changed.map((field) => ({ spot_id: spotId, user_id: userId, field, old_value: before[field] ?? null, new_value: changes[field] ?? null, status: "APPLIED" }))
    );
    return changed.length;
}
