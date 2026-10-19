import { NextResponse } from "next/server";
import { notify } from "@/lib/people/notices";
import { refreshPerson } from "@/lib/people/pages";
import { normalizeHandle } from "@/lib/people/rules";
import { currentProfile, deny, peopleByIds, readBody, requireProfile } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// "Suivre": a member follows another, and sees their outings under "Mes
// amis". The one followed hears of it.

async function profileByHandle(handle: unknown) {
    const { data } = await getSupabaseAdminClient().from("nt_profiles").select("id,handle").eq("handle", normalizeHandle(typeof handle === "string" ? handle : "")).eq("status", "ACTIVE").maybeSingle();
    return data as { id: string; handle: string } | null;
}

// ?handle=x → whether the reader follows them; with &list=followers|following, the people.
export async function GET(request: Request) {
    const query = new URL(request.url).searchParams;
    const person = await profileByHandle(query.get("handle"));
    if (!person) return deny("invalid", 404);
    const db = getSupabaseAdminClient();
    const viewer = await currentProfile().catch(() => null);
    const follows = viewer ? await db.from("nt_follows").select("follower_id").eq("follower_id", viewer.id).eq("followed_id", person.id).maybeSingle() : null;
    const list = query.get("list");
    let people = undefined;
    if (list === "followers" || list === "following") {
        const rows = await db
            .from("nt_follows")
            .select(list === "followers" ? "follower_id" : "followed_id")
            .eq(list === "followers" ? "followed_id" : "follower_id", person.id)
            .order("created_at", { ascending: false })
            .limit(200);
        const ids = ((rows.data ?? []) as unknown as Record<string, string>[]).map((row) => row[list === "followers" ? "follower_id" : "followed_id"]);
        const found = await peopleByIds(ids);
        people = ids.map((id) => found.get(id)).filter(Boolean);
    }
    return NextResponse.json({ ok: true, following: Boolean(follows?.data), people }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const body = await readBody(request);
    const person = await profileByHandle(body.handle);
    if (!person) return deny("invalid", 404);
    if (person.id === profile.id) return deny("own", 422);
    const db = getSupabaseAdminClient();
    const on = body.on !== false;
    const change = on
        ? await db.from("nt_follows").upsert({ follower_id: profile.id, followed_id: person.id }, { onConflict: "follower_id,followed_id", ignoreDuplicates: true })
        : await db.from("nt_follows").delete().eq("follower_id", profile.id).eq("followed_id", person.id);
    if (change.error) return deny("failed", 502);
    if (on) await notify(person.id, "follow", { id: profile.id, handle: profile.handle }, {});
    refreshPerson(person.handle);
    refreshPerson(profile.handle);
    const { count } = await db.from("nt_follows").select("follower_id", { count: "exact", head: true }).eq("followed_id", person.id);
    return NextResponse.json({ ok: true, following: on, followers: count ?? 0 });
}
