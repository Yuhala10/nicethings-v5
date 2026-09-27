// Imports named places in Cameroon's cities from OpenStreetMap.
//
//   node scripts/import-osm.mjs                  # fetch every city and upsert
//   node scripts/import-osm.mjs douala kribi     # only these cities
//   node scripts/import-osm.mjs --dry-run        # print what would change
//   node scripts/import-osm.mjs --cache file.json  # reuse a previous download
//
// Safe to re-run: rows are matched on (source='osm', source_ref), and only
// the OSM-owned fields of rows still in DRAFT are refreshed, so work done in
// the admin (prices, tags, photos, publishing) is never overwritten.
// New places with a real name are published straight away and labelled
// "Source : OpenStreetMap" on the site; generic names stay in DRAFT.
// Map data © OpenStreetMap contributors, ODbL.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const cacheIndex = args.indexOf("--cache");
const CACHE = cacheIndex >= 0 ? args[cacheIndex + 1] : null;
const ONLY = args.filter((arg, index) => !arg.startsWith("--") && !(cacheIndex >= 0 && index === cacheIndex + 1));

// Kept in sync with lib/cities.ts: [slug, name, lat, lng, radius in degrees].
const CITIES = [
    ["yaounde", "Yaoundé", 3.8667, 11.5167, 0.13],
    ["douala", "Douala", 4.0511, 9.74, 0.14],
    ["kribi", "Kribi", 2.9406, 9.91, 0.08],
    ["limbe", "Limbé", 4.0167, 9.2, 0.06],
    ["buea", "Buea", 4.1527, 9.241, 0.06],
    ["bafoussam", "Bafoussam", 5.4781, 10.4176, 0.07],
    ["bamenda", "Bamenda", 5.9597, 10.146, 0.08],
    ["ngaoundere", "Ngaoundéré", 7.3167, 13.5833, 0.07],
    ["garoua", "Garoua", 9.3017, 13.3921, 0.07],
    ["maroua", "Maroua", 10.5956, 14.3247, 0.07],
    ["bertoua", "Bertoua", 4.5775, 13.6846, 0.06],
    ["ebolowa", "Ebolowa", 2.9, 11.15, 0.05],
    ["kumba", "Kumba", 4.6363, 9.4469, 0.05],
    ["dschang", "Dschang", 5.45, 10.0667, 0.05],
    ["edea", "Édéa", 3.8, 10.1333, 0.05],
    ["nkongsamba", "Nkongsamba", 4.9547, 9.9404, 0.05],
    ["foumban", "Foumban", 5.7267, 10.9003, 0.05],
    ["mbalmayo", "Mbalmayo", 3.5167, 11.5, 0.04],
    ["sangmelima", "Sangmélima", 2.9333, 11.9833, 0.04],
    ["tiko", "Tiko", 4.075, 9.36, 0.04],
];

// Yaoundé's neighbourhoods are hand-placed (OSM has few there); other
// cities use OSM's own suburb / quarter / neighbourhood points.
const YAOUNDE_NEIGHBORHOODS = [
    ["Bastos", 3.8913, 11.5095], ["Centre-ville", 3.8667, 11.5167],
    ["Nlongkak", 3.88, 11.518], ["Omnisport", 3.884, 11.542],
    ["Essos", 3.87, 11.538], ["Mvan", 3.83, 11.516],
    ["Biyem-Assi", 3.835, 11.485], ["Mendong", 3.825, 11.472],
    ["Etoudi", 3.912, 11.525], ["Nkolbisson", 3.87, 11.45],
    ["Mimboman", 3.862, 11.555], ["Emana", 3.92, 11.512],
    ["Elig-Essono", 3.878, 11.527], ["Mokolo", 3.872, 11.5],
    ["Ngousso", 3.895, 11.55], ["Santa Barbara", 3.9, 11.5],
];

const CATEGORY_BY_TAG = {
    "amenity=restaurant": "Restaurant",
    "amenity=fast_food": "Restaurant",
    "amenity=cafe": "Cafe",
    "amenity=ice_cream": "Cafe",
    "amenity=bar": "Bar",
    "amenity=pub": "Bar",
    "amenity=nightclub": "Club",
    "amenity=cinema": "Entertainment",
    "amenity=theatre": "Culture",
    "amenity=arts_centre": "Culture",
    "tourism=hotel": "Hotel",
    "tourism=guest_house": "Hotel",
    "tourism=motel": "Hotel",
    "tourism=attraction": "Culture",
    "tourism=museum": "Culture",
    "tourism=gallery": "Culture",
    "tourism=zoo": "Nature",
    "tourism=viewpoint": "Nature",
    "leisure=park": "Nature",
    "leisure=garden": "Nature",
    "leisure=beach_resort": "Nature",
    "leisure=water_park": "Entertainment",
    "leisure=sports_centre": "Wellness",
    "leisure=fitness_centre": "Wellness",
    "leisure=swimming_pool": "Wellness",
    "natural=beach": "Nature",
    "natural=waterfall": "Nature",
    "shop=mall": "Shopping",
    "shop=supermarket": "Shopping",
    "shop=bakery": "Bakery",
    "shop=pastry": "Bakery",
};

