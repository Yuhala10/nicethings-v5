import { NextResponse } from "next/server";
import { REPORT_REASONS, cleanText, publicWriteClient, type ReportReason } from "@/lib/feedback";
import { getPlace } from "@/lib/places/server";

// "Signaler une erreur" from a place page.
export async function POST(request: Request) {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
    }

    // Bots fill every field; people never see this one.
    if (body.website) return NextResponse.json({ ok: true });

    const slug = cleanText(body.slug, 200);
    const reason = body.reason as ReportReason;
    if (!slug || !REPORT_REASONS.includes(reason)) {
        return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
    }

    const place = await getPlace(slug).catch(() => null);
    if (!place) return NextResponse.json({ ok: false, message: "Unknown place." }, { status: 404 });

    const { error } = await publicWriteClient()
        .from("nt_reports")
        .insert({ spot_id: place.id, reason, description: cleanText(body.details, 1000), status: "PENDING" });

    if (error) {
        console.error("Report insert failed:", error);
        return NextResponse.json({ ok: false, message: "Could not save the report." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
}
