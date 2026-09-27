import { NextResponse } from "next/server";
import { getPlacesBySlugs } from "@/lib/places/server";

// GET /api/places?slugs=a,b,c — summaries for the visitor's saved places.
export async function GET(request: Request) {
    const raw = new URL(request.url).searchParams.get("slugs") ?? "";
    const slugs = raw
        .split(",")
        .map((slug) => slug.trim())
        .filter((slug) => /^[a-z0-9-]{1,200}$/.test(slug))
        .slice(0, 200);

    if (!slugs.length) return NextResponse.json({ places: [] });

    try {
        const places = await getPlacesBySlugs(slugs);
        return NextResponse.json({ places }, { headers: { "Cache-Control": "private, max-age=60" } });
    } catch (error) {
        console.error("Saved places lookup failed:", error);
        return NextResponse.json({ message: "Lookup failed." }, { status: 502 });
    }
}
