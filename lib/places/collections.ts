import type { Locale } from "../i18n/config";
import { knownFacts } from "./display";
import type { PlaceSummary } from "./types";

// Editorial collections ("Open late", "For a first date"…). Each one is a
// plain, checkable rule over what we actually know about a place: nothing
// is guessed. A collection only appears, as a home rail or as its own page
// (/fr/yaounde/selection/ouvert-tard), once enough places pass the rule, so
// they switch themselves on as the catalogue fills in.

export const MIN_COLLECTION = 4;

type Text = Record<Locale, string>;

export type Collection = {
    key: string;
    slug: Text;
    name: Text; // rail title: "Ouvert tard"
    title: Text; // page title, {city}
    blurb: Text; // one calm line under the rail title
    intro: Text; // page introduction, {count} and {city}
    test: (place: PlaceSummary) => boolean;
    order?: (a: PlaceSummary, b: PlaceSummary) => number;
};

const minutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + (m || 0);
};

function hoursOf(place: PlaceSummary) {
    const { opens, closes, days } = place.hours;
    if (!opens || !closes || days.length === 0) return null;
    const open = minutes(opens);
    let close = minutes(closes);
    if (close <= open) close += 24 * 60; // 18:00 → 02:00
    const allDay = open === 0 && (close >= 24 * 60 - 1 || closes === "00:00");
    return { open, close, allDay, days };
}

const has = (list: string[], ...values: string[]) => values.some((value) => list.includes(value));
const average = (place: PlaceSummary) => place.priceMin ?? place.priceMax;

