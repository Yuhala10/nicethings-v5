import { NextResponse } from "next/server";
import { notInstalled } from "@/lib/atlas/store";
import { checkSecret } from "@/lib/people/signin";
import { deny, foreign, meOf, readBody, robot, startSession } from "@/lib/people/server";

// Coming back on any phone: the @name and the 6-digit PIN.
export async function POST(request: Request) {
    const body = await readBody(request);
    if (robot(request, body) || foreign(request)) return deny("invalid", 400);
    const pin = typeof body.pin === "string" ? body.pin.replace(/\D/g, "") : "";
    if (!pin) return deny("wrong", 401);
    try {
        const result = await checkSecret(request, body.handle, pin, "pin");
        if (result.ok === false) return deny(result.why, result.status, result.more);
        await startSession(result.row.id, request);
        return NextResponse.json({ ok: true, me: await meOf(result.row) });
    } catch (error) {
        if (notInstalled(error)) return deny("closed", 503);
        console.error("Sign-in failed:", error);
        return deny("failed", 502);
    }
}
