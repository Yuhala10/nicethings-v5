import { NextResponse } from "next/server";
import { cityBySlug } from "@/lib/cities";
import { cleanText } from "@/lib/feedback";
import { getFeed } from "@/lib/people/kwat";

// "Ça bouge au kwat": the latest reviews, photos, live news and ways of a
// city, with the faces of those who gave them; the visitor's neighbourhood
// first.
export async function GET(request: Request) {
    const query = new URL(request.url).searchParams;
    const city = cityBySlug(query.get("city"))?.slug ?? null;
    const area = cleanText(query.get("area"), 60);
    const limit = Math.min(Math.max(Number(query.get("n")) || 12, 1), 40);
    try {
        const items = await getFeed(city, area, limit);
        return NextResponse.json({ ok: true, items }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60" } });
    } catch (error) {
        console.error("Feed not read:", error);
        return NextResponse.json({ ok: true, items: [] });
    }
}
