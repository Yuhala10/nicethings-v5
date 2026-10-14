import { NextResponse } from "next/server";
import { readJson, requireAdmin } from "@/lib/admin-api";
import { notInstalled } from "@/lib/atlas/store";
import { getGuests, type Guest } from "@/lib/guests";
import { cleanGuestName, createInvitation, readInvitation } from "@/lib/invitations";

// The team's side of "Demande ton invitation" and of guests' pages.
//   GET                          requests (waiting first) and every guest's card
//   PATCH { id, status }         INVITED (answers the invitation to send) or DECLINED

export async function GET() {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const [requests, cards] = await Promise.all([
        db.from("nt_guest_requests").select("*").order("created_at", { ascending: false }).limit(150),
        db.from("nt_guests").select("ref,slug,name,handle,portrait_url,created_at").order("created_at", { ascending: false }).limit(100),
    ]);
    if (requests.error || cards.error) {
        if (notInstalled(requests.error) || notInstalled(cards.error)) return NextResponse.json({ ok: true, setup: true, requests: [], guests: [] });
        return NextResponse.json({ ok: false, message: (requests.error ?? cards.error)?.message }, { status: 502 });
    }
    const live = new Map((await getGuests().catch(() => [] as Guest[])).map((guest) => [guest.ref, guest.number] as const));
    const rows = (requests.data ?? []).sort((a, b) => Number(b.status === "PENDING") - Number(a.status === "PENDING"));
    return NextResponse.json({ ok: true, requests: rows, guests: (cards.data ?? []).map((card) => ({ ...card, number: live.get(card.ref) ?? null })) });
}

export async function PATCH(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const body = (await readJson(request)) ?? {};
    const id = typeof body.id === "string" ? body.id : "";
    const status = body.status === "INVITED" || body.status === "DECLINED" || body.status === "PENDING" ? body.status : null;
    if (!id || !status) return NextResponse.json({ ok: false, message: "Demande inconnue." }, { status: 422 });

    const { data: row, error } = await db.from("nt_guest_requests").select("id,name").eq("id", id).maybeSingle();
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 502 });
    if (!row) return NextResponse.json({ ok: false, message: "Demande introuvable." }, { status: 404 });

    const saved = await db.from("nt_guest_requests").update({ status, decided_at: status === "PENDING" ? null : new Date().toISOString() }).eq("id", id);
    if (saved.error) return NextResponse.json({ ok: false, message: saved.error.message }, { status: 502 });
    if (status !== "INVITED") return NextResponse.json({ ok: true });

    // Their invitation, made in the name they gave.
    const name = cleanGuestName(row.name) ?? "Invité";
    const code = createInvitation(name);
    return NextResponse.json({ ok: true, name, path: `/i/${code}`, until: readInvitation(code)?.until.toISOString() ?? null });
}
