import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { UUID_PATTERN, requireAdmin } from "@/lib/admin-api";
import { paths } from "@/lib/places/paths";

// "Aperçu" in the editor: turns on Next's draft mode for this browser (the
// article page then reads drafts too, for signed-in team members only) and
// opens the article as visitors will see it.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) return NextResponse.json({ ok: false }, { status: 404 });
    const { data } = await db.from("nt_posts").select("slug").eq("id", id).maybeSingle();
    if (!data) return NextResponse.json({ ok: false }, { status: 404 });

    (await draftMode()).enable();
    const lang = new URL(request.url).searchParams.get("l") === "en" ? "en" : "fr";
    redirect(paths.post(lang, data.slug));
}
