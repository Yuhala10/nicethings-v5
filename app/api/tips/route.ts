import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { notInstalled } from "@/lib/atlas/store";
import { getPlace } from "@/lib/places/server";
import { UUID } from "@/lib/posts";
import { loadTips, tipsTag } from "@/lib/people/kwat";
import { checkLevel } from "@/lib/people/notices";
import { refreshPerson } from "@/lib/people/pages";
import { MAX_TIP, MIN_TIP, TIP_KINDS, needsReading, type TipKind } from "@/lib/people/rules";
import { currentProfile, deny, readBody, requireProfile } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// The way to a place, written by those who went: "taxi", the sentence to
// tell the driver; "way", the path in words. One of each per member and
// place; writing again changes it.

const NOW = { expire: 0 };

async function placeOf(slug: unknown) {
    return typeof slug === "string" && slug.length <= 200 ? await getPlace(slug).catch(() => null) : null;
}

export async function GET(request: Request) {
    const place = await placeOf(new URL(request.url).searchParams.get("place"));
    if (!place) return deny("invalid", 404);
    try {
        const viewer = await currentProfile().catch(() => null);
        return NextResponse.json({ ok: true, tips: await loadTips(place.id, viewer?.id ?? null) }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
        if (notInstalled(error)) return deny("closed", 503);
        console.error("Ways not read:", error);
        return deny("failed", 502);
    }
}

export async function POST(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const body = await readBody(request);
    const place = await placeOf(body.place);
    if (!place) return deny("invalid", 404);
    const kind = (TIP_KINDS as readonly string[]).includes(body.kind as string) ? (body.kind as TipKind) : null;
    if (!kind) return deny("invalid", 400);
    const text = typeof body.body === "string" ? body.body.replace(/\s+/g, " ").trim().slice(0, MAX_TIP[kind]) : "";
    if (text.length < MIN_TIP) return deny("short", 422);

    const db = getSupabaseAdminClient();
    try {
        const saved = await db
            .from("nt_place_tips")
            .upsert({ spot_id: place.id, profile_id: profile.id, kind, body: text, status: needsReading(text) ? "PENDING" : "PUBLISHED", updated_at: new Date().toISOString() }, { onConflict: "spot_id,profile_id,kind" });
        if (saved.error) throw saved.error;
        revalidateTag(tipsTag(place.id), NOW);
        revalidateTag("kwat", NOW);
        refreshPerson(profile.handle);
        await checkLevel(profile.id);
        return NextResponse.json({ ok: true, tips: await loadTips(place.id, profile.id) });
    } catch (error) {
        if (notInstalled(error)) return deny("closed", 503);
        console.error("Way not saved:", error);
        return deny("failed", 502);
    }
}

export async function DELETE(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !UUID.test(id)) return deny("invalid", 400);
    const gone = await getSupabaseAdminClient().from("nt_place_tips").delete().eq("id", id).eq("profile_id", profile.id).select("spot_id").maybeSingle();
    if (gone.error) return deny("failed", 502);
    if (gone.data) revalidateTag(tipsTag(gone.data.spot_id as string), NOW);
    refreshPerson(profile.handle);
    return NextResponse.json({ ok: true });
}
