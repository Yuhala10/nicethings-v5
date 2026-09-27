import {
    BedDouble,
    Coffee,
    Croissant,
    Dumbbell,
    Landmark,
    MapPin,
    Music,
    Scissors,
    ShoppingBag,
    Ticket,
    Trees,
    UtensilsCrossed,
    Wine,
    type LucideIcon,
} from "lucide-react";

// Visual identity per category. Almost no place has a photo yet, so the
// tone + line icon *is* the image: calm tints, never loud gradients.
// `tone` is the ink colour; the tint is mixed from it in CSS so dark mode
// gets a deep version automatically.

export type CategoryStyle = { icon: LucideIcon; tone: string };

export const CATEGORY_STYLE: Record<string, CategoryStyle> = {
    Restaurant: { icon: UtensilsCrossed, tone: "#c2410c" },
    Cafe: { icon: Coffee, tone: "#92400e" },
    Bar: { icon: Wine, tone: "#9d174d" },
    Club: { icon: Music, tone: "#6d28d9" },
    Hotel: { icon: BedDouble, tone: "#1d4ed8" },
    Bakery: { icon: Croissant, tone: "#b45309" },
    Shopping: { icon: ShoppingBag, tone: "#7e22ce" },
    Beauty: { icon: Scissors, tone: "#be123c" },
    Wellness: { icon: Dumbbell, tone: "#15803d" },
    Entertainment: { icon: Ticket, tone: "#0e7490" },
    Culture: { icon: Landmark, tone: "#a16207" },
    Nature: { icon: Trees, tone: "#166534" },
    Other: { icon: MapPin, tone: "#57534e" },
};

export function categoryStyle(category: string) {
    return CATEGORY_STYLE[category] ?? CATEGORY_STYLE.Other;
}

// schema.org type for structured data, so Google knows what each place is.
export const SCHEMA_TYPES: Record<string, string> = {
    Restaurant: "Restaurant",
    Cafe: "CafeOrCoffeeShop",
    Bar: "BarOrPub",
    Club: "NightClub",
    Hotel: "Hotel",
    Bakery: "Bakery",
    Shopping: "Store",
    Beauty: "BeautySalon",
    Wellness: "HealthClub",
    Entertainment: "EntertainmentBusiness",
    Culture: "TouristAttraction",
    Nature: "Park",
    Other: "LocalBusiness",
};

// First phone number of a free-text field ("+237 6 79 82 36 92; +2379…"),
// as a dialable string, or null.
export function firstPhone(value: string | null) {
    if (!value) return null;
    const first = value.split(/[;,/]| ou | or /)[0];
    const digits = first.replace(/[^\d+]/g, "");
    if (digits.replace(/\D/g, "").length < 8) return null;
    if (digits.startsWith("+")) return digits;
    if (digits.startsWith("00")) return `+${digits.slice(2)}`;
    if (digits.startsWith("237")) return `+${digits}`;
    return digits.length === 9 ? `+237${digits}` : digits;
}

// "+237679823692" → "+237 6 79 82 36 92" (how numbers are written locally).
export function formatPhone(dialable: string) {
    const match = dialable.match(/^\+237(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/);
    return match ? `+237 ${match.slice(1).join(" ")}` : dialable;
}

// How much NiceThings actually knows about a place, 0..1. Used to rank
// richer listings first and to keep very thin pages out of Google.
export function knownFacts(place: {
    cover: string | null;
    priceMin: number | null;
    hours: { opens: string | null };
    cuisine: string | null;
    verified: boolean;
    vibes: string[];
    phone?: string | null;
    address?: string | null;
    website?: string | null;
    description?: string | null;
}) {
    return [
        place.cover,
        place.priceMin,
        place.hours.opens,
        place.cuisine,
        place.verified,
        place.vibes.length,
        place.phone,
        place.address,
        place.website,
        place.description,
    ].filter(Boolean).length;
}

// Thin listings (a name and a pin) stay out of Google until we know more;
// neighbourhood and category guides carry them meanwhile. Uses summary
// fields only, so the sitemap and the page itself always agree.
export function isIndexable(place: Parameters<typeof knownFacts>[0] & { verified: boolean }) {
    const { cover, priceMin, hours, cuisine, verified, vibes } = place;
    return verified || knownFacts({ cover, priceMin, hours, cuisine, verified, vibes }) >= 2;
}

// OpenStreetMap cuisine tags ("french;regional;coffee_shop") in the
// visitor's language. Unknown values are shown as written, capitalised.
const CUISINES: Record<string, { fr: string; en: string }> = {
    regional: { fr: "Cuisine locale", en: "Local cuisine" },
    local: { fr: "Cuisine locale", en: "Local cuisine" },
    cameroonian: { fr: "Camerounaise", en: "Cameroonian" },
    camerounaise: { fr: "Camerounaise", en: "Cameroonian" },
    african: { fr: "Africaine", en: "African" },
    senegalese: { fr: "Sénégalaise", en: "Senegalese" },
    chicken: { fr: "Poulet", en: "Chicken" },
    pizza: { fr: "Pizza", en: "Pizza" },
    "italian pizza": { fr: "Pizza", en: "Pizza" },
    french: { fr: "Française", en: "French" },
    burger: { fr: "Burgers", en: "Burgers" },
    "coffee shop": { fr: "Café", en: "Coffee" },
    sandwich: { fr: "Sandwichs", en: "Sandwiches" },
    barbecue: { fr: "Grillades", en: "Barbecue" },
    grill: { fr: "Grillades", en: "Grill" },
    lebanese: { fr: "Libanaise", en: "Lebanese" },
    "ice cream": { fr: "Glaces", en: "Ice cream" },
    italian: { fr: "Italienne", en: "Italian" },
    international: { fr: "Internationale", en: "International" },
    chinese: { fr: "Chinoise", en: "Chinese" },
    fish: { fr: "Poisson", en: "Fish" },
    seafood: { fr: "Fruits de mer", en: "Seafood" },
    kebab: { fr: "Kebab", en: "Kebab" },
    turkish: { fr: "Turque", en: "Turkish" },
    "steak house": { fr: "Grillades", en: "Steakhouse" },
    friture: { fr: "Friture", en: "Fried food" },
    breakfast: { fr: "Petit-déjeuner", en: "Breakfast" },
    spanish: { fr: "Espagnole", en: "Spanish" },
    american: { fr: "Américaine", en: "American" },
    tea: { fr: "Thé", en: "Tea" },
    indian: { fr: "Indienne", en: "Indian" },
    european: { fr: "Européenne", en: "European" },
    crepe: { fr: "Crêpes", en: "Crêpes" },
    cake: { fr: "Gâteaux", en: "Cakes" },
    greek: { fr: "Grecque", en: "Greek" },
    korean: { fr: "Coréenne", en: "Korean" },
    vietnamese: { fr: "Vietnamienne", en: "Vietnamese" },
    belgian: { fr: "Belge", en: "Belgian" },
    brazilian: { fr: "Brésilienne", en: "Brazilian" },
    arab: { fr: "Arabe", en: "Arab" },
    german: { fr: "Allemande", en: "German" },
    "fine dining": { fr: "Gastronomique", en: "Fine dining" },
};

export function cuisineLabel(raw: string | null, locale: "fr" | "en", max = 2) {
    if (!raw) return null;
    const labels = raw
        .split(/[;,]/)
        .map((value) => value.trim().toLowerCase().replace(/_/g, " "))
        .filter(Boolean)
        .map((value) => CUISINES[value]?.[locale] ?? value.charAt(0).toUpperCase() + value.slice(1));
    return [...new Set(labels)].slice(0, max).join(", ") || null;
}
