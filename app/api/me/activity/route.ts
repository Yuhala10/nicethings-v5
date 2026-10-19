import { NextResponse } from "next/server";
import { deny, peopleByIds, readBody, requireProfile } from "@/lib/people/server";
import type { Notice } from "@/lib/people/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// Activité: what happened to their reviews, photos, words and ways, newest
// first, each with the face of who did it.
export async function GET(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const { data, error } = await getSupabaseAdminClient().from("nt_notices").select("id,kind,actor_id,data,read_at,created_at").eq("profile_id", profile.id).order("created_at", { ascending: false }).limit(60);
    if (error) return NextResponse.json({ ok: true, notices: [] });
    const people = await peopleByIds((data ?? []).map((row) => (row.actor_id as string | null) ?? ""));
    const notices: Notice[] = (data ?? []).map((row) => ({
        id: row.id as string,
        kind: row.kind as Notice["kind"],
        actor: row.actor_id ? (people.get(row.actor_id as string) ?? null) : null,
        data: (row.data as Notice["data"]) ?? {},
        read: Boolean(row.read_at),
        createdAt: row.created_at as string,
    }));
    return NextResponse.json({ ok: true, notices }, { headers: { "Cache-Control": "private, no-store" } });
}

// Seen: everything, or one notice (a level once celebrated).
export async function POST(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const body = await readBody(request);
    const query = getSupabaseAdminClient().from("nt_notices").update({ read_at: new Date().toISOString() }).eq("profile_id", profile.id).is("read_at", null);
    const { error } = typeof body.id === "string" ? await query.eq("id", body.id) : await query;
    if (error) return deny("failed", 502);
    return NextResponse.json({ ok: true });
}