export const COLLECTIONS: Collection[] = [
    {
        key: "open-late",
        slug: { fr: "ouvert-tard", en: "open-late" },
        name: { fr: "Ouvert tard", en: "Open late" },
        title: { fr: "Ouvert tard à {city}", en: "Open late in {city}" },
        blurb: {
            fr: "Pour quand la soirée se prolonge : ces adresses ferment à 23 h ou plus tard.",
            en: "For when the evening runs on: these places close at 11 pm or later.",
        },
        intro: {
            fr: "{count} adresses à {city} qui ferment à 23 h ou plus tard, d'après leurs horaires. Les heures peuvent changer : un appel avant de partir ne fait jamais de mal.",
            en: "{count} places in {city} that close at 11 pm or later, according to their opening hours. Hours can change, so a quick call before you go never hurts.",
        },
        test: (place) => {
            const hours = hoursOf(place);
            return Boolean(hours && !hours.allDay && hours.close >= 23 * 60 && place.category !== "Hotel");
        },
        order: (a, b) => (hoursOf(b)?.close ?? 0) - (hoursOf(a)?.close ?? 0),
    },
    {
        key: "early",
        slug: { fr: "ouvert-tot", en: "open-early" },
        name: { fr: "Ouvert tôt", en: "Open early" },
        title: { fr: "Ouvert tôt le matin à {city}", en: "Open early in {city}" },
        blurb: {
            fr: "Un café ou un petit-déjeuner avant la journée : ouvert dès 7 h 30.",
            en: "Coffee or breakfast before the day begins: open by 7:30 am.",
        },
        intro: {
            fr: "{count} adresses à {city} ouvertes dès 7 h 30 ou avant : boulangeries, cafés et tables du matin.",
            en: "{count} places in {city} open by 7:30 am: bakeries, cafés and breakfast tables.",
        },
        test: (place) => {
            const hours = hoursOf(place);
            return Boolean(hours && !hours.allDay && hours.open <= 7 * 60 + 30 && place.category !== "Hotel");
        },
        order: (a, b) => (hoursOf(a)?.open ?? 0) - (hoursOf(b)?.open ?? 0),
    },
    {
        key: "sunday",
        slug: { fr: "ouvert-le-dimanche", en: "open-on-sunday" },
        name: { fr: "Ouvert le dimanche", en: "Open on Sunday" },
        title: { fr: "Ouvert le dimanche à {city}", en: "Open on Sunday in {city}" },
        blurb: { fr: "Le dimanche aussi, d'après leurs horaires.", en: "Sunday too, according to their hours." },
        intro: {
            fr: "{count} restaurants, cafés, bars et boutiques de {city} qui ouvrent le dimanche, d'après leurs horaires.",
            en: "{count} restaurants, cafés, bars and shops in {city} that open on Sundays, according to their hours.",
        },
        test: (place) => {
            const hours = hoursOf(place);
            return Boolean(hours && hours.days.includes("sunday") && place.category !== "Hotel");
        },
    },
    {
        key: "all-day",
        slug: { fr: "ouvert-24h", en: "open-24-hours" },
        name: { fr: "Ouvert 24 h/24", en: "Open 24 hours" },
        title: { fr: "Ouvert 24 h/24 à {city}", en: "Open 24 hours in {city}" },
        blurb: { fr: "Jour et nuit, la porte reste ouverte.", en: "Day and night, the door stays open." },
        intro: {
            fr: "{count} adresses de {city} ouvertes jour et nuit, d'après leurs horaires.",
            en: "{count} places in {city} open day and night, according to their hours.",
        },
        test: (place) => Boolean(hoursOf(place)?.allDay),
    },
    {
        key: "budget",
        slug: { fr: "petit-budget", en: "on-a-budget" },
        name: { fr: "Moins de 5 000 FCFA", en: "Under 5,000 FCFA" },
        title: { fr: "Bonnes adresses à moins de 5 000 FCFA à {city}", en: "Good places under 5,000 FCFA in {city}" },
        blurb: { fr: "Bien manger ou sortir sans trop dépenser.", en: "Eat well or go out without spending much." },
        intro: {
            fr: "{count} adresses de {city} où l'on s'en sort pour moins de 5 000 FCFA par personne, d'après les prix relevés.",
            en: "{count} places in {city} where you can get by on under 5,000 FCFA per person, based on the prices we have.",
        },
        test: (place) => {
            const price = average(place);
            return price !== null && price > 0 && price <= 5000;
        },
        order: (a, b) => (average(a) ?? 0) - (average(b) ?? 0),
    },
    {
        key: "date",
        slug: { fr: "rendez-vous", en: "date-night" },
        name: { fr: "Pour un rendez-vous", en: "For a first date" },
        title: { fr: "Où aller en rendez-vous à {city}", en: "Where to go on a date in {city}" },
        blurb: { fr: "Des adresses où l'on s'entend parler.", en: "Places where you can hear each other talk." },
        intro: {
            fr: "{count} adresses de {city} choisies pour un rendez-vous : une ambiance posée, une table où l'on s'entend parler.",
            en: "{count} places in {city} picked for a date: a relaxed mood and a table where you can hear each other.",
        },
        test: (place) => has(place.goodFor, "date") || has(place.vibes, "romantic"),
    },
    {
        key: "quiet",
        slug: { fr: "au-calme", en: "quiet" },
        name: { fr: "Au calme", en: "Quiet places" },
        title: { fr: "Endroits calmes à {city}", en: "Quiet places in {city}" },
        blurb: { fr: "Pour lire, travailler ou simplement souffler.", en: "To read, work or simply breathe." },
        intro: {
            fr: "{count} adresses calmes à {city}, pour lire, travailler ou prendre le temps.",
            en: "{count} quiet places in {city} to read, work or take your time.",
        },
        test: (place) => has(place.vibes, "calm") || has(place.goodFor, "study"),
    },
    {
        key: "terrace",
        slug: { fr: "en-terrasse", en: "terraces" },
        name: { fr: "En terrasse", en: "Out on the terrace" },
        title: { fr: "Terrasses à {city}", en: "Terraces in {city}" },
        blurb: { fr: "Dehors, à l'air libre.", en: "Outside, in the open air." },
        intro: {
            fr: "{count} adresses de {city} avec une terrasse ou un espace en plein air.",
            en: "{count} places in {city} with a terrace or an open-air space.",
        },
        test: (place) => has(place.amenities, "terrace") || has(place.vibes, "outdoor"),
    },
    {
        key: "wifi",
        slug: { fr: "avec-wifi", en: "with-wifi" },
        name: { fr: "Avec Wi-Fi", en: "With Wi-Fi" },
        title: { fr: "Où travailler avec du Wi-Fi à {city}", en: "Where to work with Wi-Fi in {city}" },
        blurb: { fr: "Pour travailler en dehors du bureau.", en: "To work away from the office." },
        intro: {
            fr: "{count} adresses de {city} avec Wi-Fi, pour travailler ou réviser au calme.",
            en: "{count} places in {city} with Wi-Fi, to work or study in peace.",
        },
        test: (place) => has(place.amenities, "wifi"),
    },
    {
        key: "family",
        slug: { fr: "en-famille", en: "family" },
        name: { fr: "En famille", en: "With the family" },
        title: { fr: "Sorties en famille à {city}", en: "Family outings in {city}" },
        blurb: { fr: "Des lieux où les enfants sont les bienvenus.", en: "Places where children are welcome." },
        intro: {
            fr: "{count} adresses de {city} où l'on vient volontiers avec les enfants.",
            en: "{count} places in {city} where children are welcome.",
        },
        test: (place) => has(place.goodFor, "family"),
    },
    {
        key: "football",
        slug: { fr: "regarder-le-match", en: "watch-football" },
        name: { fr: "Pour regarder le match", en: "To watch the match" },
        title: { fr: "Où regarder le match à {city}", en: "Where to watch football in {city}" },
        blurb: { fr: "Des écrans, une ambiance, des commentaires à voix haute.", en: "Screens, atmosphere and loud commentary." },
        intro: {
            fr: "{count} bars et restaurants de {city} équipés d'écrans pour suivre les matchs.",
            en: "{count} bars and restaurants in {city} with screens to follow the match.",
        },
        test: (place) => has(place.goodFor, "football") || has(place.amenities, "screens"),
    },
];

export function collectionByKey(key: string) {
    return COLLECTIONS.find((collection) => collection.key === key) ?? null;
}

export function collectionBySlug(slug: string) {
    return COLLECTIONS.find((collection) => collection.slug.fr === slug || collection.slug.en === slug) ?? null;
}

// Photos first (they make the page), then the best-known listings, then the
// collection's own order, then the name so the list is stable.
export function rankForEditorial(places: PlaceSummary[], order?: Collection["order"]) {
    return [...places].sort(
        (a, b) =>
            Number(Boolean(b.cover)) - Number(Boolean(a.cover)) ||
            Number(b.verified) - Number(a.verified) ||
            knownFacts(b) - knownFacts(a) ||
            (order ? order(a, b) : 0) ||
            a.name.localeCompare(b.name, "fr")
    );
}

export function placesIn(collection: Collection, places: PlaceSummary[]) {
    return rankForEditorial(places.filter(collection.test), collection.order);
}

// The collections a set of places can honestly fill, with their counts.
export function availableCollections(places: PlaceSummary[], min = MIN_COLLECTION) {
    return COLLECTIONS.map((collection) => ({ collection, count: places.filter(collection.test).length })).filter(
        ({ count }) => count >= min
    );
}
