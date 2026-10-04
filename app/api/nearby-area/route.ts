import { NextResponse } from "next/server";
import { cityAt } from "@/lib/cities";
import { cleanPosition } from "@/lib/feedback";
import { distanceMeters } from "@/lib/places/geo";
import { getCityPlaces } from "@/lib/places/server";

// GET /api/nearby-area?lat=…&lng=… — the city and neighbourhood around a
// position, read from the closest known places. Lets "I'm there now" fill
// in the address fields for the visitor.
export async function GET(request: Request) {
    const params = new URL(request.url).searchParams;
    const position = cleanPosition(params.get("lat"), params.get("lng"));
    const city = position ? cityAt(position.lat, position.lng) : null;
    if (!position || !city) return NextResponse.json({ city: null, neighborhood: null });

    let best: { name: string; distance: number } | null = null;
    for (const place of await getCityPlaces(city.slug).catch(() => [])) {
        if (!place.neighborhood) continue;
        const distance = distanceMeters(position, place);
        if (distance <= 700 && (!best || distance < best.distance)) best = { name: place.neighborhood, distance };
    }
    return NextResponse.json(
        { city: city.slug, neighborhood: best?.name ?? null },
        { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } }
    );
}
