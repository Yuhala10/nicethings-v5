import { NextResponse } from "next/server";
import { readJson, requireAdmin } from "@/lib/admin-api";
import { cleanGuestName, createInvitation, readInvitation } from "@/lib/invitations";

// POST /api/admin/invitations { name } — the team invites one person to
// write a notebook. Answers the short address to send them (app/i/[code]),
// which greets them by that name for sixty days.
export async function POST(request: Request) {
    const { denied } = await requireAdmin();
    if (denied) return denied;
    const body = (await readJson(request)) ?? {};
    const name = cleanGuestName(body.name);
    if (!name) return NextResponse.json({ ok: false, message: "Le nom de l'invité manque." }, { status: 422 });
    const code = createInvitation(name);
    return NextResponse.json({ ok: true, name, code, path: `/i/${code}`, until: readInvitation(code)?.until.toISOString() ?? null });
}
