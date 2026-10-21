import { NextResponse } from "next/server";
import { PROFILE_COLUMNS, deny, statsOf, toPerson, type ProfileRow } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// Finding members: ?q= part of an @name (from its start) or of a name.
// Public, like the profiles themselves; suspended ones are not found.

export async function GET(request: Request) {
    const raw = new URL(request.url).searchParams.get("q") ?? "";
    // Letters (accents too), digits, dots, underscores and spaces only: what
    // a name or an @name is made of, and nothing the query language reads.
    const words = raw.replace(/^@/, "").normalize("NFC").replace(/[^\p{L}\p{N}._ -]/gu, "").trim().slice(0, 30);
    if (words.length < 2) return NextResponse.json({ ok: true, people: [] });
    const db = getSupabaseAdminClient();
    const handle = words.toLowerCase().replace(/\s+/g, "");
    const found = await db
        .from("nt_profiles")
        .select(PROFILE_COLUMNS)
        .eq("status", "ACTIVE")
        .or(`handle.ilike.${handle}%,name.ilike.%${words}%`)
        .order("member_no", { ascending: true })
        .limit(20);
    if (found.error) return deny("failed", 502);
    const rows = (found.data ?? []) as ProfileRow[];
    const stats = await statsOf(rows.map((row) => row.id));
    // The @name that starts with what was typed comes first.
    const people = rows.map((row) => toPerson(row, stats.get(row.id))).sort((a, b) => Number(b.handle.startsWith(handle)) - Number(a.handle.startsWith(handle)));
    return NextResponse.json({ ok: true, people }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } });
}
