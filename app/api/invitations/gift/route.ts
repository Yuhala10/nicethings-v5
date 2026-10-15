import { NextResponse } from "next/server";
import { giveInvitation } from "@/lib/guests";
import { cleanGuestName, readInvitation } from "@/lib/invitations";

// A guest of honour gives one of their three invitations (from their own
// invitation link, once their page is out). The new invitation is signed
// like the team's, and says who gave it.
//   POST { code, name }   → { ok, path, left } or { ok: false, why }
export async function POST(request: Request) {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false, why: "invalid" }, { status: 400 });
    }
    const invitation = readInvitation(typeof body.code === "string" ? body.code : "");
    if (!invitation) return NextResponse.json({ ok: false, why: "invitation" }, { status: 401 });
    const name = cleanGuestName(body.name);
    if (!name) return NextResponse.json({ ok: false, why: "name" }, { status: 422 });
    try {
        const given = await giveInvitation(invitation, name);
        if (!given.ok) return NextResponse.json(given, { status: given.why === "none-left" ? 429 : 403 });
        return NextResponse.json({ ok: true, name, path: `/i/${given.code}`, left: given.left });
    } catch (error) {
        console.error("Gift invitation failed:", error);
        return NextResponse.json({ ok: false, why: "failed" }, { status: 502 });
    }
}
