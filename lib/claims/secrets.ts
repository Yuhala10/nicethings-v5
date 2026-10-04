import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

// Small cryptographic helpers for claims (server only).

function key() {
    const secret = process.env.NICE_THINGS_ADMIN_SESSION_SECRET?.trim() || process.env.NICE_THINGS_ADMIN_PIN?.trim();
    if (!secret) throw new Error("Missing NICE_THINGS_ADMIN_SESSION_SECRET.");
    return createHash("sha256").update(`claims:${secret}`).digest();
}

// The phone code is stored encrypted (AES-256-GCM): the team console can
// read it to send it, a database leak alone cannot.
export function sealCode(code: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key(), iv);
    const data = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
    return [iv, data, cipher.getAuthTag()].map((part) => part.toString("base64url")).join(".");
}

export function openCode(sealed: string | null) {
    if (!sealed) return null;
    try {
        const [iv, data, tag] = sealed.split(".").map((part) => Buffer.from(part, "base64url"));
        const decipher = createDecipheriv("aes-256-gcm", key(), iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    } catch {
        return null;
    }
}

export function sameCode(expected: string, given: string) {
    const a = Buffer.from(expected);
    const b = Buffer.from(given.replace(/\D/g, ""));
    return a.length === b.length && timingSafeEqual(a, b);
}

export function phoneCode() {
    return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

// "NT-7KQ4": short, readable, no 0/O or 1/I to confuse when handwritten.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function claimCode() {
    let code = "NT-";
    for (let i = 0; i < 5; i++) code += ALPHABET[randomInt(0, ALPHABET.length)];
    return code;
}

// Salted fingerprint of the connection and browser: spots one person
// opening claims under several Google accounts, without storing the IP.
export function clientHash(request: Request) {
    const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    const agent = request.headers.get("user-agent") ?? "";
    return createHash("sha256").update(`${key().toString("hex")}|${ip}|${agent}`).digest("hex").slice(0, 32);
}

// Phone numbers compared on their last 9 digits (Cameroon numbers, with or
// without +237, spaces or dots).
export function samePhone(a: string | null, b: string | null) {
    const digits = (value: string | null) => (value ?? "").replace(/\D/g, "").slice(-9);
    return digits(a).length === 9 && digits(a) === digits(b);
}
