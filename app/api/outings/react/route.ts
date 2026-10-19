import { NextResponse } from "next/server";
import { UUID } from "@/lib/posts";
import { checkLevel, notify } from "@/lib/people/notices";
import { deny, readBody, requireProfile } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// A heart on an outing ("like"), or "J'y vais aussi" ("go": the place goes
// into their favourites on the phone, and the author hears of it). One of
// each per person; tapping again takes it back. Counts are counted again
// each time, so they cannot drift.
export async function POST(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const body = await readBody(request);
    const id = typeof body.id === "string" && UUID.test(body.id) ? body.id : null;
    const what = body.what === "go" ? "go" : body.what === "like" ? "like" : null;
    if (!id || !what) return deny("invalid", 400);
    const db = getSupabaseAdminClient();
    const outing = await db.from("nt_outings").select("id,profile_id,spot_id").eq("id", id).eq("status", "PUBLISHED").maybeSingle();
    if (outing.error) return deny("failed", 502);
    if (!outing.data) return deny("invalid", 404);

    const table = what === "like" ? "nt_outing_likes" : "nt_outing_goers";
    const on = body.on !== false;
    const change = on
        ? await db.from(table).upsert({ outing_id: id, profile_id: profile.id }, { onConflict: "outing_id,profile_id", ignoreDuplicates: true })
        : await db.from(table).delete().eq("outing_id", id).eq("profile_id", profile.id);
    if (change.error) return deny("failed", 502);
    const { count } = await db.from(table).select("outing_id", { count: "exact", head: true }).eq("outing_id", id);
    await db.from("nt_outings").update(what === "like" ? { likes: count ?? 0 } : { goers: count ?? 0 }).eq("id", id);

    if (on) {
        const spot = await db.from("nt_spots").select("slug,name").eq("id", outing.data.spot_id).maybeSingle();
        await notify(outing.data.profile_id as string, what === "like" ? "outing_like" : "going", { id: profile.id, handle: profile.handle }, { place: spot.data?.slug as string, name: spot.data?.name as string, outing: id });
        if (what === "like") await checkLevel(outing.data.profile_id as string);
    }
    return NextResponse.json({ ok: true, count: count ?? 0 });
}
