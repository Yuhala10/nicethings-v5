import type { SupabaseClient } from "@supabase/supabase-js";
import { selectAll } from "../admin-places";

// Atlas, the operator that looks after the catalogue: what it keeps in the
// database (database/migrations/004_atlas.sql) and the few moves it is
// allowed to make on a place. Server only.

export type AtlasSettings = { paused: boolean; daily_cap_usd: number; model: string; places_per_night: number };

export type AtlasRun = {
    id: string;
    kind: string;
    status: "running" | "done" | "stopped" | "failed";
    cost_usd: number;
    stats: Record<string, number>;
    error: string | null;
    started_at: string;
    finished_at: string | null;
};

export type Source = { url: string; title: string };

export type AtlasAction = {
    id: string;
    run_id: string | null;
    desk: string;
    kind: string; // 'place.fill', 'place.hide'
    spot_id: string | null;
    title: string;
    detail: string | null;
    evidence: Source[];
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    status: "proposed" | "applied" | "declined" | "undone" | "noted";
    decided_at: string | null;
    decided_by: string | null;
    created_at: string;
};

export type AtlasIssue = {
    id: string;
    fingerprint: string;
    area: string;
    severity: "minor" | "normal" | "serious";
    title: string;
    detail: string | null;
    // `code` says which check found it; the rest is what the check saw.
    evidence: { code: string } & Record<string, unknown>;
    status: "open" | "fixed" | "dismissed";
    times_seen: number;
    first_seen_at: string;
    last_seen_at: string;
};

// Until the database script has been run, the tables are not there: Atlas
// then says so instead of failing.
export function notInstalled(error: unknown) {
    const code = (error as { code?: string } | null)?.code;
    return code === "PGRST205" || code === "42P01";
}

// A place as Atlas reads it: every state, not only what is published.
export type AtlasPlace = {
    id: string;
    slug: string | null;
    name: string;
    category: string;
    cuisine: string | null;
    city: string;
    neighborhood: string | null;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    whatsapp: string | null;
    website: string | null;
    instagram: string | null;
    opening_time: string | null;
    closing_time: string | null;
    monday_open: boolean;
    tuesday_open: boolean;
    wednesday_open: boolean;
    thursday_open: boolean;
    friday_open: boolean;
    saturday_open: boolean;
    sunday_open: boolean;
    minimum_price: number | null;
    maximum_price: number | null;
    status: string;
    verified: boolean;
    last_verified_at: string | null;
    source: string;
    source_ref: string | null;
};

const PLACE_COLUMNS =
    "id,slug,name,category,cuisine,city,neighborhood,latitude,longitude,phone,whatsapp,website,instagram,opening_time,closing_time,monday_open,tuesday_open,wednesday_open,thursday_open,friday_open,saturday_open,sunday_open,minimum_price,maximum_price,status,verified,last_verified_at,source,source_ref";

export function loadPlaces(db: SupabaseClient) {
    return selectAll<AtlasPlace>((from, to) => db.from("nt_spots").select(PLACE_COLUMNS).order("id", { ascending: true }).range(from, to));
}

// The only fields of a place Atlas may write, whatever an action says.
const WRITABLE = new Set([
    "phone",
    "whatsapp",
    "website",
    "instagram",
    "cuisine",
    "opening_time",
    "closing_time",
    "monday_open",
    "tuesday_open",
    "wednesday_open",
    "thursday_open",
    "friday_open",
    "saturday_open",
    "sunday_open",
    "status",
]);

export async function writePlace(db: SupabaseClient, spotId: string, values: Record<string, unknown>) {
    const allowed = Object.fromEntries(Object.entries(values).filter(([key]) => WRITABLE.has(key)));
    if (!Object.keys(allowed).length) return;
    const { error } = await db.from("nt_spots").update(allowed).eq("id", spotId);
    if (error) throw error;
}

export async function readSettings(db: SupabaseClient): Promise<AtlasSettings> {
    const { data, error } = await db.from("nt_atlas_settings").select("paused,daily_cap_usd,model,places_per_night").maybeSingle();
    if (error) throw error;
    return data ?? { paused: false, daily_cap_usd: 2, model: "claude-opus-5-5", places_per_night: 30 };
}

// A person's verdict on what Atlas did or proposed. Approving applies the
// change, undoing puts the place back exactly as it was before.
export async function decide(db: SupabaseClient, id: string, verdict: "approve" | "decline" | "undo") {
    const { data: action, error } = await db.from("nt_atlas_actions").select("id,spot_id,status,before,after").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!action) return null;

    let status: AtlasAction["status"];
    if (verdict === "approve" && action.status === "proposed") {
        if (action.spot_id && action.after) await writePlace(db, action.spot_id, action.after);
        status = "applied";
    } else if (verdict === "decline" && action.status === "proposed") {
        status = "declined";
    } else if (verdict === "undo" && action.status === "applied") {
        if (action.spot_id && action.before) await writePlace(db, action.spot_id, action.before);
        status = "undone";
    } else {
        // Already settled (two people, or two taps): nothing to do.
        return action.status as AtlasAction["status"];
    }

    const saved = await db.from("nt_atlas_actions").update({ status, decided_at: new Date().toISOString(), decided_by: "team" }).eq("id", id);
    if (saved.error) throw saved.error;
    return status;
}
