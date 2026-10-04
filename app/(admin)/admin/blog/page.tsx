"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Database, MapPin, Newspaper, PenLine, Plus, Star } from "lucide-react";
import { useAdminLang, useTr } from "@/components/admin/i18n";
import { Empty, PageHeader, Skeleton, timeAgo, useAdminData, useAdminToast } from "@/components/admin/ui";
import { adminPost } from "@/lib/admin-client";
import { TOPICS, isTopic } from "@/lib/blog/topics";
import { cityBySlug } from "@/lib/cities";

type Row = {
    id: string;
    slug: string;
    status: "DRAFT" | "PUBLISHED";
    title_fr: string;
    title_en: string | null;
    cover_url: string | null;
    topic: string;
    city: string | null;
    featured: boolean;
    places: string[];
    reading_minutes: number;
    published_at: string | null;
    updated_at: string;
};

function state(row: Row) {
    if (row.status !== "PUBLISHED") return ["Brouillon", "Draft", "bg-soft text-text-2"] as const;
    if (row.published_at && new Date(row.published_at) > new Date()) return ["Programmé", "Scheduled", "bg-amber-50 text-warn"] as const;
    return ["Publié", "Published", "bg-green-50 text-good"] as const;
}

// The team's articles: drafts, scheduled and published.
export default function BlogAdminPage() {
    const tr = useTr();
    const { lang } = useAdminLang();
    const router = useRouter();
    const toast = useAdminToast();
    const { data, loading } = useAdminData<{ rows: Row[]; setup?: boolean }>("posts");
    const [creating, setCreating] = useState(false);

    const create = async () => {
        setCreating(true);
        try {
            const { id } = await adminPost<{ id: string }>("posts", { title: tr("Nouvel article", "New article") });
            router.push(`/admin/blog/${id}`);
        } catch (error) {
            toast((error as Error).message, true);
            setCreating(false);
        }
    };

    return (
        <>
            <PageHeader
                title="Blog"
                subtitle={tr("Guides, sélections et actus. Chaque article peut montrer des lieux en direct et leur carte.", "Guides, picks and news. Each article can show live places and their map.")}
                actions={
                    !data?.setup && (
                        <button type="button" onClick={create} disabled={creating} className="a-btn a-btn-primary">
                            <Plus size={17} />
                            {creating ? tr("Création…", "Creating…") : tr("Nouvel article", "New article")}
                        </button>
                    )
                }
            />

            {loading && !data ? (
                <div className="grid gap-3">
                    {Array.from({ length: 4 }, (_, index) => (
                        <Skeleton key={index} className="h-24" />
                    ))}
                </div>
            ) : data?.setup ? (
                <div className="a-card flex flex-col items-center px-6 py-12 text-center">
                    <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
                        <Database size={22} />
                    </span>
                    <p className="font-bold">{tr("Une dernière étape pour activer le blog", "One last step to switch on the blog")}</p>
                    <p className="mt-2 max-w-md text-sm text-text-2">
                        {tr("Dans Supabase, ouvre « SQL Editor », colle tout le fichier", "In Supabase, open “SQL Editor”, paste the whole file")}{" "}
                        <span className="font-mono text-xs font-bold">database/migrations/003_blog_and_claims.sql</span> {tr("et clique sur « Run ».", "and click “Run”.")}
                    </p>
                </div>
            ) : !data?.rows.length ? (
                <Empty
                    title={tr("Aucun article pour l'instant", "No articles yet")}
                    body={tr(
                        "Commence par un guide de quartier ou une sélection (« 7 petits-déj à Bastos ») : c'est ce que les gens partagent sur WhatsApp.",
                        "Start with a neighbourhood guide or a pick list (“7 breakfasts in Bastos”): that's what people share on WhatsApp."
                    )}
                    action={
                        <button type="button" onClick={create} disabled={creating} className="a-btn a-btn-primary">
                            <PenLine size={17} />
                            {tr("Écrire le premier article", "Write the first article")}
                        </button>
                    }
                />
            ) : (
                <ul className="grid gap-3">
                    {data.rows.map((row) => {
                        const [fr, en, style] = state(row);
                        return (
                            <li key={row.id}>
                                <Link href={`/admin/blog/${row.id}`} className="a-card flex items-center gap-4 p-3 transition hover:border-line-strong hover:shadow-sm">
                                    {row.cover_url ? (
                                        <img src={row.cover_url} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover" />
                                    ) : (
                                        <span className="grid h-20 w-24 shrink-0 place-items-center rounded-xl bg-soft text-muted">
                                            <Newspaper size={22} />
                                        </span>
                                    )}
                                    <span className="min-w-0 flex-1">
                                        <span className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${style}`}>{tr(fr, en)}</span>
                                            <span className="text-xs font-bold" style={{ color: isTopic(row.topic) ? TOPICS[row.topic].tone : undefined }}>
                                                {isTopic(row.topic) ? TOPICS[row.topic][lang] : row.topic}
                                            </span>
                                            {row.featured && <Star size={13} className="fill-brand-500 text-brand-500" />}
                                            {row.title_en && <span className="rounded bg-soft px-1.5 text-[0.65rem] font-bold text-text-2">EN</span>}
                                        </span>
                                        <span className="mt-1 block truncate font-bold">{row.title_fr}</span>
                                        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                                            <span>{row.reading_minutes} min</span>
                                            <span className="inline-flex items-center gap-1">
                                                <MapPin size={12} />
                                                {tr(`${row.places.length} lieu${row.places.length > 1 ? "x" : ""}`, `${row.places.length} place${row.places.length > 1 ? "s" : ""}`)}
                                            </span>
                                            {row.city && <span>{cityBySlug(row.city)?.name}</span>}
                                            <span>
                                                {tr("modifié", "edited")} {timeAgo(row.updated_at)}
                                            </span>
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </>
    );
}
