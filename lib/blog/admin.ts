import type { SupabaseClient } from "@supabase/supabase-js";
import { cityBySlug } from "../cities";
import { slugify } from "../places/paths";
import { cleanBlocks, placesIn, readingMinutes } from "./blocks";
import { isTopic } from "./topics";

// Validation for article saves from the team console (server only).

export const POST_LIST_COLUMNS = "id,slug,status,title_fr,title_en,cover_url,topic,city,featured,places,reading_minutes,published_at,updated_at";

const text = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : null);

export async function uniquePostSlug(db: SupabaseClient, wanted: string, exceptId?: string) {
    const base = slugify(wanted).slice(0, 80) || "article";
    const { data, error } = await db.from("nt_posts").select("id,slug").like("slug", `${base}%`);
    if (error) throw error;
    const taken = new Set((data ?? []).filter((row) => row.id !== exceptId).map((row) => row.slug));
    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

// Turns an editor payload into the columns to save. Unknown keys are
// ignored; derived columns (places, reading time) are always recomputed.
export function readPostChanges(body: Record<string, unknown>) {
    const changes: Record<string, unknown> = {};
    if ("title_fr" in body) changes.title_fr = text(body.title_fr, 160) || "Sans titre";
    if ("title_en" in body) changes.title_en = text(body.title_en, 160) || null;
    if ("excerpt_fr" in body) changes.excerpt_fr = text(body.excerpt_fr, 320) || null;
    if ("excerpt_en" in body) changes.excerpt_en = text(body.excerpt_en, 320) || null;
    if ("cover_url" in body) changes.cover_url = typeof body.cover_url === "string" && /^https:\/\/\S+$/.test(body.cover_url) ? body.cover_url.slice(0, 600) : null;
    if ("cover_alt" in body) changes.cover_alt = text(body.cover_alt, 200) || null;
    if ("topic" in body && isTopic(body.topic)) changes.topic = body.topic;
    if ("city" in body) changes.city = cityBySlug(typeof body.city === "string" ? body.city : null)?.slug ?? null;
    if ("tags" in body && Array.isArray(body.tags)) {
        changes.tags = [...new Set(body.tags.map((tag) => text(tag, 40)?.toLowerCase()).filter(Boolean))].slice(0, 12);
    }
    if ("author" in body) changes.author = text(body.author, 80) || "L'équipe NiceThings";
    if ("featured" in body) changes.featured = body.featured === true;

    if ("body_fr" in body) {
        const blocks = cleanBlocks(body.body_fr);
        changes.body_fr = blocks;
        changes.places = placesIn(blocks);
        changes.reading_minutes = readingMinutes(blocks);
    }
    if ("body_en" in body) changes.body_en = cleanBlocks(body.body_en);

    if ("status" in body) changes.status = body.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
    if ("published_at" in body) {
        const date = typeof body.published_at === "string" ? new Date(body.published_at) : null;
        changes.published_at = date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
    }
    return changes;
}
