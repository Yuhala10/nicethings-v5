import { NextResponse, after } from "next/server";
import { cityBySlug } from "@/lib/cities";
import { skyOf, type Weather } from "@/lib/host/weather";
import { weatherNotice } from "@/lib/push-server";

// GET /api/weather?city=douala — the sky over a city right now, for the
// "right now" section. The answer is the same for everyone and is kept ten
// minutes, so each city asks the weather service a few times an hour at most.
//
// It is also what sets the weather notices off (lib/push-server.ts): each
// time the sky is read and it rains, or it is very hot, the phones that
// asked to be told about that city are, once the answer has left.
export const maxDuration = 30;

const CACHE = "public, max-age=300, s-maxage=600, stale-while-revalidate=1800";

export async function GET(request: Request) {
    const city = cityBySlug(new URL(request.url).searchParams.get("city"));
    if (!city) return NextResponse.json({ sky: null, temperature: null }, { status: 400 });
    const calm: Weather = { sky: null, temperature: null };
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&current=temperature_2m,precipitation,weather_code,is_day`;
        const answer = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store" });
        if (!answer.ok) throw new Error(`Weather ${answer.status}`);
        const current = (await answer.json()).current ?? {};
        const temperature = typeof current.temperature_2m === "number" ? current.temperature_2m : null;
        const weather: Weather = {
            temperature,
            sky: skyOf({ temperature, precipitation: typeof current.precipitation === "number" ? current.precipitation : null, code: typeof current.weather_code === "number" ? current.weather_code : null, day: current.is_day !== 0 }),
        };
        if (weather.sky) after(() => weatherNotice(city, weather).catch((error) => console.error("Weather notice failed:", error)));
        return NextResponse.json(weather, { headers: { "Cache-Control": CACHE } });
    } catch (error) {
        // No weather is not an error for the visitor: the section simply follows the clock.
        console.error("Weather not read:", error);
        return NextResponse.json(calm, { headers: { "Cache-Control": "public, max-age=60, s-maxage=120" } });
    }
}
