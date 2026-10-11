import type { WallPost } from "../posts";

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
    // What the tick rests on: a visit by the team ("site"), or public
    // sources for well-known sites nobody on the team has been to yet
    // ("sources"). The page says which.
    verifiedFrom: "site" | "sources";
    // For places that deserve more than an address (database script 005).
    // `standing`: 0 an address, 1 a place worth the trip, 2 a place with a
    // story. `positionExact` is false when the pin is only approximate: the
    // page then leads with the directions in words.
    standing: 0 | 1 | 2;
    positionExact: boolean;
    guide: Record<"story" | "access" | "fees" | "company" | "bestTime" | "bring", { fr: string | null; en: string | null }>;
    // Approved photos and videos from visitors, most liked first. `null`
    // while the wall is not open (database script 005 not run).
    wall: WallPost[] | null;
    // Visitors the guidance brought to the door and who confirmed the place
    // is there (app/api/arrivals): how many times, and the last time.
    arrivals: { count: number; last: string | null };
    photos: PlacePhoto[];
    menu: PlaceMenuItem[];
    reviews: PlaceReview[];
};
