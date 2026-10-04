import { NextResponse } from "next/server";
import { cityBySlug } from "@/lib/cities";
import { cleanPosition } from "@/lib/feedback";
import { getCityPlaces } from "@/lib/places/server";
import { findSimilar } from "@/lib/places/similar";

// GET /api/places/similar?name=…&city=…&lat=…&lng=… — places already on
// NiceThings that look like the one being added (while the visitor types).
export async function GET(request: Request) {
    const params = new URL(request.url).searchParams;
    const name = (params.get("name") ?? "").trim().slice(0, 120);
    const city = cityBySlug(params.get("city"));
    if (name.length < 3 || !city) return NextResponse.json({ matches: [] });
    const position = cleanPosition(params.get("lat"), params.get("lng"));

    const places = await getCityPlaces(city.slug).catch(() => []);
    const matches = findSimilar(places, { name, lat: position?.lat, lng: position?.lng, neighborhood: params.get("area") }).map((match) => ({
        slug: match.place.slug,
        name: match.place.name,
        category: match.place.category,
        neighborhood: match.place.neighborhood,
        cover: match.place.cover,
        distance: match.distance,
        duplicate: match.duplicate,
    }));
    return NextResponse.json({ matches }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
