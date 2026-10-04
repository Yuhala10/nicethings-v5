import type { Locale } from "../i18n/config";
import { distanceMeters, type LatLng } from "../places/geo";

// Turn-by-turn navigation on OpenStreetMap roads (FOSSGIS OSRM servers:
// free, keyless, car and foot profiles). Everything here is pure so the
// screen just feeds it positions.

export type Profile = "car" | "foot";

export type Maneuver = {
    type: string; // turn, depart, arrive, roundabout, ...
    modifier: string | null; // left, slight right, uturn, ...
    location: [number, number]; // [lng, lat]
    exit: number | null;
};

export type Step = {
    maneuver: Maneuver;
    name: string;
    distance: number; // metres of this step
    start: number; // metres from route start where the step begins
};

export type Route = {
    coordinates: [number, number][];
    cumulative: number[]; // metres from start to each coordinate
    distance: number;
    duration: number; // seconds, already adjusted for real traffic
    steps: Step[];
};

const SERVERS: Record<Profile, string> = {
    car: "https://routing.openstreetmap.de/routed-car/route/v1/driving",
    foot: "https://routing.openstreetmap.de/routed-foot/route/v1/driving",
};

// OSRM assumes empty roads; Yaoundé and Douala traffic, shared taxis and
// hills make car trips far slower. Walking estimates are already realistic.
function trafficFactor(profile: Profile, now = new Date()) {
    if (profile === "foot") return 1;
    const hour = (now.getUTCHours() + 1) % 24; // West Africa Time
    const weekday = ((now.getUTCDay() + 6) % 7) < 5;
    const rush = weekday && ((hour >= 6.5 && hour < 9) || (hour >= 16 && hour < 20));
    return rush ? 2.4 : 1.7;
}

export function isRushHour(now = new Date()) {
    return trafficFactor("car", now) > 2;
}

type OsrmStep = {
    maneuver: { type: string; modifier?: string; location: [number, number]; exit?: number };
    name: string;
    distance: number;
};

