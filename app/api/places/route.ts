import { NextResponse } from "next/server";
import { getAllPlaces, getPlacesBySlugs } from "@/lib/places/server";

const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ?slugs=a,b,c → those places (saved places, a top 3).
// ?q=chicken&city=yaounde → a few places whose name matches, the city's
// first (the outing form's "Où étais-tu ?").
export async function GET(request: Request) {
    const query = new URL(request.url).searchParams;
    const words = plain(query.get("q") ?? "").trim();
    if (words.length >= 2) {
        const city = query.get("city");
        try {
            const found = (await getAllPlaces())
                .map((place) => {
                    const name = plain(place.name);
                    const score = name.startsWith(words) ? 3 : name.split(/\s+/).some((part) => part.startsWith(words)) ? 2 : name.includes(words) ? 1 : 0;
                    return { place, score: score && (place.city === city ? score + 3 : score) };
                })
                .filter((item) => item.score > 0)
                .sort((a, b) => b.score - a.score || a.place.name.length - b.place.name.length)
                .slice(0, 8)
                .map(({ place }) => ({ slug: place.slug, name: place.name, neighborhood: place.neighborhood, city: place.city, cover: place.cover, category: place.category }));
            return NextResponse.json({ places: found }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
        } catch (error) {
            console.error("Place search failed:", error);
            return NextResponse.json({ places: [] }, { status: 502 });
        }
    }

    const raw = query.get("slugs") ?? "";
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
