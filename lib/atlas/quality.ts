import type { SupabaseClient } from "@supabase/supabase-js";
import { selectAll } from "../admin-places";
import { searchLogSince } from "../analytics";
import { cityAt, cityByName } from "../cities";
import { SITE_URL } from "../i18n/config";
import { firstPhone } from "../places/display";
import { distanceMeters } from "../places/geo";
import { nameKey } from "../places/similar";
import type { AtlasIssue, AtlasPlace } from "./store";

// Atlas's quality desk: goes over the platform and writes down what is
// wrong or unfinished, so it can be read back and fixed over time. Every
// check is a plain rule over what is really there: nothing is guessed.

export type Found = Pick<AtlasIssue, "fingerprint" | "area" | "severity" | "title" | "detail" | "evidence">;

type Ref = { id: string; name: string; slug: string | null };
const ref = (place: AtlasPlace): Ref => ({ id: place.id, name: place.name, slug: place.slug });

// Problems that touch many places are reported once per city, with a few
// examples, rather than once per place.
const EXAMPLES = 8;
const MAX_EACH = 60;

function byCity(places: AtlasPlace[]) {
    const groups = new Map<string, AtlasPlace[]>();
    for (const place of places) groups.set(place.city, [...(groups.get(place.city) ?? []), place]);
    return groups;
}

// ---- The catalogue ---------------------------------------------------------

function duplicates(published: AtlasPlace[]): Found[] {
    // Same name once filler words are gone, within 150 m of each other.
    const CELL = 0.0015; // about 165 m
    const cells = new Map<string, AtlasPlace[]>();
    const located = published.filter((place) => place.latitude !== null && place.longitude !== null && nameKey(place.name));
    for (const place of located) {
        const key = `${Math.floor(place.latitude! / CELL)}:${Math.floor(place.longitude! / CELL)}`;
        cells.set(key, [...(cells.get(key) ?? []), place]);
    }
    const found: Found[] = [];
    const seen = new Set<string>();
    for (const place of located) {
        const x = Math.floor(place.latitude! / CELL);
        const y = Math.floor(place.longitude! / CELL);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (const other of cells.get(`${x + dx}:${y + dy}`) ?? []) {
                    if (other.id <= place.id || nameKey(other.name) !== nameKey(place.name)) continue;
                    const meters = Math.round(distanceMeters({ lat: place.latitude!, lng: place.longitude! }, { lat: other.latitude!, lng: other.longitude! }));
                    const pair = `${place.id}:${other.id}`;
                    if (meters > 150 || seen.has(pair)) continue;
                    seen.add(pair);
                    found.push({
                        fingerprint: `duplicate:${pair}`,
                        area: "catalogue",
                        severity: "normal",
                        title: `Doublon probable : « ${place.name} » et « ${other.name} » (${place.city})`,
                        detail: `Même nom, à ${meters} m l'un de l'autre.`,
                        evidence: { code: "duplicate", a: ref(place), b: ref(other), meters, city: place.city },
                    });
                }
            }
        }
    }
    return found.slice(0, MAX_EACH);
}

function outsideCity(published: AtlasPlace[]): Found[] {
    const found: Found[] = [];
    for (const place of published) {
        const city = cityByName(place.city);
        if (!city || place.latitude === null || place.longitude === null) continue;
        const actual = cityAt(place.latitude, place.longitude);
        if (actual?.slug === city.slug) continue;
        const km = Math.round(distanceMeters({ lat: place.latitude, lng: place.longitude }, { lat: city.lat, lng: city.lng }) / 100) / 10;
        found.push({
            fingerprint: `outside-city:${place.id}`,
            area: "catalogue",
            severity: "normal",
            title: `« ${place.name} » est rangé à ${place.city} mais se trouve à ${km} km du centre`,
            detail: actual ? `Sa position est à ${actual.name}.` : "Sa position est hors de toutes les villes couvertes.",
            evidence: { code: "outside-city", place: ref(place), city: place.city, km, actual: actual?.name ?? null },
        });
    }
    return found.slice(0, MAX_EACH);
}

