// Cities NiceThings covers. `slug` is the URL segment (/fr/douala), `name`
// the stored value in nt_spots.city. Centres and radii come from the
// OpenStreetMap import boxes; neighbourhoods are derived from the data.

export type City = {
    slug: string;
    name: string;
    region: { fr: string; en: string };
    lat: number;
    lng: number;
    zoom: number;
    radius: number; // degrees around the centre that belong to the city
    tagline: { fr: string; en: string };
};

export const CITIES: City[] = [
    { slug: "yaounde", name: "Yaoundé", region: { fr: "Centre", en: "Centre" }, lat: 3.8667, lng: 11.5167, zoom: 12.4, radius: 0.13, tagline: { fr: "La capitale aux sept collines", en: "The capital of seven hills" } },
    { slug: "douala", name: "Douala", region: { fr: "Littoral", en: "Littoral" }, lat: 4.0511, lng: 9.74, zoom: 12.2, radius: 0.14, tagline: { fr: "La capitale économique qui ne dort jamais", en: "The economic capital that never sleeps" } },
    { slug: "kribi", name: "Kribi", region: { fr: "Sud", en: "South" }, lat: 2.9406, lng: 9.91, zoom: 13, radius: 0.08, tagline: { fr: "Plages, poisson braisé et chutes de la Lobé", en: "Beaches, grilled fish and the Lobé falls" } },
    { slug: "limbe", name: "Limbé", region: { fr: "Sud-Ouest", en: "South-West" }, lat: 4.0167, lng: 9.2, zoom: 13.2, radius: 0.06, tagline: { fr: "Sable noir au pied du mont Cameroun", en: "Black sand at the foot of Mount Cameroon" } },
    { slug: "buea", name: "Buea", region: { fr: "Sud-Ouest", en: "South-West" }, lat: 4.1527, lng: 9.241, zoom: 13.2, radius: 0.06, tagline: { fr: "Ville étudiante sur les pentes du mont Cameroun", en: "Student town on the slopes of Mount Cameroon" } },
    { slug: "bafoussam", name: "Bafoussam", region: { fr: "Ouest", en: "West" }, lat: 5.4781, lng: 10.4176, zoom: 13, radius: 0.07, tagline: { fr: "Le cœur des hauts plateaux de l'Ouest", en: "The heart of the western highlands" } },
    { slug: "bamenda", name: "Bamenda", region: { fr: "Nord-Ouest", en: "North-West" }, lat: 5.9597, lng: 10.146, zoom: 13, radius: 0.08, tagline: { fr: "Collines verdoyantes du Nord-Ouest", en: "Green hills of the North-West" } },
    { slug: "ngaoundere", name: "Ngaoundéré", region: { fr: "Adamaoua", en: "Adamawa" }, lat: 7.3167, lng: 13.5833, zoom: 13, radius: 0.07, tagline: { fr: "Porte du Nord, entre plateaux et lacs", en: "Gateway to the North, plateaus and lakes" } },
    { slug: "garoua", name: "Garoua", region: { fr: "Nord", en: "North" }, lat: 9.3017, lng: 13.3921, zoom: 13, radius: 0.07, tagline: { fr: "Sur les rives de la Bénoué", en: "On the banks of the Benue" } },
    { slug: "maroua", name: "Maroua", region: { fr: "Extrême-Nord", en: "Far North" }, lat: 10.5956, lng: 14.3247, zoom: 13, radius: 0.07, tagline: { fr: "Artisanat, marchés et paysages du Sahel", en: "Crafts, markets and Sahel landscapes" } },
    { slug: "bertoua", name: "Bertoua", region: { fr: "Est", en: "East" }, lat: 4.5775, lng: 13.6846, zoom: 13, radius: 0.06, tagline: { fr: "La porte de la forêt de l'Est", en: "Gateway to the eastern forest" } },
    { slug: "ebolowa", name: "Ebolowa", region: { fr: "Sud", en: "South" }, lat: 2.9, lng: 11.15, zoom: 13.4, radius: 0.05, tagline: { fr: "Capitale du Sud et de son lac municipal", en: "Capital of the South and its lake" } },
    { slug: "kumba", name: "Kumba", region: { fr: "Sud-Ouest", en: "South-West" }, lat: 4.6363, lng: 9.4469, zoom: 13.4, radius: 0.05, tagline: { fr: "Marchés animés et lac Barombi", en: "Busy markets and Lake Barombi" } },
    { slug: "dschang", name: "Dschang", region: { fr: "Ouest", en: "West" }, lat: 5.45, lng: 10.0667, zoom: 13.4, radius: 0.05, tagline: { fr: "Fraîcheur, université et lac", en: "Cool air, a university and a lake" } },
    { slug: "edea", name: "Édéa", region: { fr: "Littoral", en: "Littoral" }, lat: 3.8, lng: 10.1333, zoom: 13.4, radius: 0.05, tagline: { fr: "Au bord de la Sanaga", en: "On the Sanaga river" } },
    { slug: "nkongsamba", name: "Nkongsamba", region: { fr: "Littoral", en: "Littoral" }, lat: 4.9547, lng: 9.9404, zoom: 13.4, radius: 0.05, tagline: { fr: "Entre montagnes et plantations", en: "Between mountains and plantations" } },
    { slug: "foumban", name: "Foumban", region: { fr: "Ouest", en: "West" }, lat: 5.7267, lng: 10.9003, zoom: 13.6, radius: 0.05, tagline: { fr: "Cité des arts et du palais des sultans", en: "City of arts and the sultans' palace" } },
    { slug: "mbalmayo", name: "Mbalmayo", region: { fr: "Centre", en: "Centre" }, lat: 3.5167, lng: 11.5, zoom: 13.6, radius: 0.04, tagline: { fr: "Sur le Nyong, à deux pas de Yaoundé", en: "On the Nyong, next to Yaoundé" } },
    { slug: "sangmelima", name: "Sangmélima", region: { fr: "Sud", en: "South" }, lat: 2.9333, lng: 11.9833, zoom: 13.6, radius: 0.04, tagline: { fr: "Au cœur de la forêt du Sud", en: "In the heart of the southern forest" } },
    { slug: "tiko", name: "Tiko", region: { fr: "Sud-Ouest", en: "South-West" }, lat: 4.075, lng: 9.36, zoom: 13.6, radius: 0.04, tagline: { fr: "Entre plantations et estuaire", en: "Between plantations and the estuary" } },
];

