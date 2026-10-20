import { NextResponse } from "next/server";
import { cleanText } from "@/lib/feedback";
import { deny, readBody, requireProfile } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// "Demander le badge vérifié": who they are (a creator, a business, a
// public figure), a link that proves it, a word. The team answers from the
// console; the answer arrives in their Activité.

const KINDS = ["creator", "business", "public", "other"];

// Their latest request, if any.
export async function GET(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const { data, error } = await getSupabaseAdminClient().from("nt_verify_requests").select("status,kind,created_at").eq("profile_id", profile.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) return NextResponse.json({ ok: true, request: null, closed: true });
    return NextResponse.json({ ok: true, request: data ?? null }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const body = await readBody(request);
    const kind = KINDS.includes(body.kind as string) ? (body.kind as string) : null;
    const link = cleanText(body.link, 200);
    if (!kind) return deny("invalid", 400);
    if (!link) return deny("link", 422);
    const db = getSupabaseAdminClient();
    const already = await db.from("nt_profiles").select("verified,role").eq("id", profile.id).single();
    if (already.data?.verified || already.data?.role !== "member") return deny("already", 409);
    // One open request at a time; a declined one can be made again after a week.
    const week = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const recent = await db.from("nt_verify_requests").select("id").eq("profile_id", profile.id).eq("status", "DECLINED").gte("decided_at", week).limit(1);
    if (recent.data?.length) return deny("many", 429);
    const saved = await db.from("nt_verify_requests").insert({ profile_id: profile.id, kind, link, note: cleanText(body.note, 300) });
    if (saved.error) {
        if (saved.error.code === "23505") return deny("pending", 409);
        console.error("Badge request not saved:", saved.error);
        return deny("failed", 502);
    }
    return NextResponse.json({ ok: true });
}
