// Imports named places in Yaoundé from OpenStreetMap as DRAFT spots.
//
//   node scripts/import-osm.mjs            # fetch from Overpass and upsert
//   node scripts/import-osm.mjs --dry-run  # print what would be imported
//
// Safe to re-run: rows are matched on (source='osm', source_ref), and only
// the OSM-owned fields of rows that are still DRAFT are refreshed, so work
// done in the admin (prices, tags, photos, publishing) is never overwritten.
// Map data © OpenStreetMap contributors, ODbL.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");
const BBOX = "3.76,11.42,3.98,11.60"; // south,west,north,east around Yaoundé

// Kept in sync with YAOUNDE_NEIGHBORHOODS in lib/tags/index.ts.
const NEIGHBORHOODS = [
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
    "tourism=attraction": "Culture",
    "tourism=museum": "Culture",
    "tourism=gallery": "Culture",
    "tourism=viewpoint": "Nature",
    "leisure=park": "Nature",
    "leisure=garden": "Nature",
    "leisure=sports_centre": "Wellness",
    "leisure=fitness_centre": "Wellness",
    "leisure=swimming_pool": "Wellness",
    "shop=mall": "Shopping",
    "shop=supermarket": "Shopping",
    "shop=bakery": "Bakery",
    "shop=pastry": "Bakery",
};

const QUERY = `[out:json][timeout:120][bbox:${BBOX}];(
nwr["amenity"~"^(restaurant|cafe|bar|fast_food|pub|nightclub|ice_cream|cinema|theatre|arts_centre)$"]["name"];
nwr["tourism"~"^(hotel|guest_house|attraction|museum|gallery|viewpoint)$"]["name"];
nwr["leisure"~"^(park|sports_centre|fitness_centre|swimming_pool|garden)$"]["name"];
nwr["shop"~"^(mall|bakery|pastry|supermarket)$"]["name"];
);out tags center;`;

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
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(a));
}

// Nearest known neighbourhood centre, if it is plausibly the same area.
function nearestNeighborhood(lat, lng) {
    let best = null;
    for (const [name, nLat, nLng] of NEIGHBORHOODS) {
        const d = distanceKm(lat, lng, nLat, nLng);
        if (!best || d < best.d) best = { name, d };
    }
    return best && best.d <= 2.5 ? best.name : null;
}

function slugify(value) {
    return value
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/&/g, " et ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 70);
}

function categoryFor(tags) {
    for (const key of ["amenity", "tourism", "leisure", "shop"]) {
        const category = CATEGORY_BY_TAG[`${key}=${tags[key]}`];
        if (category) return category;
    }
    return "Other";
}

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const OSM_DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// Understands the common simple forms ("Mo-Su 08:00-22:00", "Mo-Fr 07:30-18:00",
// "24/7"). Anything more complex is left for a human to enter in the admin.
function parseOpeningHours(value) {
    if (!value) return null;
    if (value.trim() === "24/7") {
        return { opening_time: "00:00", closing_time: "23:59", days: DAY_KEYS };
    }

    const match = value
        .trim()
        .match(/^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
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

function toSpot(element, usedSlugs) {
    const tags = element.tags ?? {};
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    if (!tags.name || lat == null || lng == null) return null;

    const neighborhood = nearestNeighborhood(lat, lng);
    const base = slugify([tags.name, neighborhood].filter(Boolean).join(" ")) || "lieu";
    let slug = base;
    for (let n = 2; usedSlugs.has(slug); n++) slug = `${base}-${n}`;
    usedSlugs.add(slug);

    const phone = tags.phone || tags["contact:phone"] || null;
    const hours = parseOpeningHours(tags.opening_hours);

    const spot = {
        source: "osm",
        source_ref: `${element.type}/${element.id}`,
        status: "DRAFT",
        name: tags.name.trim(),
        slug,
        category: categoryFor(tags),
        cuisine: tags.cuisine ? tags.cuisine.replace(/_/g, " ").replace(/;/g, ", ") : null,
        city: "Yaoundé",
        neighborhood,
        address: [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ") || null,
        latitude: lat,
        longitude: lng,
        phone,
        whatsapp: tags["contact:whatsapp"] || null,
        website: tags.website || tags["contact:website"] || null,
        instagram: tags["contact:instagram"] || null,
    };

    // Every row carries the same keys: bulk inserts send missing keys as
    // NULL, which the NOT NULL day columns would reject.
    spot.opening_time = hours?.opening_time ?? null;
    spot.closing_time = hours?.closing_time ?? null;
    for (const day of DAY_KEYS) spot[`${day}_open`] = hours ? hours.days.includes(day) : true;

    return spot;
}

// Public Overpass servers are often busy; try each mirror in turn.
const OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
];

async function fetchOverpass() {
    for (const url of OVERPASS_MIRRORS) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "User-Agent": "NiceThings/1.0 (https://nicethings.site)",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: "data=" + encodeURIComponent(QUERY),
                signal: AbortSignal.timeout(180000),
            });
            if (response.ok) return (await response.json()).elements;
            console.warn(`  ${new URL(url).host} responded ${response.status}, trying next…`);
        } catch (error) {
            console.warn(`  ${new URL(url).host} failed (${error.message}), trying next…`);
        }
    }
    throw new Error("All Overpass servers failed. Try again in a few minutes.");
}

