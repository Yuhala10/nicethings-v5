// Public shapes of a place. `PlaceSummary` is what lists, map pins and
// search work with (kept small because the whole catalogue ships to the
// browser for instant filtering); `PlaceDetail` is the full place page.

export type DayKey =
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";

export const DAY_KEYS: readonly DayKey[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
];

export type PlaceHours = {
    opens: string | null; // "08:00"
    closes: string | null; // "23:00" — may be earlier than opens (past midnight)
    days: DayKey[]; // days it opens
};

export type PlaceSummary = {
    id: string;
    slug: string;
    name: string;
    category: string;
    cuisine: string | null;
    city: string; // city slug, e.g. "douala"
    neighborhood: string | null;
    lat: number;
    lng: number;
    priceMin: number | null;
    priceMax: number | null;
    rating: number;
    reviewCount: number;
    vibes: string[];
    goodFor: string[];
    amenities: string[];
    hours: PlaceHours;
    verified: boolean;
    featured: boolean;
    cover: string | null;
    // Where the listing came from: "field" (checked in person), "osm"
    // (OpenStreetMap import) or "submission" (sent by a visitor).
    source: string;
};

export type PlacePhoto = {
    url: string;
    alt: string | null;
};

export type PlaceMenuItem = {
    name: string;
    description: string | null;
    price: number;
    popular: boolean;
};

export type PlaceReview = {
    id: string;
    rating: number;
    comment: string | null;
    priceAccurate: boolean | null;
    createdAt: string;
};

export type PlaceDetail = PlaceSummary & {
    description: string | null;
    address: string | null;
    landmark: string | null;
    phone: string | null;
    whatsapp: string | null;
    website: string | null;
    instagram: string | null;
    lastVerifiedAt: string | null;
    updatedAt: string;
    sourceRef: string | null; // e.g. "node/123" for OpenStreetMap
    claimed: boolean; // managed by the business itself (approved claim)
    photos: PlacePhoto[];
    menu: PlaceMenuItem[];
    reviews: PlaceReview[];
};
