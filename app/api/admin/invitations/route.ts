import { NextResponse } from "next/server";
import { readJson, requireAdmin } from "@/lib/admin-api";
import { cleanGuestName, createInvitation, readInvitation } from "@/lib/invitations";

// POST /api/admin/invitations { name, tier } — the team invites one person
// to write a notebook, as a guest or as a guest of honour ("honour").
// Answers the short address to send them (app/i/[code]), which greets them
// by that name for sixty days.
export async function POST(request: Request) {
    const { denied } = await requireAdmin();
    if (denied) return denied;
    const body = (await readJson(request)) ?? {};
    const name = cleanGuestName(body.name);
    if (!name) return NextResponse.json({ ok: false, message: "Le nom de l'invité manque." }, { status: 422 });
    const tier = body.tier === "honour" ? "honour" : "guest";
    const code = createInvitation(name, { tier });
    return NextResponse.json({ ok: true, name, tier, code, path: `/i/${code}`, until: readInvitation(code)?.until.toISOString() ?? null });
}