async function main() {
    const env = loadEnv();
    const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
    });

    console.log("Fetching places from OpenStreetMap…");
    const elements = await fetchOverpass();

    // Existing rows decide which slugs are taken and which OSM rows are
    // already curated (anything past DRAFT is left untouched).
    const existing = [];
    for (let from = 0; ; from += 1000) {
        const { data, error } = await db
            .from("nt_spots")
            .select("slug,source,source_ref,status")
            .range(from, from + 999);
        if (error) throw error;
        existing.push(...data);
        if (data.length < 1000) break;
    }

    const bySourceRef = new Map(
        existing.filter((row) => row.source === "osm").map((row) => [row.source_ref, row])
    );
    const usedSlugs = new Set(
        existing.filter((row) => row.source !== "osm" || row.status !== "DRAFT").map((row) => row.slug)
    );

    const rows = [];
    let skippedCurated = 0;
    for (const element of elements) {
        const ref = `${element.type}/${element.id}`;
        const current = bySourceRef.get(ref);
        if (current && current.status !== "DRAFT") {
            skippedCurated++;
            continue;
        }
        const spot = toSpot(element, usedSlugs);
        if (spot) rows.push(spot);
    }

    const byCategory = rows.reduce((acc, row) => ({ ...acc, [row.category]: (acc[row.category] ?? 0) + 1 }), {});
    console.log(`${rows.length} drafts to upsert, ${skippedCurated} already curated (left alone).`);
    console.log(byCategory);

    if (DRY_RUN) {
        console.log(rows.slice(0, 3));
        return;
    }

    // The (source, source_ref) index is partial, which PostgREST upserts
    // cannot target, so new rows are inserted and existing drafts updated.
    const inserts = rows.filter((row) => !bySourceRef.has(row.source_ref));
    const updates = rows.filter((row) => bySourceRef.has(row.source_ref));

    for (let i = 0; i < inserts.length; i += 200) {
        const { error } = await db.from("nt_spots").insert(inserts.slice(i, i + 200));
        if (error) throw error;
        process.stdout.write(`\r  inserted ${Math.min(i + 200, inserts.length)}/${inserts.length}`);
    }

    for (const [index, row] of updates.entries()) {
        const { slug: _slug, status: _status, ...fields } = row;
        const { error } = await db
            .from("nt_spots")
            .update(fields)
            .eq("source", "osm")
            .eq("source_ref", row.source_ref)
            .eq("status", "DRAFT");
        if (error) throw error;
        process.stdout.write(`\r  refreshed ${index + 1}/${updates.length}`);
    }

    console.log("\nDone. Review the drafts in /admin/spots.");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
