import { NextResponse } from "next/server";
import { UUID_PATTERN, fail, readJson, requireAdmin } from "@/lib/admin-api";
import { readPostChanges, uniquePostSlug } from "@/lib/blog/admin";
import { refreshPosts } from "@/lib/refresh";

type Context = { params: Promise<{ id: string }> };

async function load(context: Context) {
    const { id } = await context.params;
    return UUID_PATTERN.test(id) ? id : null;
}

export async function GET(_request: Request, context: Context) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const id = await load(context);
    if (!id) return NextResponse.json({ ok: false, message: "Article introuvable." }, { status: 404 });
    const { data, error } = await db.from("nt_posts").select("*").eq("id", id).maybeSingle();
    if (error) return fail(error);
    if (!data) return NextResponse.json({ ok: false, message: "Article introuvable." }, { status: 404 });
    return NextResponse.json({ ok: true, row: data });
}

// Save. Publishing needs a title, a cover and some text; a publication date
// in the future schedules the article.
export async function PATCH(request: Request, context: Context) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const id = await load(context);
    const body = await readJson(request);
    if (!id || !body) return NextResponse.json({ ok: false, message: "Requête invalide." }, { status: 400 });

    try {
        const changes = readPostChanges(body);
        if (typeof body.slug === "string" && body.slug.trim()) changes.slug = await uniquePostSlug(db, body.slug, id);

        const { data: current, error: readError } = await db.from("nt_posts").select("status,published_at,cover_url,body_fr,title_fr").eq("id", id).maybeSingle();
        if (readError) throw readError;
        if (!current) return NextResponse.json({ ok: false, message: "Article introuvable." }, { status: 404 });

        const next = { ...current, ...changes } as Record<string, unknown>;
        if (next.status === "PUBLISHED") {
            const length = JSON.stringify(next.body_fr ?? []).length;
            if (!next.cover_url) return NextResponse.json({ ok: false, message: "Ajoute une photo de couverture avant de publier." }, { status: 422 });
            if (length < 200) return NextResponse.json({ ok: false, message: "L'article est encore trop court pour être publié." }, { status: 422 });
            if (!next.published_at) changes.published_at = new Date().toISOString();
        }

        const { data, error } = await db.from("nt_posts").update(changes).eq("id", id).select("*").single();
        if (error) throw error;
        refreshPosts();
        return NextResponse.json({ ok: true, row: data });
    } catch (error) {
        return fail(error);
    }
}

export async function DELETE(_request: Request, context: Context) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const id = await load(context);
    if (!id) return NextResponse.json({ ok: false, message: "Article introuvable." }, { status: 404 });

    // The article's pictures go with it.
    const files = await db.storage.from("blog-images").list(id, { limit: 1000 });
    if (files.data?.length) await db.storage.from("blog-images").remove(files.data.map((file) => `${id}/${file.name}`));

    const { error } = await db.from("nt_posts").delete().eq("id", id);
    if (error) return fail(error);
    refreshPosts();
    return NextResponse.json({ ok: true });
}
