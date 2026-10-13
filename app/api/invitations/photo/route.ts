import { NextResponse } from "next/server";
import { readInvitation } from "@/lib/invitations";
import { saveGuestPicture } from "@/lib/invitations-server";

// A guest adds a picture to their notebook (resized on their phone first).
// The invitation's code says who is sending; the picture is checked and
// written again on the server (lib/invitations-server.ts).
export async function POST(request: Request) {
    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return NextResponse.json({ ok: false, why: "invalid" }, { status: 400 });
    }
    const invitation = readInvitation(String(form.get("code") ?? ""));
    const file = form.get("file");
    if (!invitation) return NextResponse.json({ ok: false, why: "invitation" }, { status: 401 });
    if (!(file instanceof File)) return NextResponse.json({ ok: false, why: "invalid" }, { status: 400 });
    try {
        const saved = await saveGuestPicture(invitation, file);
        return NextResponse.json(saved, { status: saved.ok ? 200 : saved.why === "heavy" ? 413 : saved.why === "many" ? 429 : 415 });
    } catch (error) {
        console.error("Guest picture not saved:", error);
        return NextResponse.json({ ok: false, why: "failed" }, { status: 502 });
    }
}
