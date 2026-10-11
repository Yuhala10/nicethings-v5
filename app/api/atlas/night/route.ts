import { NextResponse } from "next/server";
import { runAtlas } from "@/lib/atlas/run";
import { notInstalled } from "@/lib/atlas/store";
import { refreshPlaces } from "@/lib/refresh";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

// GET /api/atlas/night — Atlas's night shift, called once a day by the
// host's scheduler (vercel.json). It only does free work (the open map, the
// platform checks), never more than once in twenty hours, and never when
// Atlas is paused; anyone else calling it is turned away.
export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    const scheduled = (request.headers.get("user-agent") ?? "").includes("vercel-cron");
    const trusted = secret ? request.headers.get("authorization") === `Bearer ${secret}` : scheduled;
    if (!trusted) return NextResponse.json({ ok: false }, { status: 401 });

    try {
        const shift = await runAtlas(getSupabaseAdminClient(), { kind: "night" });
        if (shift.ran && shift.changed) refreshPlaces();
        return NextResponse.json({ ok: true, shift });
    } catch (error) {
        if (notInstalled(error)) return NextResponse.json({ ok: true, setup: true });
        console.error("Atlas night shift failed:", error);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
