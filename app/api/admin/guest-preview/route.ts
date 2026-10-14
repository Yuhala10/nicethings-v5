import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import { paths } from "@/lib/places/paths";

// "Aperçu" of a guest's page before their notebook is out: turns on Next's
// draft mode for this browser (the page then reads drafts too, for signed-in
// team members only) and opens it as visitors will see it.
export async function GET(request: Request) {
    const { denied } = await requireAdmin();
    if (denied) return denied;
    const query = new URL(request.url).searchParams;
    const slug = query.get("slug") ?? "";
    if (!/^[a-z0-9-]{1,60}$/.test(slug)) return NextResponse.json({ ok: false }, { status: 404 });
    (await draftMode()).enable();
    redirect(paths.guest(query.get("l") === "en" ? "en" : "fr", slug));
}