// Names that describe a kind of place rather than one place.
const GENERIC_NAMES = new Set(
    [
        "cafeteria", "cafetaria", "cafe", "restaurant", "resto", "bar", "snack", "snack bar", "hotel", "auberge",
        "boulangerie", "patisserie", "boutique", "magasin", "salon", "coiffure", "salon de coiffure", "gym", "parc",
        "jardin", "cabaret", "maquis", "chambre", "chambres", "fast food", "vietnamese", "chinese", "french", "african",
        "pizza", "bakery", "shop", "store", "supermarche", "supermarket", "pharmacie", "bar restaurant", "restaurant bar",
        "night club", "nightclub", "club", "lounge", "buvette", "kiosque", "espace vert", "bar dancing", "cafe bar",
        "guest house", "motel", "plage", "beach", "piscine", "swimming pool", "stade", "hotel restaurant",
    ].map((name) => name.trim())
);

const placesQuery = (s, w, n, e) => `[out:json][timeout:120][bbox:${s},${w},${n},${e}];(
nwr["amenity"~"^(restaurant|cafe|bar|fast_food|pub|nightclub|ice_cream|cinema|theatre|arts_centre)$"]["name"];
nwr["tourism"~"^(hotel|guest_house|motel|attraction|museum|gallery|viewpoint|zoo)$"]["name"];
nwr["leisure"~"^(park|sports_centre|fitness_centre|swimming_pool|garden|beach_resort|water_park)$"]["name"];
nwr["natural"~"^(beach|waterfall)$"]["name"];
nwr["shop"~"^(mall|bakery|pastry|supermarket)$"]["name"];
);out tags center;`;

const suburbsQuery = (s, w, n, e) =>
    `[out:json][timeout:60][bbox:${s},${w},${n},${e}];node["place"~"^(suburb|quarter|neighbourhood)$"]["name"];out;`;

const OVERPASS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
];

async function overpass(query) {
    for (const host of OVERPASS) {
        try {
            const response = await fetch(host, {
                method: "POST",
                body: "data=" + encodeURIComponent(query),
                headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "NiceThings/1.0 (nicethings.site)" },
            });
            if (response.ok) return (await response.json()).elements;
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    return null;
}

function loadEnv() {
    const env = {};
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (match) env[match[1]] = match[2].trim().replace(/^"|"$/g, "");
    }
    return env;
}

