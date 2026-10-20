// Fetches the neighbourhoods OpenStreetMap knows in every city NiceThings
// covers and writes them to lib/atlas/area-points.ts. Atlas uses that list
// each night to give a neighbourhood to the places that have none (see
// lib/atlas/run.ts). Free, no key. Run it again when the map has grown:
//
//   node scripts/atlas/areas.mjs [CM.txt]
//
// Where the open map knows few neighbourhoods (Garoua, Maroua, Buea…), a
// second free source fills in: GeoNames' list of places in Cameroon (CC BY
// 4.0). Download https://download.geonames.org/export/dump/CM.zip, unzip it
// and give the path of CM.txt; without it, only the open map is used.
//
// Yaoundé is left out: its neighbourhoods are a list kept by hand
// (scripts/import-osm.mjs) and every place there already has one.
import { readFileSync, writeFileSync } from "node:fs";

const OVERPASS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

// The cities, read from the app's own list so there is one source.
const cities = [...readFileSync("lib/cities.ts", "utf8").matchAll(/slug: "([^"]+)", name: "([^"]+)",.*?lat: ([\d.-]+), lng: ([\d.-]+),.*?radius: ([\d.]+)/g)]
    .map(([, slug, name, lat, lng, radius]) => ({ slug, name, lat: Number(lat), lng: Number(lng), radius: Number(radius) }))
    .filter((city) => city.slug !== "yaounde");
if (cities.length < 10) throw new Error("Could not read the cities from lib/cities.ts");

async function overpass(query) {
    for (let attempt = 0; attempt < 2; attempt++) {
        for (const host of OVERPASS) {
            try {
                const response = await fetch(host, {
                    method: "POST",
                    body: "data=" + encodeURIComponent(query),
                    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "NiceThings-Atlas/1.0 (nicethings.site)" },
                    signal: AbortSignal.timeout(90000),
                });
                if (response.ok) return (await response.json()).elements;
            } catch {}
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
    }
    return null;
}

// Points, and the centre of the ones drawn as an outline. Outside the two
// big cities the map files most quartiers as "village" or "hamlet" (Molyko
// in Buea, Djarengol in Maroua, Dombé in Kribi): inside a city's box they
// are what people there call the area.
const boxes = cities
    .map((city) => `nwr["place"~"^(suburb|quarter|neighbourhood|village|hamlet)$"]["name"](${city.lat - city.radius},${city.lng - city.radius},${city.lat + city.radius},${city.lng + city.radius});`)
    .join("\n");
const elements = await overpass(`[out:json][timeout:80];(\n${boxes}\n);out center;`);
if (!elements) throw new Error("The open map did not answer: nothing was changed.");

// A name that is a building or an institution is not a neighbourhood.
const usable = (name) => name.length >= 3 && name.length <= 40 && /\p{L}{3}/u.test(name) && !/catholic|mission|church|[ée]glise|mosqu|school|[ée]cole|lyc[ée]e|coll[eè]ge|h[oô]pital|hospital/i.test(name);
const points = Object.fromEntries(cities.map((city) => [city.name, []]));
for (const element of elements) {
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    const name = String(element.tags?.name ?? "").replace(/[_\s]+/g, " ").trim();
    if (lat == null || lng == null || !usable(name)) continue;
    // A point inside two city boxes goes to the closer centre.
    const city = cities
        .filter((item) => Math.abs(lat - item.lat) <= item.radius && Math.abs(lng - item.lng) <= item.radius)
        .sort((a, b) => Math.hypot(lat - a.lat, lng - a.lng) - Math.hypot(lat - b.lat, lng - b.lng))[0];
    if (!city) continue;
    const list = points[city.name];
    if (!list.some((point) => point[0] === name && Math.abs(point[1] - lat) < 0.002 && Math.abs(point[2] - lng) < 0.002)) list.push([name, Number(lat.toFixed(5)), Number(lng.toFixed(5))]);
}

// GeoNames: populated places and sections of them inside a city's box. The
// city's own name is not a neighbourhood, and a name the open map already
// has close by is not repeated.
const simple = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const geonames = process.argv[2] ? readFileSync(process.argv[2], "utf8") : "";
let added = 0;
for (const line of geonames.split("\n")) {
    const column = line.split("\t");
    if (column[6] !== "P" || !/^(PPL|PPLX|PPLL)$/.test(column[7] ?? "")) continue;
    const name = String(column[1] ?? "").replace(/[_\s]+/g, " ").trim();
    const lat = Number(column[4]);
    const lng = Number(column[5]);
    if (!usable(name) || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const city = cities
        .filter((item) => Math.abs(lat - item.lat) <= item.radius && Math.abs(lng - item.lng) <= item.radius)
        .sort((a, b) => Math.hypot(lat - a.lat, lng - a.lng) - Math.hypot(lat - b.lat, lng - b.lng))[0];
    if (!city || simple(name) === simple(city.name)) continue;
    const list = points[city.name];
    if (list.some((point) => simple(point[0]) === simple(name) && Math.abs(point[1] - lat) < 0.015 && Math.abs(point[2] - lng) < 0.015)) continue;
    list.push([name, Number(lat.toFixed(5)), Number(lng.toFixed(5))]);
    added++;
}
if (geonames) console.log(`GeoNames added ${added} neighbourhoods`);

const today = new Date().toISOString().slice(0, 10);
const lines = Object.entries(points)
    .filter(([, list]) => list.length)
    .map(([city, list]) => `    ${JSON.stringify(city)}: [\n${list.sort((a, b) => a[0].localeCompare(b[0], "fr")).map((point) => `        ${JSON.stringify(point)},`).join("\n")}\n    ],`);
writeFileSync(
    "lib/atlas/area-points.ts",
    `// Written by scripts/atlas/areas.mjs on ${today}: do not edit by hand, run the
// script again. The neighbourhoods known in each city, as a name and a
// position: from OpenStreetMap (© OpenStreetMap contributors, ODbL)${geonames ? " and\n// GeoNames (geonames.org, CC BY 4.0)" : ""}. Atlas gives the nearest one to a place
// that has no neighbourhood (lib/atlas/run.ts).
export const AREA_POINTS: Record<string, [name: string, lat: number, lng: number][]> = {
${lines.join("\n")}
};
`
);
for (const city of cities) console.log(`${city.name}: ${points[city.name].length} neighbourhoods on the map`);
