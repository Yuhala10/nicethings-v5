import { NextResponse } from "next/server";
import { readInvitation } from "@/lib/invitations";
import { findGuestPlaces, readNotebook, saveNotebook } from "@/lib/invitations-server";

// A guest's notebook space (app/[lang]/invitation). Every call carries the
// invitation's code, which only the team can make (lib/invitations.ts).
//   GET  ?code=…&q=…   places whose name holds what the guest typed
//   POST { code, name, link, title, places: [...], agree }   the notebook: it becomes a draft

export async function GET(request: Request) {
    const query = new URL(request.url).searchParams;
    if (!readInvitation(query.get("code") ?? "")) return NextResponse.json({ ok: false }, { status: 401 });
    try {
        return NextResponse.json({ ok: true, places: await findGuestPlaces((query.get("q") ?? "").slice(0, 80)) }, { headers: { "Cache-Control": "private, max-age=30" } });
    } catch (error) {
        console.error("Guest place search failed:", error);
        return NextResponse.json({ ok: false }, { status: 502 });
    }
}

export async function POST(request: Request) {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false, why: "invalid" }, { status: 400 });
    }
    const invitation = readInvitation(typeof body.code === "string" ? body.code : "");
    if (!invitation) return NextResponse.json({ ok: false, why: "invitation" }, { status: 401 });
    try {
        const notebook = readNotebook(invitation, body);
        if (!notebook) return NextResponse.json({ ok: false, why: "empty" }, { status: 422 });
        if (!(await saveNotebook(invitation, notebook))) return NextResponse.json({ ok: false, why: "many" }, { status: 429 });
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Guest notebook not saved:", error);
        return NextResponse.json({ ok: false, why: "failed" }, { status: 502 });
    }
}
