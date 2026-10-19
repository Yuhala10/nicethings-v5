import { NextResponse } from "next/server";
import { deny, readBody, requireProfile } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// Saved places follow the profile: a heart given on one phone is there on
// the next. The phone keeps its own list too, so nothing waits on this.

const SLUG = /^[a-z0-9-]{1,200}$/;

export async function POST(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const body = await readBody(request);
    const slug = typeof body.slug === "string" && SLUG.test(body.slug) ? body.slug : null;
    if (!slug) return deny("invalid", 400);
    const db = getSupabaseAdminClient();
    const change =
        body.on === false
            ? await db.from("nt_profile_saves").delete().eq("profile_id", profile.id).eq("slug", slug)
            : await db.from("nt_profile_saves").upsert({ profile_id: profile.id, slug }, { onConflict: "profile_id,slug", ignoreDuplicates: true });
    if (change.error) return deny("failed", 502);
    return NextResponse.json({ ok: true });
}

// On signing in: what this phone had saved joins what the profile had.
export async function PUT(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const body = await readBody(request);
    const slugs = Array.isArray(body.slugs) ? [...new Set(body.slugs.filter((slug): slug is string => typeof slug === "string" && SLUG.test(slug)))].slice(0, 500) : [];
    const db = getSupabaseAdminClient();
    if (slugs.length) {
        const added = await db.from("nt_profile_saves").upsert(
            slugs.map((slug) => ({ profile_id: profile.id, slug })),
            { onConflict: "profile_id,slug", ignoreDuplicates: true }
        );
        if (added.error) return deny("failed", 502);
    }
    const all = await db.from("nt_profile_saves").select("slug").eq("profile_id", profile.id).order("created_at", { ascending: false }).limit(500);
    if (all.error) return deny("failed", 502);
    return NextResponse.json({ ok: true, saves: (all.data ?? []).map((row) => row.slug as string) });
}
