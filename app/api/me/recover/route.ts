import { NextResponse } from "next/server";
import { notInstalled } from "@/lib/atlas/store";
import { pinProblem } from "@/lib/people/rules";
import { checkSecret } from "@/lib/people/signin";
import { cleanRecoveryCode, deny, foreign, hashSecret, meOf, newRecoveryCode, readBody, robot, startSession } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// A forgotten PIN: the @name and the rescue code given at sign-up set a new
// PIN. The code is then used up and a new one is shown.
export async function POST(request: Request) {
    const body = await readBody(request);
    if (robot(request, body) || foreign(request)) return deny("invalid", 400);
    const pin = typeof body.pin === "string" ? body.pin : "";
    const pinIssue = pinProblem(pin);
    if (pinIssue) return deny(`pin_${pinIssue}`, 422);
    const code = cleanRecoveryCode(body.code);
    if (code.length !== 12) return deny("wrong", 401);
    try {
        const result = await checkSecret(request, body.handle, code, "recovery");
        if (result.ok === false) return deny(result.why, result.status, result.more);
        const recovery = newRecoveryCode();
        const saved = await getSupabaseAdminClient()
            .from("nt_profiles")
            .update({ pin_hash: await hashSecret(pin), recovery_hash: await hashSecret(cleanRecoveryCode(recovery)), updated_at: new Date().toISOString() })
            .eq("id", result.row.id);
        if (saved.error) throw saved.error;
        await startSession(result.row.id, request);
        return NextResponse.json({ ok: true, me: await meOf(result.row), recovery });
    } catch (error) {
        if (notInstalled(error)) return deny("closed", 503);
        console.error("Rescue failed:", error);
        return deny("failed", 502);
    }
}
