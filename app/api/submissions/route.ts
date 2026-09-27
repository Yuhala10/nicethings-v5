import { NextResponse } from "next/server";
import {
    cleanCategory,
    cleanPhone,
    cleanPosition,
    cleanPrice,
    cleanText,
    publicWriteClient,
} from "@/lib/feedback";

// "Ajouter un lieu": a visitor suggests a place; it waits in the admin
// queue as PENDING until someone checks it.
export async function POST(request: Request) {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
    }

    if (body.website) return NextResponse.json({ ok: true }); // honeypot

    const name = cleanText(body.name, 120);
    const phone = cleanPhone(body.phone);
    const price = cleanPrice(body.price);
    const errors: Record<string, string> = {};
    if (!name || name.length < 2) errors.name = "required";
    if (phone === undefined) errors.phone = "invalid";
    if (price === undefined) errors.price = "invalid";
    if (Object.keys(errors).length) {
        return NextResponse.json({ ok: false, errors }, { status: 422 });
    }

    const position = cleanPosition(body.lat, body.lng);
    const why = cleanText(body.why, 900);
    // The submissions table has no price column: keep it with the notes so
    // the admin sees everything in one place.
    const description = [why, price ? `Prix moyen : ${price} FCFA` : null].filter(Boolean).join("\n") || null;

    const { error } = await publicWriteClient()
        .from("nt_spot_submissions")
        .insert({
            name,
            category: cleanCategory(body.category),
            neighborhood: cleanText(body.neighborhood, 60),
            landmark: cleanText(body.landmark, 200),
            phone,
            description,
            latitude: position?.lat ?? null,
            longitude: position?.lng ?? null,
            status: "PENDING",
        });

    if (error) {
        console.error("Submission insert failed:", error);
        return NextResponse.json({ ok: false, message: "Could not save the place." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
}
