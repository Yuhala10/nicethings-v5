import { NextResponse } from "next/server";
import { deny, endSession, foreign, readBody } from "@/lib/people/server";

// Signing out this phone, or every phone at once.
export async function POST(request: Request) {
    if (foreign(request)) return deny("invalid", 403);
    const body = await readBody(request);
    try {
        await endSession(body.everywhere === true);
    } catch (error) {
        console.error("Sign-out not recorded:", error);
    }
    return NextResponse.json({ ok: true });
}