function staleChecks(published: AtlasPlace[], now: number): Found[] {
    return published
        .filter((place) => place.verified && place.last_verified_at)
        .map((place) => ({ place, days: Math.floor((now - new Date(place.last_verified_at!).getTime()) / 86_400_000) }))
        .filter(({ days }) => days > 180)
        .map(({ place, days }) => ({
            fingerprint: `verified-stale:${place.id}`,
            area: "catalogue",
            severity: "normal" as const,
            title: `« ${place.name} » porte la coche bleue mais n'a pas été revérifié depuis ${days} jours`,
            detail: null,
            evidence: { code: "verified-stale", place: ref(place), days },
        }))
        .slice(0, MAX_EACH);
}

function oddPrices(published: AtlasPlace[]): Found[] {
    return published
        .filter((place) => {
            const { minimum_price: min, maximum_price: max } = place;
            return (min !== null && max !== null && min > max) || [min, max].some((value) => value !== null && (value < 100 || value > 500_000));
        })
        .map((place) => ({
            fingerprint: `price-odd:${place.id}`,
            area: "catalogue",
            severity: "normal" as const,
            title: `Prix à revoir pour « ${place.name} » : ${place.minimum_price ?? "?"} – ${place.maximum_price ?? "?"} FCFA`,
            detail: null,
            evidence: { code: "price-odd", place: ref(place), min: place.minimum_price, max: place.maximum_price },
        }))
        .slice(0, MAX_EACH);
}

// One line per city for what is missing or malformed on many places.
function perCity(published: AtlasPlace[], code: string, severity: Found["severity"], test: (place: AtlasPlace) => boolean, title: (count: number, city: string) => string): Found[] {
    const found: Found[] = [];
    for (const [city, places] of byCity(published)) {
        const hits = places.filter(test);
        if (!hits.length) continue;
        found.push({
            fingerprint: `${code}:${city}`,
            area: "catalogue",
            severity,
            title: title(hits.length, city),
            detail: null,
            evidence: { code, city, count: hits.length, total: places.length, examples: hits.slice(0, EXAMPLES).map(ref) },
        });
    }
    return found;
}

// Places without a neighbourhood. Where a city has neighbourhoods, the
// places missing one are listed for that city; cities that have none at all
// are one finding together (the importer only knows Yaoundé's and a few
// others' neighbourhoods).
function neighbourhoods(published: AtlasPlace[]): Found[] {
    const found: Found[] = [];
    const bare: { city: string; count: number }[] = [];
    for (const [city, places] of byCity(published)) {
        const missing = places.filter((place) => !place.neighborhood);
        if (!missing.length) continue;
        if (missing.length > places.length * 0.7) {
            bare.push({ city, count: places.length });
            continue;
        }
        found.push({
            fingerprint: `no-neighbourhood:${city}`,
            area: "catalogue",
            severity: "minor",
            title: `${city} : ${missing.length} lieu(x) publié(s) sans quartier`,
            detail: null,
            evidence: { code: "no-neighbourhood", city, count: missing.length, total: places.length, examples: missing.slice(0, EXAMPLES).map(ref) },
        });
    }
    if (bare.length) {
        bare.sort((a, b) => b.count - a.count);
        found.push({
            fingerprint: "cities-without-areas",
            area: "catalogue",
            severity: "normal",
            title: `${bare.length} villes n'ont presque aucun quartier renseigné`,
            detail: `${bare.map((item) => `${item.city} (${item.count})`).join(", ")}. On ne peut pas y chercher ni explorer par quartier.`,
            evidence: { code: "cities-without-areas", count: bare.length, cities: bare },
        });
    }
    return found;
}

