// The sky over a city, as far as it changes what one would propose: a
// downpour, or real heat. Read from Open-Meteo (free, no key), which asks
// to be credited: the "right now" section names it.

export type Sky = "rain" | "heat";
export type Weather = { sky: Sky | null; temperature: number | null };

// Weather codes that mean water is falling: drizzle, rain, showers, storms.
const WET = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const HOT = 32; // °C, by day

export function skyOf(current: { temperature: number | null; precipitation: number | null; code: number | null; day: boolean }): Sky | null {
    if ((current.precipitation ?? 0) >= 0.3 || (current.code !== null && WET.has(current.code))) return "rain";
    if (current.day && (current.temperature ?? 0) >= HOT) return "heat";
    return null;
}