function distanceKm(lat1, lng1, lat2, lng2) {
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLng = (lng2 - lng1) * rad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function nearest(points, lat, lng, maxKm) {
    let best = null;
    for (const [name, pLat, pLng] of points) {
        const d = distanceKm(lat, lng, pLat, pLng);
        if (!best || d < best.d) best = { name, d };
    }
    return best && best.d <= maxKm ? best.name : null;
}

function normalize(value) {
    return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function slugify(value) {
    return normalize(value.replace(/&/g, " et ")).replace(/ /g, "-").slice(0, 80);
}

function isGoodName(name) {
    const n = normalize(name);
    return n.replace(/[^a-z]/g, "").length >= 3 && !GENERIC_NAMES.has(n) && !/^\d+$/.test(n);
}

function categoryFor(tags) {
    for (const key of ["amenity", "tourism", "leisure", "natural", "shop"]) {
        const category = CATEGORY_BY_TAG[`${key}=${tags[key]}`];
        if (category) return category;
    }
    return "Other";
}

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const OSM_DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// The common simple forms ("Mo-Su 08:00-22:00", "24/7"); anything more
// complex is left for a human in the admin.
function parseOpeningHours(value) {
    if (!value) return null;
    if (value.trim() === "24/7") return { opening_time: "00:00", closing_time: "23:59", days: DAY_KEYS };
    const match = value.trim().match(/^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
    if (!match) return null;
    const start = OSM_DAYS.indexOf(match[1]);
    const end = match[2] ? OSM_DAYS.indexOf(match[2]) : start;
    const days = [];
    for (let i = start; ; i = (i + 1) % 7) {
        days.push(DAY_KEYS[i]);
        if (i === end) break;
    }
    return { opening_time: match[3], closing_time: match[4], days };
}

function toSpot(element, city, neighborhoods, usedSlugs) {
    const tags = element.tags ?? {};
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    if (!tags.name || lat == null || lng == null) return null;

    const [slugKey, cityName] = city;
    const neighborhood = nearest(neighborhoods, lat, lng, slugKey === "yaounde" ? 2.5 : 1.6);
    const parts = [tags.name, neighborhood, slugKey === "yaounde" ? null : cityName].filter(Boolean);
    const base = slugify(parts.join(" ")) || "lieu";
    let slug = base;
    for (let n = 2; usedSlugs.has(slug); n++) slug = `${base}-${n}`;
    usedSlugs.add(slug);

    const hours = parseOpeningHours(tags.opening_hours);
    const website = tags.website || tags["contact:website"] || null;
    const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ") || null;
    // Yaoundé keeps its original rule (a neighbourhood is required); in the
    // other cities the city itself is a precise enough location.
    const publish = isGoodName(tags.name) && (neighborhood !== null || slugKey !== "yaounde");

    return {
        slug,
        name: tags.name.trim().slice(0, 120),
        category: categoryFor(tags),
        cuisine: tags.cuisine ?? null,
        city: cityName,
        neighborhood,
        address: street,
        latitude: lat,
        longitude: lng,
        phone: tags.phone || tags["contact:phone"] || null,
        website,
        opening_time: hours?.opening_time ?? null,
        closing_time: hours?.closing_time ?? null,
        // Every row carries the same columns (bulk inserts need that);
        // without known hours, days default to open like the table does.
        ...Object.fromEntries(DAY_KEYS.map((day) => [`${day}_open`, hours ? hours.days.includes(day) : true])),
        source: "osm",
        source_ref: `${element.type}/${element.id}`,
        status: publish ? "APPROVED" : "DRAFT",
    };
}

async function main() {
    const env = loadEnv();
    const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const cache = CACHE && existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
    const selected = CITIES.filter(([slug]) => !ONLY.length || ONLY.includes(slug));

    // Existing rows: never duplicate, never overwrite admin work.
    const existing = [];
    for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from("nt_spots").select("slug,source,source_ref,status").range(from, from + 999);
        if (error) throw error;
        existing.push(...data);
        if (data.length < 1000) break;
    }
    const usedSlugs = new Set(existing.map((row) => row.slug));
    const bySourceRef = new Map(existing.filter((row) => row.source === "osm").map((row) => [row.source_ref, row]));

    let inserted = 0;
    let refreshed = 0;
    for (const city of selected) {
        const [slug, name, lat, lng, radius] = city;
        const box = [lat - radius, lng - radius, lat + radius, lng + radius].map((value) => value.toFixed(4));
        let data = cache[slug];
        if (!data) {
            const places = await overpass(placesQuery(...box));
            const suburbs = await overpass(suburbsQuery(...box));
            if (!places) {
                console.log(`${name}: Overpass unavailable, skipped`);
                continue;
            }
            data = { places, suburbs: suburbs ?? [] };
            cache[slug] = data;
            if (CACHE) writeFileSync(CACHE, JSON.stringify(cache));
        }

        const neighborhoods =
            slug === "yaounde"
                ? YAOUNDE_NEIGHBORHOODS
                : data.suburbs.filter((node) => node.tags?.name).map((node) => [node.tags.name.trim(), node.lat, node.lon]);

        const rows = data.places.map((element) => toSpot(element, city, neighborhoods, usedSlugs)).filter(Boolean);
        const inserts = rows.filter((row) => !bySourceRef.has(row.source_ref));
        // A place inside two city boxes is only ever inserted once.
        for (const row of inserts) bySourceRef.set(row.source_ref, row);
        const updates = rows.filter((row) => bySourceRef.get(row.source_ref)?.status === "DRAFT");
        console.log(`${name}: ${rows.length} places · ${inserts.length} new (${inserts.filter((r) => r.status === "APPROVED").length} published) · ${updates.length} drafts refreshed`);
        if (DRY_RUN) continue;

        for (let i = 0; i < inserts.length; i += 200) {
            const { error } = await db.from("nt_spots").insert(inserts.slice(i, i + 200));
            if (error) throw error;
        }
        for (const row of updates) {
            const { slug: _slug, status: _status, ...fields } = row;
            const { error } = await db.from("nt_spots").update(fields).eq("source", "osm").eq("source_ref", row.source_ref);
            if (error) throw error;
        }
        inserted += inserts.length;
        refreshed += updates.length;
    }
    console.log(DRY_RUN ? "Dry run: nothing written." : `Done: ${inserted} inserted, ${refreshed} refreshed.`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
