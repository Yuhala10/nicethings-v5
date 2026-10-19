import { NextResponse } from "next/server";
import { notInstalled } from "@/lib/atlas/store";
import { cityBySlug } from "@/lib/cities";
import { cleanText } from "@/lib/feedback";
import { UUID } from "@/lib/posts";
import { defaultAvatar, parseAvatar } from "@/lib/people/avatars";
import { checkHandle } from "@/lib/people/handles";
import { MAX_NAME, SIGNUPS_PER_DAY, pinProblem } from "@/lib/people/rules";
import { cleanRecoveryCode, connectionOf, deny, foreign, hashSecret, meOf, newRecoveryCode, noteAttempt, readBody, robot, startSession, type ProfileRow, PROFILE_COLUMNS } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// A new profile: an @name nobody else has, a face, a neighbourhood and a
// 6-digit PIN. The phone is signed in at once, and a rescue code is shown
// once, for the day the PIN is forgotten.
export async function POST(request: Request) {
    const body = await readBody(request);
    if (robot(request, body) || foreign(request)) return deny("invalid", 400);

    const pin = typeof body.pin === "string" ? body.pin : "";
    const pinIssue = pinProblem(pin);
    if (pinIssue) return deny(`pin_${pinIssue}`, 422);
    const city = cityBySlug(typeof body.city === "string" ? body.city : null);
    const area = cleanText(body.area, 60);

    const db = getSupabaseAdminClient();
    const connection = connectionOf(request);
    try {
        // A few profiles per connection and day: a family or a cybercafé, not a factory.
        const since = new Date(Date.now() - 86_400_000).toISOString();
        const made = await db.from("nt_login_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", connection).eq("handle", "+signup").gte("at", since);
        if ((made.count ?? 0) >= SIGNUPS_PER_DAY) return deny("many", 429);

        const checked = await checkHandle(body.handle, area);
        if (checked.problem) return deny(checked.problem, 409, { suggestions: checked.suggestions });

        const recovery = newRecoveryCode();
        const avatar = parseAvatar(body.avatar) ? (body.avatar as string) : defaultAvatar(checked.handle);
        const created = await db
            .from("nt_profiles")
            .insert({
                handle: checked.handle,
                name: cleanText(body.name, MAX_NAME),
                avatar,
                city: city?.slug ?? null,
                area,
                pin_hash: await hashSecret(pin),
                recovery_hash: await hashSecret(cleanRecoveryCode(recovery)),
                first_visitor: typeof body.v === "string" && UUID.test(body.v) ? body.v.toLowerCase() : null,
            })
            .select(PROFILE_COLUMNS)
            .single();
        if (created.error) {
            // Taken in the second between the check and now.
            if (created.error.code === "23505") return deny("taken", 409, { suggestions: [] });
            throw created.error;
        }
        await noteAttempt(connection, "+signup", true);
        await startSession(created.data.id as string, request);
        return NextResponse.json({ ok: true, me: await meOf(created.data as ProfileRow), recovery });
    } catch (error) {
        if (notInstalled(error)) return deny("closed", 503);
        console.error("Profile not created:", error);
        return deny("failed", 502);
    }
}