export async function fetchRoute(from: LatLng, to: LatLng, profile: Profile, signal?: AbortSignal): Promise<Route> {
    const url = `${SERVERS[profile]}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`routing ${response.status}`);
    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) throw new Error("no route");

    const coordinates: [number, number][] = route.geometry.coordinates;
    const cumulative = [0];
    for (let i = 1; i < coordinates.length; i++) {
        cumulative.push(
            cumulative[i - 1] +
                distanceMeters({ lat: coordinates[i - 1][1], lng: coordinates[i - 1][0] }, { lat: coordinates[i][1], lng: coordinates[i][0] })
        );
    }

    let start = 0;
    const steps: Step[] = (route.legs[0].steps as OsrmStep[]).map((step) => {
        const item: Step = {
            maneuver: {
                type: step.maneuver.type,
                modifier: step.maneuver.modifier ?? null,
                location: step.maneuver.location,
                exit: step.maneuver.exit ?? null,
            },
            name: step.name,
            distance: step.distance,
            start,
        };
        start += step.distance;
        return item;
    });

    return {
        coordinates,
        cumulative,
        distance: route.distance,
        duration: route.duration * trafficFactor(profile),
        steps,
    };
}

// ---- Geometry -----------------------------------------------------------

const toXY = (p: [number, number], lat0: number) => {
    const k = Math.cos((lat0 * Math.PI) / 180) * 111_320;
    return [p[0] * k, p[1] * 110_540] as const;
};

// Closest point of the route to a position: how far along we are and how
// far from the road we stand.
export function snapToRoute(route: Route, position: LatLng) {
    const lat0 = position.lat;
    const [px, py] = toXY([position.lng, position.lat], lat0);
    let best = { along: 0, offset: Infinity, index: 0 };
    for (let i = 0; i < route.coordinates.length - 1; i++) {
        const [ax, ay] = toXY(route.coordinates[i], lat0);
        const [bx, by] = toXY(route.coordinates[i + 1], lat0);
        const dx = bx - ax;
        const dy = by - ay;
        const lengthSq = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
        const cx = ax + t * dx;
        const cy = ay + t * dy;
        const offset = Math.hypot(px - cx, py - cy);
        if (offset < best.offset) {
            best = { offset, index: i, along: route.cumulative[i] + t * (route.cumulative[i + 1] - route.cumulative[i]) };
        }
    }
    return best;
}

// Point `ahead` metres further along the route (for the camera bearing).
export function pointAlong(route: Route, along: number): [number, number] {
    const target = Math.min(along, route.distance);
    for (let i = 1; i < route.cumulative.length; i++) {
        if (route.cumulative[i] >= target) {
            const span = route.cumulative[i] - route.cumulative[i - 1] || 1;
            const t = (target - route.cumulative[i - 1]) / span;
            const a = route.coordinates[i - 1];
            const b = route.coordinates[i];
            return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        }
    }
    return route.coordinates[route.coordinates.length - 1];
}

export function bearing(from: [number, number], to: [number, number]) {
    const rad = Math.PI / 180;
    const y = Math.sin((to[0] - from[0]) * rad) * Math.cos(to[1] * rad);
    const x = Math.cos(from[1] * rad) * Math.sin(to[1] * rad) - Math.sin(from[1] * rad) * Math.cos(to[1] * rad) * Math.cos((to[0] - from[0]) * rad);
    return ((Math.atan2(y, x) / rad) + 360) % 360;
}

// Index of the step we are on, given distance travelled.
export function currentStep(route: Route, along: number) {
    let index = 0;
    for (let i = 0; i < route.steps.length; i++) {
        if (route.steps[i].start <= along + 5) index = i;
    }
    return index;
}

// ---- Words ----------------------------------------------------------------

const DIRECTIONS: Record<string, { fr: string; en: string }> = {
    left: { fr: "à gauche", en: "left" },
    right: { fr: "à droite", en: "right" },
    "slight left": { fr: "légèrement à gauche", en: "slightly left" },
    "slight right": { fr: "légèrement à droite", en: "slightly right" },
    "sharp left": { fr: "franchement à gauche", en: "sharp left" },
    "sharp right": { fr: "franchement à droite", en: "sharp right" },
    straight: { fr: "tout droit", en: "straight on" },
    uturn: { fr: "demi-tour", en: "a U-turn" },
};

// "Tourne à droite sur Rue 1.750" / "Turn right onto Rue 1.750".
export function instruction(step: Step, locale: Locale) {
    const { type, modifier, exit } = step.maneuver;
    const dir = modifier ? DIRECTIONS[modifier]?.[locale] ?? "" : "";
    const onto = step.name ? (locale === "fr" ? ` sur ${step.name}` : ` onto ${step.name}`) : "";
    const fr = locale === "fr";

    switch (type) {
        case "depart":
            return fr ? `Pars${step.name ? ` sur ${step.name}` : ""}` : `Head off${step.name ? ` on ${step.name}` : ""}`;
        case "arrive":
            return fr ? "Tu es arrivé(e) à destination" : "You have arrived";
        case "roundabout":
        case "rotary":
            return fr
                ? `Au rond-point, prends la ${exit ? `${exit}${exit === 1 ? "re" : "e"} sortie` : "sortie"}${onto}`
                : `At the roundabout, take the ${exit ? `${ordinal(exit)} exit` : "exit"}${onto}`;
        case "continue":
        case "new name":
            return modifier && modifier !== "straight" ? (fr ? `Continue ${dir}${onto}` : `Keep ${dir}${onto}`) : fr ? `Continue tout droit${onto}` : `Continue straight${onto}`;
        case "merge":
            return fr ? `Rejoins la voie${onto}` : `Merge${onto}`;
        case "fork":
            return fr ? `À l'embranchement, garde ${dir}${onto}` : `At the fork, keep ${dir}${onto}`;
        case "end of road":
            return fr ? `Au bout de la route, tourne ${dir}${onto}` : `At the end of the road, turn ${dir}${onto}`;
        default:
            if (modifier === "uturn") return fr ? `Fais demi-tour${onto}` : `Make a U-turn${onto}`;
            if (modifier === "straight") return fr ? `Continue tout droit${onto}` : `Go straight${onto}`;
            return fr ? `Tourne ${dir}${onto}` : `Turn ${dir}${onto}`;
    }
}

function ordinal(n: number) {
    return `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
}

// "Dans 200 m, tourne à droite…" for the voice.
export function spoken(step: Step, meters: number, locale: Locale) {
    const text = instruction(step, locale);
    if (meters < 40 || step.maneuver.type === "arrive") return text;
    // Rounded the way people say it (and so the same sentence repeats,
    // which lets the voice be prepared in advance).
    const near = meters >= 200 ? Math.round(meters / 50) * 50 : Math.round(meters / 10) * 10;
    const rounded = meters >= 1000 ? `${(meters / 1000).toFixed(1).replace(".", locale === "fr" ? "," : ".")} ${locale === "fr" ? "kilomètre" : "kilometres"}` : `${near} mètres`;
    return locale === "fr" ? `Dans ${rounded}, ${text.charAt(0).toLowerCase()}${text.slice(1)}` : `In ${rounded.replace("mètres", "metres")}, ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}
