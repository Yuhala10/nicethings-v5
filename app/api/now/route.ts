import { NextResponse } from "next/server";
import { cityBySlug } from "@/lib/cities";
import { hostPool } from "@/lib/host/propose";
import { compactPlaces } from "@/lib/places/compact";
import { getCityPlaces } from "@/lib/places/server";

// GET /api/now?city=douala — the places of a city the app proposes from
// (see lib/host). The phone ranks them itself, by the hour and by where the
// visitor is, so this answer is the same for everyone and stays cached.
export async function GET(request: Request) {
    const city = cityBySlug(new URL(request.url).searchParams.get("city"));
    if (!city) return NextResponse.json({ city: null, places: [] }, { status: 400 });
    const places = await getCityPlaces(city.slug).catch(() => []);
    return NextResponse.json(
        { city: city.slug, places: compactPlaces(hostPool(places)) },
        { headers: { "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600" } }
    );
}
