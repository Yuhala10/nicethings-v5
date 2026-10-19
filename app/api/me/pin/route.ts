import { NextResponse } from "next/server";
import { pinProblem } from "@/lib/people/rules";
import { cleanRecoveryCode, deny, hashSecret, newRecoveryCode, readBody, requireProfile, secretMatches } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// A new PIN (the current one is asked first), or a new rescue code (with
// the PIN). Other phones stay signed in.
export async function POST(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const body = await readBody(request);
    const db = getSupabaseAdminClient();
    const secret = await db.from("nt_profiles").select("pin_hash").eq("id", profile.id).single();
    if (secret.error) return deny("failed", 502);
    if (!(await secretMatches(typeof body.current === "string" ? body.current : "", secret.data.pin_hash as string))) return deny("wrong", 401);

    if (body.recovery === true) {
        const recovery = newRecoveryCode();
        const saved = await db.from("nt_profiles").update({ recovery_hash: await hashSecret(cleanRecoveryCode(recovery)) }).eq("id", profile.id);
        if (saved.error) return deny("failed", 502);
        return NextResponse.json({ ok: true, recovery });
    }

    const pin = typeof body.pin === "string" ? body.pin : "";
    const issue = pinProblem(pin);
    if (issue) return deny(`pin_${issue}`, 422);
    const saved = await db.from("nt_profiles").update({ pin_hash: await hashSecret(pin), updated_at: new Date().toISOString() }).eq("id", profile.id);
    if (saved.error) return deny("failed", 502);
    return NextResponse.json({ ok: true });
}
