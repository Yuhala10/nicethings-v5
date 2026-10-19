import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { UUID } from "@/lib/posts";
import { tipsTag } from "@/lib/people/kwat";
import { checkLevel, notify } from "@/lib/people/notices";
import { deny, readBody, requireProfile } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// "Ça m'a aidé": this way to a place worked. One per person; not on one's own.
export async function POST(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const body = await readBody(request);
    const id = typeof body.id === "string" && UUID.test(body.id) ? body.id : null;
    if (!id) return deny("invalid", 400);
    const db = getSupabaseAdminClient();
    const tip = await db.from("nt_place_tips").select("id,profile_id,spot_id").eq("id", id).eq("status", "PUBLISHED").maybeSingle();
    if (tip.error) return deny("failed", 502);
    if (!tip.data) return deny("invalid", 404);
    if (tip.data.profile_id === profile.id) return deny("own", 422);

    const on = body.on !== false;
    const change = on
        ? await db.from("nt_tip_votes").upsert({ tip_id: id, profile_id: profile.id }, { onConflict: "tip_id,profile_id", ignoreDuplicates: true })
        : await db.from("nt_tip_votes").delete().eq("tip_id", id).eq("profile_id", profile.id);
    if (change.error) return deny("failed", 502);
    const { count } = await db.from("nt_tip_votes").select("tip_id", { count: "exact", head: true }).eq("tip_id", id);
    await db.from("nt_place_tips").update({ helpful: count ?? 0 }).eq("id", id);
    revalidateTag(tipsTag(tip.data.spot_id as string), { expire: 0 });

    if (on) {
        const spot = await db.from("nt_spots").select("slug,name").eq("id", tip.data.spot_id).maybeSingle();
        await notify(tip.data.profile_id as string, "tip_vote", { id: profile.id, handle: profile.handle }, { place: spot.data?.slug as string, name: spot.data?.name as string, tip: id });
        await checkLevel(tip.data.profile_id as string);
    }
    return NextResponse.json({ ok: true, helpful: count ?? 0 });
}
