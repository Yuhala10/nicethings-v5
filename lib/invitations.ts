import crypto from "node:crypto";

// Personal invitations to write a guest's notebook (server only).
//
// The team invites one person by name; the link they receive greets them by
// that name and opens their notebook space (app/[lang]/invitation). There is
// no table behind it: the link itself carries the name and an end date, and
// a signature only the server can make, so a link cannot be made up or
// altered. What a guest sends becomes a draft article for the team to read
// (app/api/invitations).
//
// Two ranks: a guest, or a guest of honour (green and gold, their page first,
// their own short address, three invitations of their own to give). An
// invitation a guest of honour gives says who gave it. Both travel inside
// the signed link, so neither can be added by hand.

const DAYS_VALID = 60;
const MAX_NAME = 40;
const DAY_MS = 86_400_000;
const SIGNATURE_LENGTH = 14; // of base64url: 84 bits

export type Tier = "guest" | "honour";

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

// The code that goes in the link: name.end-day.signature, or with a rank or
// a giver: name.end-day.marks.signature, where the marks are "h" (honour)
// and/or "b" + the giver's 12-character ref.
export function createInvitation(name: string, options: { tier?: Tier; by?: string | null } = {}, now = new Date()) {
    const marks = `${options.tier === "honour" ? "h" : ""}${options.by && /^[0-9a-f]{12}$/.test(options.by) ? `b${options.by}` : ""}`;
    const payload = [Buffer.from(name, "utf8").toString("base64url"), (Math.floor(now.getTime() / DAY_MS) + DAYS_VALID).toString(36), ...(marks ? [marks] : [])].join(".");
    return `${payload}.${sign(payload)}`;
}

export type Invitation = { name: string; until: Date; ref: string; tier: Tier; by: string | null };

// Reads a code back: null when it was not made here, was altered, or has run out.
export function readInvitation(code: string, now = new Date()): Invitation | null {
    const parts = code.split(".");
    if ((parts.length !== 3 && parts.length !== 4) || code.length > 240) return null;
    const payload = parts.slice(0, -1).join(".");
    const expected = Buffer.from(sign(payload));
    const given = Buffer.from(parts[parts.length - 1]);
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
    const day = Number.parseInt(parts[1], 36);
    const name = cleanGuestName(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (!name || !Number.isFinite(day) || day * DAY_MS < now.getTime() - DAY_MS) return null;
    const marks = parts.length === 4 ? parts[2] : "";
    return {
        name,
        until: new Date(day * DAY_MS),
        // A short name for this invitation: its folder of pictures, the mark on its drafts.
        ref: crypto.createHash("sha256").update(code).digest("hex").slice(0, 12),
        tier: marks.startsWith("h") ? "honour" : "guest",
        by: /b([0-9a-f]{12})/.exec(marks)?.[1] ?? null,
    };
}
