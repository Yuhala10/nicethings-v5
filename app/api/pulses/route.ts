import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { notInstalled } from "@/lib/atlas/store";
import { getPlace } from "@/lib/places/server";
import { loadPulses } from "@/lib/people/kwat";
import { checkLevel } from "@/lib/people/notices";
import { PULSES, PULSES_PER_DAY, PULSE_REST_MINUTES } from "@/lib/people/rules";
import { deny, readBody, requireProfile } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// Right now at a place: "ouvert", "fermé", "ça bouge", "calme", "plein",
// "coupure de courant", from someone who is there, in one tap. Shown for a
// few hours (lib/people/rules.ts, PULSE_HOURS), signed with their face.

async function placeOf(slug: unknown) {
    return typeof slug === "string" && slug.length <= 200 ? await getPlace(slug).catch(() => null) : null;
}

export async function GET(request: Request) {
    const place = await placeOf(new URL(request.url).searchParams.get("place"));
    if (!place) return deny("invalid", 404);
    try {
        // Seconds old at most: it is live news.
        return NextResponse.json({ ok: true, pulses: await loadPulses(place.id) }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=20, stale-while-revalidate=40" } });
    } catch (error) {
        if (notInstalled(error)) return deny("closed", 503);
        console.error("Live news not read:", error);
        return deny("failed", 502);
    }
}

export async function POST(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const body = await readBody(request);
    const place = await placeOf(body.place);
    if (!place) return deny("invalid", 404);
    const kind = (PULSES as readonly string[]).includes(body.kind as string) ? (body.kind as string) : null;
    if (!kind) return deny("invalid", 400);

    const db = getSupabaseAdminClient();
    try {
        const rest = new Date(Date.now() - PULSE_REST_MINUTES * 60_000).toISOString();
        const day = new Date(Date.now() - 86_400_000).toISOString();
        const [recent, today] = await Promise.all([
            db.from("nt_place_pulses").select("id,kind").eq("profile_id", profile.id).eq("spot_id", place.id).gte("created_at", rest),
            db.from("nt_place_pulses").select("id", { count: "exact", head: true }).eq("profile_id", profile.id).gte("created_at", day),
        ]);
        if (recent.error) throw recent.error;
        if ((today.count ?? 0) >= PULSES_PER_DAY) return deny("many", 429);
        // Said already a moment ago: the same news is not counted twice; a
        // different one (it closed, the power went) replaces it.
        if (recent.data?.some((row) => row.kind === kind)) return NextResponse.json({ ok: true, pulses: await loadPulses(place.id), already: true });
        if (recent.data?.length) await db.from("nt_place_pulses").delete().in("id", recent.data.map((row) => row.id));
        const saved = await db.from("nt_place_pulses").insert({ spot_id: place.id, profile_id: profile.id, kind });
        if (saved.error) throw saved.error;
        revalidateTag("kwat", { expire: 0 });
        await checkLevel(profile.id);
        return NextResponse.json({ ok: true, pulses: await loadPulses(place.id) });
    } catch (error) {
        if (notInstalled(error)) return deny("closed", 503);
        console.error("Live news not saved:", error);
        return deny("failed", 502);
    }
}
