import { NextResponse } from "next/server";
import { isAdminPinConfigured, isValidAdminPin, setAdminSession } from "../../../../lib/admin-auth";

export async function POST(request: Request) {
    if (!isAdminPinConfigured()) {
        return NextResponse.json(
            { ok: false, message: "Admin PIN is not configured on the server." },
            { status: 503 }
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
        return NextResponse.json({ ok: false, message: "Incorrect admin PIN." }, { status: 401 });
    }

    await setAdminSession();
    return NextResponse.json({ ok: true });
}
