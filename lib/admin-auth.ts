import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "nt_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function getPin() {
    const pin = process.env.NICE_THINGS_ADMIN_PIN?.trim();
    if (!pin) {
        throw new Error("Missing NICE_THINGS_ADMIN_PIN environment variable.");
    }
    return pin;
}

function getSecret() {
    return process.env.NICE_THINGS_ADMIN_SESSION_SECRET?.trim() || getPin();
}

function sign(payload: string) {
    return crypto
        .createHmac("sha256", getSecret())
        .update(payload)
        .digest("base64url");
}

function createToken() {
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
    const payload = `admin.${expiresAt}`;
    return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string | undefined) {
    if (!token) return false;
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== "admin") return false;
    const expiresAt = Number(parts[1]);
    if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
    const expected = sign(`${parts[0]}.${parts[1]}`);
    const actual = parts[2];
    const a = Buffer.from(actual);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function isAdminPinConfigured() {
    return Boolean(process.env.NICE_THINGS_ADMIN_PIN?.trim());
}

export function isValidAdminPin(pin: string) {
    const expected = getPin();
    const a = Buffer.from(pin.trim());
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function setAdminSession() {
    const store = await cookies();
    store.set(COOKIE_NAME, createToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: SESSION_TTL_SECONDS,
    });
}

export async function clearAdminSession() {
    const store = await cookies();
    store.set(COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 0,
    });
}

export async function hasAdminSession() {
    const store = await cookies();
    return verifyToken(store.get(COOKIE_NAME)?.value);
}
