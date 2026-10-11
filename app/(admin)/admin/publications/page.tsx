"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Heart, Trash2 } from "lucide-react";
import { useTr } from "@/components/admin/i18n";
import { Empty, PageHeader, Skeleton, timeAgo, useAdminData, useAdminToast } from "@/components/admin/ui";
import { adminPost } from "@/lib/admin-client";

type Post = {
    id: string;
    kind: "photo" | "video";
    url: string;
    poster: string | null;
    duration: number | null;
    caption: string | null;
    likes: number;
    created_at: string;
    place: { id: string; name: string; slug: string | null; city: string | null } | null;
};
type Remark = { id: string; name: string | null; body: string; created_at: string; article: { id: string; slug: string; title_fr: string } | null };

// What visitors send to the walls of places. Nothing shows on the site
// until it has been approved here; what is shown can be taken down.
export default function PublicationsPage() {
    const tr = useTr();
    const toast = useAdminToast();
    const [busy, setBusy] = useState<string | null>(null);
    const { data, loading, error, reload } = useAdminData<{ setup: boolean; waiting: Post[]; shown: Post[] }>("spot-posts");
    const words = useAdminData<{ setup: boolean; waiting: Remark[]; shown: Remark[] }>("comments");

    const settle = async (remark: Remark, action: "approve" | "remove") => {
        setBusy(remark.id);
        try {
            await adminPost("comments", { id: remark.id, action });
            toast(action === "approve" ? tr("Publié sous l'article", "Published under the article") : tr("Supprimé", "Deleted"));
            await words.reload();
        } catch (caught) {
            toast((caught as Error).message, true);
        } finally {
            setBusy(null);
        }
    };
    const remark = (item: Remark, waiting: boolean) => (
        <li key={item.id} className="a-card flex flex-col gap-3 p-4">
            <div className="min-w-0 text-sm">
                <span className="font-semibold">{item.name ?? tr("Un lecteur", "A reader")}</span>
                <span className="text-muted"> · {timeAgo(item.created_at)}</span>
                {item.article && (
                    <Link href={`/fr/blog/${item.article.slug}#commentaires`} target="_blank" className="mt-0.5 flex items-center gap-1 text-xs text-muted hover:underline">
                        {item.article.title_fr}
                        <ExternalLink size={12} />
                    </Link>
                )}
                <p className="mt-2 whitespace-pre-line text-text-2">{item.body}</p>
            </div>
            <div className="flex gap-2">
                {waiting && (
                    <button type="button" className="a-btn a-btn-primary h-10 flex-1" disabled={busy !== null} onClick={() => settle(item, "approve")}>
                        <Check size={15} />
                        {tr("Publier", "Publish")}
                    </button>
                )}
                <button type="button" className="a-btn a-btn-soft h-10" disabled={busy !== null} onClick={() => settle(item, "remove")}>
                    <Trash2 size={15} />
                    {waiting ? tr("Refuser", "Refuse") : tr("Supprimer", "Delete")}
                </button>
            </div>
        </li>
    );

    const decide = async (post: Post, action: "approve" | "remove") => {
        setBusy(post.id);
        try {
            await adminPost("spot-posts", { id: post.id, action });
            toast(action === "approve" ? tr("Publié sur la fiche du lieu", "Published on the place's page") : tr("Retiré et supprimé", "Taken down and deleted"));
            await reload();
        } catch (caught) {
            toast((caught as Error).message, true);
        } finally {
            setBusy(null);
        }
    };

    const media = (post: Post) =>
        post.kind === "video" ? (
            <video src={post.url} poster={post.poster ?? undefined} controls playsInline preload="metadata" className="h-full w-full bg-black object-contain" />
        ) : (
            <img src={post.url} alt={post.caption ?? ""} loading="lazy" className="h-full w-full object-cover" />
        );
    const place = (post: Post) =>
        post.place ? (
            post.place.slug ? (
                <Link href={`/fr/p/${post.place.slug}`} target="_blank" className="inline-flex items-center gap-1 font-semibold hover:underline">
                    {post.place.name}
                    <ExternalLink size={13} />
                </Link>
            ) : (
                <span className="font-semibold">{post.place.name}</span>
            )
        ) : (
            <span className="text-muted">{tr("Lieu supprimé", "Deleted place")}</span>
        );

    return (
        <>
            <PageHeader
                title={tr("Contributions", "Contributions")}
                subtitle={tr(
                    "Les photos, vidéos et commentaires envoyés par les visiteurs. Rien n'apparaît sur le site avant ton accord.",
                    "Photos, videos and comments sent by visitors. Nothing shows on the site before you say yes."
                )}
            />

            {/* ---- Comments under articles ---- */}
            <h2 className="a-serif mb-3 text-2xl">
                {tr("Commentaires en attente", "Comments waiting")} <span className="text-muted">· {words.data?.waiting.length ?? 0}</span>
            </h2>
            {words.data?.setup ? (
                <p className="a-card mb-10 p-4 text-sm text-muted">
                    {tr("Les commentaires s'ouvrent une fois le script 006_comments.sql lancé dans Supabase.", "Comments open once the script 006_comments.sql has been run in Supabase.")}
                </p>
            ) : (
                <>
                    {words.data?.waiting.length ? (
                        <ul className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{words.data.waiting.map((item) => remark(item, true))}</ul>
                    ) : (
                        <p className="a-card mb-6 p-4 text-sm text-muted">{tr("Aucun commentaire en attente.", "No comment waiting.")}</p>
                    )}
                    {Boolean(words.data?.shown.length) && (
                        <details className="mb-10">
                            <summary className="cursor-pointer text-sm font-semibold">
                                {tr("Commentaires publiés", "Published comments")} · {words.data?.shown.length}
                            </summary>
                            <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{words.data?.shown.map((item) => remark(item, false))}</ul>
                        </details>
                    )}
                </>
            )}

            {/* ---- Photos and videos on the walls of places ---- */}
            <h2 className="a-serif mb-3 text-2xl">{tr("Photos et vidéos", "Photos & videos")}</h2>
            {error && <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-bad">{error}</p>}
            {loading && !data ? (
                <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 4 }, (_, i) => (
                        <Skeleton key={i} className="h-72" />
                    ))}
                </div>
            ) : data?.setup ? (
                <Empty
                    title={tr("Une étape reste à faire", "One step left")}
                    body={tr(
                        "Lance le script 005_stories.sql dans l'éditeur SQL de Supabase : il crée ce qu'il faut pour recevoir les photos et vidéos.",
                        "Run the script 005_stories.sql in the Supabase SQL editor: it creates what is needed to receive photos and videos."
                    )}
                />
            ) : (
                <>
                    <h3 className="mb-3 text-sm font-semibold text-muted">
                        {tr("En attente", "Waiting")} · {data?.waiting.length ?? 0}
                    </h3>
                    {data?.waiting.length ? (
                        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {data.waiting.map((post) => (
                                <li key={post.id} className="a-card overflow-hidden">
                                    <div className="aspect-[4/5] w-full bg-black/5">{media(post)}</div>
                                    <div className="flex flex-col gap-3 p-4">
                                        <div className="min-w-0 text-sm">
                                            {place(post)}
                                            <span className="text-muted">
                                                {post.place?.city ? ` · ${post.place.city}` : ""} · {timeAgo(post.created_at)}
                                            </span>
                                            {post.caption && <p className="mt-1.5 text-text-2">« {post.caption} »</p>}
                                        </div>
                                        <div className="flex gap-2">
                                            <button type="button" className="a-btn a-btn-primary h-10 flex-1" disabled={busy !== null} onClick={() => decide(post, "approve")}>
                                                <Check size={15} />
                                                {tr("Publier", "Publish")}
                                            </button>
                                            <button type="button" className="a-btn a-btn-soft h-10" disabled={busy !== null} onClick={() => decide(post, "remove")}>
                                                <Trash2 size={15} />
                                                {tr("Refuser", "Refuse")}
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <Empty title={tr("Rien en attente 🎉", "Nothing waiting 🎉")} body={tr("Les visiteurs peuvent ajouter une photo ou une vidéo depuis la fiche d'un lieu.", "Visitors can add a photo or a video from a place's page.")} />
                    )}

                    {Boolean(data?.shown.length) && (
                        <>
                            <h2 className="a-serif mt-10 mb-3 text-2xl">{tr("Sur le site", "On the site")}</h2>
                            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                                {data?.shown.map((post) => (
                                    <li key={post.id} className="a-card overflow-hidden">
                                        <div className="aspect-square w-full bg-black/5">{media(post)}</div>
                                        <div className="flex flex-col gap-2 p-3 text-xs">
                                            <span className="truncate">{place(post)}</span>
                                            <span className="flex items-center justify-between gap-2 text-muted">
                                                <span className="inline-flex items-center gap-1">
                                                    <Heart size={12} /> {post.likes}
                                                </span>
                                                <button type="button" className="font-semibold text-bad hover:underline" disabled={busy !== null} onClick={() => decide(post, "remove")}>
                                                    {tr("Retirer", "Take down")}
                                                </button>
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </>
            )}
        </>
    );
}