// Map entries nobody has touched for years: the listings most likely to
// describe a place that has closed or moved. `edited` comes from the map
// check (lib/atlas/osm.ts).
function agedSources(published: AtlasPlace[], edited: Map<string, string>, now: number): Found[] {
    const OLD_YEARS = 7;
    const cutoff = new Date(now - OLD_YEARS * 365.25 * 86_400_000).toISOString();
    const found: Found[] = [];
    for (const [city, places] of byCity(published)) {
        const old = places
            .filter((place) => !place.verified && (edited.get(place.id) ?? "9") < cutoff)
            .sort((a, b) => (edited.get(a.id) ?? "").localeCompare(edited.get(b.id) ?? ""));
        if (old.length < 5) continue;
        found.push({
            fingerprint: `aged-source:${city}`,
            area: "catalogue",
            severity: "normal",
            title: `${city} : ${old.length} fiches reposent sur une entrée de carte inchangée depuis plus de ${OLD_YEARS} ans`,
            detail: "Ce sont les lieux à faire vérifier en premier : les plus susceptibles d'avoir fermé ou déménagé.",
            evidence: { code: "aged-source", city, count: old.length, total: places.length, years: OLD_YEARS, examples: old.slice(0, EXAMPLES).map((place) => ({ ...ref(place), since: edited.get(place.id)?.slice(0, 4) })) },
        });
    }
    return found;
}

// ---- Articles --------------------------------------------------------------

const ENGLISH = new Set(["the", "and", "you", "your", "with", "for", "that", "this", "are", "is", "of", "to", "in", "it", "have", "what", "where", "from", "not", "there"]);
const FRENCH = new Set(["le", "la", "les", "des", "et", "vous", "votre", "avec", "pour", "que", "qui", "est", "une", "un", "du", "dans", "sur", "pas", "ce", "au"]);

type PostRow = { id: string; slug: string; status: string; title_fr: string; title_en: string | null; excerpt_fr: string | null; body_fr: unknown; cover_url: string | null; places: string[] | null };

function articles(posts: PostRow[], publishedSlugs: Set<string>): Found[] {
    const found: Found[] = [];
    for (const post of posts.filter((item) => item.status === "PUBLISHED")) {
        const post_ = { id: post.id, slug: post.slug, title: post.title_fr };
        const words = `${post.title_fr} ${post.excerpt_fr ?? ""} ${JSON.stringify(post.body_fr ?? "")}`.toLowerCase().match(/[a-zà-ÿ]+/g) ?? [];
        const english = words.filter((word) => ENGLISH.has(word)).length;
        const french = words.filter((word) => FRENCH.has(word)).length;
        if (english >= 12 && english > french * 2) {
            found.push({
                fingerprint: `article-language:${post.id}`,
                area: "content",
                severity: "normal",
                title: `L'article « ${post.title_fr} » est en anglais dans les champs français`,
                detail: "Les lecteurs francophones et Google le reçoivent comme une page française écrite en anglais. Il faut une version française, et l'anglais dans les champs anglais.",
                evidence: { code: "article-language", post: post_, english, french },
            });
        }
        if (!post.cover_url) {
            found.push({ fingerprint: `article-no-cover:${post.id}`, area: "content", severity: "minor", title: `L'article « ${post.title_fr} » n'a pas d'image de couverture`, detail: null, evidence: { code: "article-no-cover", post: post_ } });
        }
        const missing = (post.places ?? []).filter((slug) => !publishedSlugs.has(slug));
        if (missing.length) {
            found.push({
                fingerprint: `article-missing-place:${post.id}`,
                area: "content",
                severity: "normal",
                title: `L'article « ${post.title_fr} » cite ${missing.length} lieu(x) qui ne sont plus en ligne`,
                detail: missing.join(", "),
                evidence: { code: "article-missing-place", post: post_, slugs: missing },
            });
        }
    }
    return found;
}

// ---- Search ----------------------------------------------------------------

