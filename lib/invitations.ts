import crypto from "node:crypto";

// Personal invitations to write a guest's notebook (server only).
//
// The team invites one person by name; the link they receive greets them by
// that name and opens their notebook space (app/[lang]/invitation). There is
// no table behind it: the link itself carries the name and an end date, and
// a signature only the server can make, so a link cannot be made up or
// altered. What a guest sends becomes a draft article for the team to read
// (app/api/invitations).

const DAYS_VALID = 60;
const MAX_NAME = 40;
const DAY_MS = 86_400_000;
const SIGNATURE_LENGTH = 14; // of base64url: 84 bits

// The signing key is drawn from the server's database secret: long, random,
// and never sent to a browser. (Not the console's PIN: too short to sign with.)
function key() {
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
    return crypto.createHmac("sha256", secret).update("nicethings:invitation:v1").digest();
}

const sign = (payload: string) => crypto.createHmac("sha256", key()).update(payload).digest("base64url").slice(0, SIGNATURE_LENGTH);

// A guest's name as it will be shown: trimmed, one space between words.
export function cleanGuestName(value: unknown) {
    const name = typeof value === "string" ? value.replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME) : "";
    return name.length >= 2 ? name : null;
}

// The code that goes in the link: name.end-day.signature
export function createInvitation(name: string, now = new Date()) {
    const payload = `${Buffer.from(name, "utf8").toString("base64url")}.${(Math.floor(now.getTime() / DAY_MS) + DAYS_VALID).toString(36)}`;
    return `${payload}.${sign(payload)}`;
}

export type Invitation = { name: string; until: Date; ref: string };

// Reads a code back: null when it was not made here, was altered, or has run out.
export function readInvitation(code: string, now = new Date()): Invitation | null {
    const parts = code.split(".");
    if (parts.length !== 3 || code.length > 200) return null;
    const payload = `${parts[0]}.${parts[1]}`;
    const expected = Buffer.from(sign(payload));
    const given = Buffer.from(parts[2]);
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
    const day = Number.parseInt(parts[1], 36);
    const name = cleanGuestName(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (!name || !Number.isFinite(day) || day * DAY_MS < now.getTime() - DAY_MS) return null;
    return {
        name,
        until: new Date(day * DAY_MS),
        // A short name for this invitation: its folder of pictures, the mark on its drafts.
        ref: crypto.createHash("sha256").update(code).digest("hex").slice(0, 12),
    };
}
