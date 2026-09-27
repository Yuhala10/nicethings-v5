import { NextResponse } from "next/server";
import { isAdminPinConfigured, isValidAdminPin, setAdminSession } from "../../../../lib/admin-auth";

// Brute-force guard: after MAX_ATTEMPTS wrong PINs from one address, refuse
// further attempts until the window passes. In-memory, so it resets when the
// server restarts and is per-instance on serverless hosts — enough to make
// guessing a 6+ digit PIN impractical, not a replacement for a strong PIN.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; firstAt: number }>();

function clientKey(request: Request) {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown"
    );
}

function isLockedOut(key: string) {
    const entry = failures.get(key);
    if (!entry) return false;

    if (Date.now() - entry.firstAt > WINDOW_MS) {
        failures.delete(key);
        return false;
    }

    return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string) {
    const entry = failures.get(key);

    if (!entry || Date.now() - entry.firstAt > WINDOW_MS) {
        failures.set(key, { count: 1, firstAt: Date.now() });
    } else {
        entry.count += 1;
    }
}

export async function POST(request: Request) {
    if (!isAdminPinConfigured()) {
        return NextResponse.json(
            { ok: false, message: "Admin PIN is not configured on the server." },
            { status: 503 }
        );
    }

    const key = clientKey(request);

    if (isLockedOut(key)) {
        return NextResponse.json(
            { ok: false, message: "Too many attempts. Try again in 15 minutes." },
            { status: 429 }
        );
    }

    let body: { pin?: string } = {};
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
    }

    const pin = typeof body.pin === "string" ? body.pin : "";
    if (!pin || pin.length > 128 || !isValidAdminPin(pin)) {
        recordFailure(key);
        return NextResponse.json({ ok: false, message: "Incorrect admin PIN." }, { status: 401 });
    }

    failures.delete(key);
    await setAdminSession();
    return NextResponse.json({ ok: true });
}
