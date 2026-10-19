import { NextResponse } from "next/server";
import { isLocale } from "@/lib/i18n";
import { pushKeys, readPhoneAddress } from "@/lib/push-server";
import { deny, readBody, requireProfile } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// This phone, for their Activité as notifications ("@x a validé ton avis").
export async function GET() {
    return NextResponse.json({ ok: true, key: pushKeys()?.publicKey ?? null });
}

export async function POST(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    if (!pushKeys()) return deny("closed", 503);
    const body = await readBody(request);
    const address = readPhoneAddress(body);
    if (!address) return deny("invalid", 400);
    const { error } = await getSupabaseAdminClient()
        .from("nt_profile_phones")
        .upsert({ ...address, profile_id: profile.id, lang: typeof body.lang === "string" && isLocale(body.lang) ? body.lang : "fr", failures: 0 }, { onConflict: "endpoint" });
    if (error) return deny("failed", 502);
    return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const body = await readBody(request);
    if (typeof body.endpoint !== "string") return deny("invalid", 400);
    await getSupabaseAdminClient().from("nt_profile_phones").delete().eq("endpoint", body.endpoint).eq("profile_id", profile.id);
    return NextResponse.json({ ok: true });
}