async function emptySearches(db: SupabaseClient, now: number): Promise<Found[]> {
    const since = searchLogSince(new Date(now - 30 * 86_400_000).toISOString());
    const rows = await selectAll<{ query: string | null; filters: { city?: string } | null }>((from, to) =>
        db.from("nt_searches").select("query,filters").eq("result_count", 0).gte("created_at", since).range(from, to)
    );
    const groups = new Map<string, { times: number; cities: Set<string> }>();
    for (const row of rows) {
        const query = (row.query ?? "").trim().toLowerCase().replace(/\s+/g, " ");
        if (!query) continue;
        const group = groups.get(query) ?? { times: 0, cities: new Set<string>() };
        group.times++;
        if (row.filters?.city) group.cities.add(row.filters.city);
        groups.set(query, group);
    }
    return [...groups.entries()]
        .filter(([, group]) => group.times >= 2)
        .sort((a, b) => b[1].times - a[1].times)
        .slice(0, 12)
        .map(([query, group]) => ({
            fingerprint: `search-no-result:${query}`,
            area: "search",
            severity: "normal" as const,
            title: `« ${query} » a été cherché ${group.times} fois sans rien trouver`,
            detail: "Un lieu ou un type de lieu que les gens attendent et que NiceThings n'a pas.",
            evidence: { code: "search-no-result", query, times: group.times, cities: [...group.cities] },
        }));
}

// ---- The site itself -------------------------------------------------------

const PAGES = ["/fr", "/en", "/fr/yaounde", "/fr/blog", "/fr/a-propos", "/sitemap.xml", "/robots.txt"];

async function pages(): Promise<Found[]> {
    const results = await Promise.all(
        PAGES.map(async (path) => {
            try {
                const response = await fetch(`${SITE_URL}${path}`, { signal: AbortSignal.timeout(12_000), cache: "no-store", headers: { "User-Agent": "NiceThings-Atlas/1.0 (uptime check)" } });
                return { path, status: response.status };
            } catch {
                return { path, status: 0 };
            }
        })
    );
    return results
        .filter((result) => result.status !== 200)
        .map((result) => ({
            fingerprint: `page-down:${result.path}`,
            area: "pages",
            severity: "serious" as const,
            title: `La page ${result.path} ne répond pas correctement`,
            detail: result.status ? `Réponse du serveur : ${result.status}.` : "Aucune réponse en 12 secondes.",
            evidence: { code: "page-down", path: result.path, status: result.status },
        }));
}

export async function qualityChecks(db: SupabaseClient, places: AtlasPlace[], edited: Map<string, string>): Promise<Found[]> {
    const now = Date.now();
    const published = places.filter((place) => place.status === "APPROVED");
    const publishedSlugs = new Set(published.map((place) => place.slug).filter((slug): slug is string => Boolean(slug)));
    const hoursKnown = (place: AtlasPlace) => Boolean(place.opening_time || place.closing_time);

    const [posts, searches, down] = await Promise.all([
        selectAll<PostRow>((from, to) => db.from("nt_posts").select("id,slug,status,title_fr,title_en,excerpt_fr,body_fr,cover_url,places").range(from, to)).catch(() => []),
        emptySearches(db, now).catch(() => []),
        pages(),
    ]);

    return [
        ...down,
        ...duplicates(published),
        ...outsideCity(published),
        ...staleChecks(published, now),
        ...oddPrices(published),
        ...agedSources(published, edited, now),
        ...perCity(
            published,
            "phone-unreadable",
            "minor",
            (place) => Boolean(place.phone) && !firstPhone(place.phone),
            (count, city) => `${city} : ${count} numéro(s) de téléphone illisible(s) (le bouton Appeler ne s'affiche pas)`
        ),
        ...perCity(
            published,
            "hours-half",
            "minor",
            (place) => hoursKnown(place) && !(place.opening_time && place.closing_time),
            (count, city) => `${city} : ${count} fiche(s) avec une heure d'ouverture sans heure de fermeture, ou l'inverse`
        ),
        ...neighbourhoods(published),
        ...articles(posts, publishedSlugs),
        ...searches,
    ];
}
