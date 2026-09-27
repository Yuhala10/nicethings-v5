import { createClient } from "@supabase/supabase-js";
import { YAOUNDE_BOUNDS } from "./places/geo";
import { CATEGORIES } from "./tags";

// Visitor contributions (new places, error reports). Inputs are validated
// here, then written with the publishable key so Row Level Security still
// decides what is allowed: visitors can only ever create PENDING rows.

export function publicWriteClient() {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

export const REPORT_REASONS = ["closed", "price", "hours", "location", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

// Trimmed, whitespace-collapsed text within a length limit; null if empty.
export function cleanText(value: unknown, max: number) {
    if (typeof value !== "string") return null;
    const text = value.replace(/\s+/g, " ").trim();
    return text ? text.slice(0, max) : null;
}

export function cleanPhone(value: unknown) {
    const text = cleanText(value, 40);
    if (!text) return null;
    return /^[+\d\s().-]{8,40}$/.test(text) ? text : undefined; // undefined = invalid
}

export function cleanCategory(value: unknown) {
    return typeof value === "string" && value in CATEGORIES ? value : null;
}

export function cleanPrice(value: unknown) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(String(value).replace(/\s/g, ""));
    return Number.isInteger(number) && number >= 0 && number <= 1_000_000 ? number : undefined;
}

export function cleanPosition(lat: unknown, lng: unknown) {
    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
    const [[west, south], [east, north]] = YAOUNDE_BOUNDS;
    return la >= south && la <= north && ln >= west && ln <= east ? { lat: la, lng: ln } : null;
}