export const DEFAULT_CITY = CITIES[0];

const BY_SLUG = new Map(CITIES.map((city) => [city.slug, city]));
const BY_NAME = new Map(CITIES.map((city) => [city.name.toLowerCase(), city]));

export function cityBySlug(slug: string | null | undefined) {
    return slug ? BY_SLUG.get(slug) ?? null : null;
}

export function cityByName(name: string | null | undefined) {
    return name ? BY_NAME.get(name.toLowerCase()) ?? null : null;
}

export function cityBounds(city: City): [[number, number], [number, number]] {
    return [
        [city.lng - city.radius, city.lat - city.radius],
        [city.lng + city.radius, city.lat + city.radius],
    ];
}

// The city a coordinate belongs to: generous, so the suburbs count too.
export function cityAt(lat: number, lng: number) {
    const nearest = nearestCity(lat, lng);
    return nearest.distance <= nearest.city.radius * 2.5 ? nearest.city : null;
}

// Closest covered city, however far (to suggest a switch).
export function nearestCity(lat: number, lng: number) {
    let best = { city: CITIES[0], distance: Infinity };
    for (const city of CITIES) {
        const distance = Math.hypot(city.lat - lat, (city.lng - lng) * Math.cos((lat * Math.PI) / 180));
        if (distance < best.distance) best = { city, distance };
    }
    return best;
}

// Cameroon, for the national map on the landing page.
export const CAMEROON_BOUNDS: [[number, number], [number, number]] = [
    [8.4, 1.6],
    [16.2, 13.1],
];
