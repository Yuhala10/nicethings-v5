import type { SupabaseClient } from "@supabase/supabase-js";

// The listing a signed-in owner may manage, found by slug — or null when
// they don't manage it (or no longer do).
export async function ownedSpot(db: SupabaseClient, userId: string, slug: string) {
    if (!/^[a-z0-9-]{1,200}$/.test(slug)) return null;
    const { data: spot } = await db.from("nt_spots").select("*").eq("slug", slug).maybeSingle();
    if (!spot) return null;
    const { data: link } = await db.from("nt_place_owners").select("id,role").eq("spot_id", spot.id).eq("user_id", userId).is("revoked_at", null).maybeSingle();
    return link ? { spot: spot as Record<string, unknown> & { id: string; slug: string; name: string }, role: link.role as string } : null;
}
