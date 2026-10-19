import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { UUID_PATTERN, fail, readJson, requireAdmin } from "@/lib/admin-api";
import { notInstalled } from "@/lib/atlas/store";
import { reviewsTag } from "@/lib/people/reviews";
import { peopleByIds } from "@/lib/people/server";
import { recount, talkTag, type Target } from "@/lib/people/talk";

// The team's desk for what people write in their own name: comments (under
// articles, wall photos and reviews) and reviews of places. Published at
// once; the ones carrying a link or a phone number wait here, and the ones
// reported three times step aside until someone looks.

type Item = { kind: "comment" | "review"; id: string; body: string | null; rating: number | null; status: string; reports: number; created_at: string; profile_id: string; where: { label: string; href: string | null } };

export async function GET() {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    try {
        const commentColumns = "id,target,target_id,profile_id,body,status,reports,created_at";
        const reviewColumns = "id,spot_id,profile_id,rating,comment,status,reports,created_at";
        const [commentsWaiting, commentsRecent, reviewsWaiting, reviewsRecent] = await Promise.all([
            db.from("nt_comments").select(commentColumns).or("status.neq.PUBLISHED,reports.gt.0").order("created_at", { ascending: true }).limit(200),
            db.from("nt_comments").select(commentColumns).eq("status", "PUBLISHED").order("created_at", { ascending: false }).limit(40),
            db.from("nt_reviews").select(reviewColumns).not("profile_id", "is", null).or("status.neq.PUBLISHED,reports.gt.0").order("created_at", { ascending: true }).limit(200),
            db.from("nt_reviews").select(reviewColumns).not("profile_id", "is", null).eq("status", "PUBLISHED").order("created_at", { ascending: false }).limit(40),
        ]);
        for (const result of [commentsWaiting, commentsRecent, reviewsWaiting, reviewsRecent]) if (result.error) throw result.error;

        const comments = [...(commentsWaiting.data ?? []), ...(commentsRecent.data ?? [])];
        const reviews = [...(reviewsWaiting.data ?? []), ...(reviewsRecent.data ?? [])];
        // Where each was written: the article, the place of the wall photo or of the review.
        const articleIds = comments.filter((row) => row.target === "article").map((row) => row.target_id as string);
        const postIds = comments.filter((row) => row.target === "wall").map((row) => row.target_id as string);
        const reviewIds = comments.filter((row) => row.target === "review").map((row) => row.target_id as string);
        const [articles, posts, parents] = await Promise.all([
            articleIds.length ? db.from("nt_posts").select("id,slug,title_fr").in("id", articleIds) : null,
            postIds.length ? db.from("nt_spot_posts").select("id,spot_id").in("id", postIds) : null,
            reviewIds.length ? db.from("nt_reviews").select("id,spot_id").in("id", reviewIds) : null,
        ]);
        const spotIds = [...new Set([...reviews.map((row) => row.spot_id as string), ...(posts?.data ?? []).map((row) => row.spot_id as string), ...(parents?.data ?? []).map((row) => row.spot_id as string)])];
        const spots = spotIds.length ? await db.from("nt_spots").select("id,slug,name").in("id", spotIds) : null;
        const spotOf = new Map<string, { slug: string; name: string }>((spots?.data ?? []).map((spot) => [spot.id as string, { slug: spot.slug as string, name: spot.name as string }]));
        const articleOf = new Map<string, { slug: string; title: string }>((articles?.data ?? []).map((post) => [post.id as string, { slug: post.slug as string, title: post.title_fr as string }]));
        const postSpot = new Map<string, string>((posts?.data ?? []).map((post) => [post.id as string, post.spot_id as string]));
        const parentSpot = new Map<string, string>((parents?.data ?? []).map((review) => [review.id as string, review.spot_id as string]));

        const placeLink = (spotId: string | undefined, hash = "") => {
            const spot = spotId ? spotOf.get(spotId) : null;
            return spot ? { label: spot.name, href: `/fr/p/${spot.slug}${hash}` } : { label: "—", href: null };
        };
        const commentItem = (row: (typeof comments)[number]): Item => ({
            kind: "comment",
            id: row.id as string,
            body: row.body as string,
            rating: null,
            status: row.status as string,
            reports: (row.reports as number) ?? 0,
            created_at: row.created_at as string,
            profile_id: row.profile_id as string,
            where:
                row.target === "article"
                    ? articleOf.has(row.target_id as string)
                        ? { label: articleOf.get(row.target_id as string)!.title, href: `/fr/blog/${articleOf.get(row.target_id as string)!.slug}#commentaires` }
                        : { label: "—", href: null }
                    : placeLink(row.target === "wall" ? postSpot.get(row.target_id as string) : parentSpot.get(row.target_id as string), "#avis"),
        });
        const reviewItem = (row: (typeof reviews)[number]): Item => ({
            kind: "review",
            id: row.id as string,
            body: (row.comment as string | null) ?? null,
            rating: row.rating as number,
            status: row.status as string,
            reports: (row.reports as number) ?? 0,
            created_at: row.created_at as string,
            profile_id: row.profile_id as string,
            where: placeLink(row.spot_id as string, "#avis"),
        });

        const waiting = [...(commentsWaiting.data ?? []).map(commentItem), ...(reviewsWaiting.data ?? []).map(reviewItem)].sort((a, b) => a.created_at.localeCompare(b.created_at));
        const recent = [...(commentsRecent.data ?? []).map(commentItem), ...(reviewsRecent.data ?? []).map(reviewItem)].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50);
        const people = await peopleByIds([...waiting, ...recent].map((item) => item.profile_id));
        const withPerson = (item: Item) => ({ ...item, person: people.get(item.profile_id) ?? null });
        return NextResponse.json({ ok: true, setup: false, waiting: waiting.map(withPerson), recent: recent.map(withPerson) });
    } catch (error) {
        if (notInstalled(error) || (error as { code?: string }).code === "42703") return NextResponse.json({ ok: true, setup: true, waiting: [], recent: [] });
        return fail(error);
    }
}

// POST /api/admin/comments { kind, id, action: "approve" | "hide" | "delete" }
export async function POST(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const body = await readJson(request);
    const kind = body?.kind === "review" ? "review" : body?.kind === "comment" ? "comment" : null;
    const id = typeof body?.id === "string" && UUID_PATTERN.test(body.id) ? body.id : null;
    const action = body?.action;
    if (!kind || !id || (action !== "approve" && action !== "hide" && action !== "delete")) return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });

    try {
        const table = kind === "comment" ? "nt_comments" : "nt_reviews";
        const columns = kind === "comment" ? "target,target_id" : "spot_id";
        const change =
            action === "delete"
                ? await db.from(table).delete().eq("id", id).select(columns).maybeSingle()
                : await db
                      .from(table)
                      .update(action === "approve" ? { status: "PUBLISHED", reports: 0 } : { status: "HIDDEN" })
                      .eq("id", id)
                      .select(columns)
                      .maybeSingle();
        if (change.error) throw change.error;
        // Approving clears the flags too, so the same people cannot hide it again.
        if (action === "approve") await db.from("nt_flags").delete().eq("kind", kind).eq("item_id", id);
        const row = change.data as { target?: Target; target_id?: string; spot_id?: string } | null;
        if (row?.target && row.target_id) {
            await recount(row.target, row.target_id);
            revalidateTag(talkTag(row.target, row.target_id), { expire: 0 });
        }
        if (row?.spot_id) revalidateTag(reviewsTag(row.spot_id), { expire: 0 });
        return NextResponse.json({ ok: true });
    } catch (error) {
        return fail(error);
    }
}
