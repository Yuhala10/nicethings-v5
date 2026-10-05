import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import type { Locale } from "../i18n/config";
import { cleanBlocks, type Block } from "./blocks";

// Public reads of published articles with the publishable key: Row Level
// Security only shows published ones whose date has come. Cached like the
// places; the admin calls refreshPosts() (lib/refresh.ts) after each save.

export const POSTS_TAG = "posts";

export type PostSummary = {
    id: string;
    slug: string;
    title: { fr: string; en: string | null };
    excerpt: { fr: string | null; en: string | null };
    cover: string | null;
    coverAlt: string | null;
    topic: string;
    city: string | null;
    tags: string[];
    places: string[];
    author: string;
    readingMinutes: number;
    featured: boolean;
    publishedAt: string;
    updatedAt: string;
};

export type Post = PostSummary & { body: { fr: Block[]; en: Block[] } };

const SUMMARY_COLUMNS =
    "id,slug,title_fr,title_en,excerpt_fr,excerpt_en,cover_url,cover_alt,topic,city,tags,places,author,reading_minutes,featured,published_at,updated_at";

function client() {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

function toSummary(row: Record<string, unknown>): PostSummary {
    return {
        id: row.id as string,
        slug: row.slug as string,
        title: { fr: row.title_fr as string, en: (row.title_en as string | null) || null },
        excerpt: { fr: (row.excerpt_fr as string | null) || null, en: (row.excerpt_en as string | null) || null },
        cover: (row.cover_url as string | null) ?? null,
        coverAlt: (row.cover_alt as string | null) ?? null,
        topic: (row.topic as string) ?? "guide",
        city: (row.city as string | null) ?? null,
        tags: (row.tags as string[]) ?? [],
        places: (row.places as string[]) ?? [],
        author: (row.author as string) ?? "NiceThings",
        readingMinutes: Number(row.reading_minutes ?? 1),
        featured: Boolean(row.featured),
        publishedAt: row.published_at as string,
        updatedAt: row.updated_at as string,
    };
}

// Straight from the database, for the sitemap: it must list an article the
// moment it is published.
export async function loadPosts(): Promise<PostSummary[]> {
    const { data, error } = await client()
        .from("nt_posts")
        .select(SUMMARY_COLUMNS)
        .order("published_at", { ascending: false })
        .limit(500);
    // Before the blog tables exist, the site simply has no articles.
    if (error) {
        if (error.code === "PGRST205" || error.code === "42P01") return [];
        throw error;
    }
    return (data ?? []).map(toSummary);
}

export const getPosts = unstable_cache(loadPosts, ["posts:all:v1"], { revalidate: 300, tags: [POSTS_TAG] });

async function loadPost(slug: string): Promise<Post | null> {
    const { data, error } = await client().from("nt_posts").select(`${SUMMARY_COLUMNS},body_fr,body_en`).eq("slug", slug).maybeSingle();
    if (error) {
        if (error.code === "PGRST205" || error.code === "42P01") return null;
        throw error;
    }
    return data ? toPost(data) : null;
}

export function toPost(row: Record<string, unknown>): Post {
    return { ...toSummary(row), body: { fr: cleanBlocks(row.body_fr), en: cleanBlocks(row.body_en) } };
}

export const getPost = unstable_cache(loadPost, ["posts:detail:v1"], { revalidate: 300, tags: [POSTS_TAG] });

// An article in the reader's language, falling back to French.
export function localised(post: PostSummary, locale: Locale) {
    const english = locale === "en" && Boolean(post.title.en);
    return {
        title: english ? post.title.en! : post.title.fr,
        excerpt: (english ? post.excerpt.en : post.excerpt.fr) ?? post.excerpt.fr ?? "",
        translated: locale === "fr" || english,
    };
}

export async function getPostsForPlace(slug: string) {
    return (await getPosts().catch(() => [])).filter((post) => post.places.includes(slug));
}
