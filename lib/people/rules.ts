// The rules of profiles, shared by the forms in the browser and the server
// that checks them: what an @name may be, what a PIN must be, the limits of
// what people write, and how a profile climbs its levels.

// ---------------------------------------------------------------- @names

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;
const HANDLE = /^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$/;

// Names that would pass for the team, the site or one of its pages.
const RESERVED = new Set([
    "admin", "administrateur", "administrator", "root", "system", "support", "aide", "help", "contact", "team", "equipe", "staff",
    "moderateur", "moderator", "modo", "official", "officiel", "nicethings", "nice_things", "nice.things", "nicethings237", "nicethingscm",
    "pro", "owner", "proprio", "proprietaire", "invite", "invites", "guest", "guests", "api", "www", "app", "moi", "me", "profil", "profile",
    "fr", "en", "null", "undefined", "anonyme", "anonymous", "fondateur", "founder", "ceo",
]);
// Words no @name carries (insults, and pretending to be the site).
const BANNED = ["nicething", "admin", "pute", "salope", "connard", "encule", "fuck", "bitch", "nigga", "nigger", "mbout", "sexe", "porn"];

// What someone types, made into a possible @name: lower case, accents off,
// spaces to "_", nothing but letters, digits, "." and "_".
export function normalizeHandle(value: string) {
    return value
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim()
        .replace(/^@+/, "")
        .replace(/[\s-]+/g, "_")
        .replace(/[^a-z0-9._]/g, "")
        .slice(0, HANDLE_MAX);
}

export type HandleProblem = "short" | "format" | "taken" | "reserved";

export function handleProblem(handle: string): HandleProblem | null {
    if (handle.length < HANDLE_MIN) return "short";
    if (!HANDLE.test(handle) || /[._]{2}/.test(handle)) return "format";
    if (RESERVED.has(handle) || BANNED.some((word) => handle.includes(word))) return "reserved";
    return null;
}

// ---------------------------------------------------------------- PIN

export const PIN_LENGTH = 6;

// The first PINs anyone would try.
const WEAK = new Set(["123456", "654321", "012345", "543210", "123123", "112233", "121212", "101010", "123321", "696969", "147258", "258369", "159753", "111222", "202020", "100000", "999999"]);

export type PinProblem = "format" | "weak";

export function pinProblem(pin: string): PinProblem | null {
    if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) return "format";
    if (WEAK.has(pin) || /^(\d)\1+$/.test(pin)) return "weak";
    return null;
}

// ---------------------------------------------------------------- limits

export const MAX_NAME = 40;
export const MAX_BIO = 160;
export const MAX_REVIEW = 1000;
export const MIN_COMMENT = 2;
export const MAX_COMMENT = 600;
export const MAX_PRICE = 1_000_000;
// Per profile: enough for anyone real, too little for a flood.
export const COMMENTS_PER_HOUR = 20;
export const REVIEWS_PER_DAY = 12;
// Per connection, per day.
export const SIGNUPS_PER_DAY = 6;

// A comment or review that carries a link or a phone number waits for the
// team: that is how spam and scams look.
export function needsReading(text: string) {
    return /(https?:\/\/|www\.|\.(com|net|org|site|cm|io|ly)\b)/i.test(text) || /(\+?237[\s.-]?)?\b6[\s.-]?\d{2}([\s.-]?\d{2}){3}\b/.test(text);
}

// ---------------------------------------------------------------- reviews

export const RATINGS = [1, 2, 3, 4, 5] as const;

// What people liked, and what could be better (words in the dictionary,
// `people.tags`).
export const LIKE_TAGS = ["food", "ambiance", "welcome", "value", "clean", "music", "view", "calm", "fast", "portions", "wifi", "date", "family"] as const;
export const DISLIKE_TAGS = ["pricey", "slow", "noisy", "small", "dirty", "hard_to_find"] as const;
// What is good to know here, and that no other platform says: still lit
// during a power cut, the match on screen, Mobile Money taken…
export const FACT_TAGS = ["generator", "match", "momo", "guarded_parking", "rain_ok", "card"] as const;
export const REVIEW_TAGS: readonly string[] = [...LIKE_TAGS, ...DISLIKE_TAGS, ...FACT_TAGS];

export const COMPANIES = ["solo", "couple", "friends", "family", "work"] as const;

// ---------------------------------------------------------------- levels

export type Stats = { reviews: number; photos: number; comments: number; cheers: number; tips?: number; pulses?: number };

// What each gesture is worth: a review counts most, then a photo, then the
// way to a place, then what others gave back (likes, "validé", "utile").
export function pointsOf(stats: Stats) {
    return stats.reviews * 10 + stats.photos * 8 + (stats.tips ?? 0) * 5 + stats.comments * 2 + (stats.pulses ?? 0) + stats.cheers;
}

// ---------------------------------------------------------------- live news and ways

// What someone there can say in one tap.
export const PULSES = ["open", "closed", "lively", "calm", "full", "power_cut"] as const;
export type Pulse = (typeof PULSES)[number];
// How long a live news stays on a place's page.
export const PULSE_HOURS = 6;
// One news per member and place in this time, and so many a day in all.
export const PULSE_REST_MINUTES = 90;
export const PULSES_PER_DAY = 15;

export const TIP_KINDS = ["taxi", "way"] as const;
export type TipKind = (typeof TIP_KINDS)[number];
export const MAX_TIP: Record<TipKind, number> = { taxi: 140, way: 400 };
export const MIN_TIP = 6;

// From "Nouveau" to "Légende du kwat" (names in `people.levels`).
export const LEVELS = [0, 30, 100, 250, 600] as const;

export function levelOf(points: number) {
    let level = 0;
    LEVELS.forEach((floor, index) => {
        if (points >= floor) level = index;
    });
    const next = LEVELS[level + 1] ?? null;
    return { level, points, next, progress: next === null ? 1 : (points - LEVELS[level]) / (next - LEVELS[level]) };
}

// The first hundred to join carry it forever.
export const PIONEERS = 100;
