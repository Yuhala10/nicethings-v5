"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, SearchX } from "lucide-react";
import { useTr } from "@/components/admin/i18n";
import { Empty, PageHeader, Skeleton, formatCount, useAdminData } from "@/components/admin/ui";
import { cityBySlug } from "@/lib/cities";

type Bucket = { query: string; count: number; zero: number; cities: string[] };
type Insights = { total: number; top: Bucket[]; noResults: Bucket[]; perDay: { day: string; count: number }[] };

// What visitors look for. Searches with no result are the to-do list:
// the places people want that NiceThings doesn't have yet.
export default function SearchesPage() {
    const tr = useTr();
    const [days, setDays] = useState(30);
    const { data, loading } = useAdminData<Insights>(`searches?days=${days}`);
    const max = Math.max(1, ...(data?.perDay ?? []).map((day) => day.count));

    const cityNames = (cities: string[]) => cities.map((slug) => cityBySlug(slug)?.name ?? slug).join(", ");

    return (
        <>
            <PageHeader
                title={tr("Recherches", "Searches")}
                subtitle={tr("Ce que les visiteurs tapent dans la recherche (anonyme).", "What visitors type in search (anonymous).")}
                actions={
                    <div className="flex gap-1.5">
                        {[7, 30, 90].map((value) => (
                            <button key={value} type="button" className="a-chip" aria-pressed={days === value} onClick={() => setDays(value)}>
                                {value} {tr("jours", "days")}
                            </button>
                        ))}
                    </div>
                }
            />

            {loading && !data ? (
                <div className="grid gap-4 lg:grid-cols-2">
                    <Skeleton className="h-80" />
                    <Skeleton className="h-80" />
                </div>
            ) : !data || data.total === 0 ? (
                <Empty title={tr("Pas encore de recherches", "No searches yet")} body={tr("Dès que des visiteurs utilisent la recherche, les mots tapés apparaîtront ici.", "As soon as visitors use search, the words they type will appear here.")} />
            ) : (
                <>
                    <section className="a-card mb-4 p-5">
                        <p className="font-display text-3xl font-extrabold">{formatCount(data.total)}</p>
                        <p className="text-sm text-muted">{tr(`recherches sur ${days} jours`, `searches over ${days} days`)}</p>
                        <div className="mt-4 flex h-24 items-end gap-1" aria-hidden>
                            {data.perDay.map((day) => (
                                <div
                                    key={day.day}
                                    title={`${day.day} : ${day.count}`}
                                    className="flex-1 rounded-t bg-gradient-to-t from-[#ff8a1f] to-[#eb3a6f]"
                                    style={{ height: `${(day.count / max) * 100}%`, minHeight: 3 }}
                                />
                            ))}
                        </div>
                    </section>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <section className="a-card p-5">
                            <h2 className="mb-3 text-lg font-extrabold">{tr("Les plus demandées", "Most requested")}</h2>
                            <ol className="divide-y divide-line">
                                {data.top.map((bucket, index) => (
                                    <li key={bucket.query} className="flex items-center gap-3 py-2.5">
                                        <span className="w-6 text-right text-xs font-bold text-muted tabular-nums">{index + 1}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-semibold">« {bucket.query} »</span>
                                            {bucket.cities.length > 0 && <span className="block truncate text-xs text-muted">{cityNames(bucket.cities)}</span>}
                                        </span>
                                        <span className="rounded-full bg-soft px-2.5 py-0.5 text-xs font-bold tabular-nums">{bucket.count}</span>
                                    </li>
                                ))}
                            </ol>
                        </section>

                        <section className="a-card p-5">
                            <h2 className="mb-1 flex items-center gap-2 text-lg font-extrabold">
                                <SearchX size={19} className="text-bad" />
                                {tr("Sans résultat", "No result")}
                            </h2>
                            <p className="mb-3 text-sm text-muted">{tr("Des lieux que les gens cherchent et que NiceThings n'a pas encore.", "Places people look for that NiceThings doesn't have yet.")}</p>
                            {data.noResults.length === 0 ? (
                                <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-good">{tr("Toutes les recherches ont trouvé quelque chose.", "Every search found something.")}</p>
                            ) : (
                                <ul className="divide-y divide-line">
                                    {data.noResults.map((bucket) => (
                                        <li key={bucket.query} className="flex items-center gap-3 py-2.5">
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate font-semibold">« {bucket.query} »</span>
                                                <span className="block text-xs text-muted">
                                                    {tr(`${bucket.zero} fois sans résultat`, `${bucket.zero} time${bucket.zero > 1 ? "s" : ""} without result`)}
                                                    {bucket.cities.length ? ` · ${cityNames(bucket.cities)}` : ""}
                                                </span>
                                            </span>
                                            <Link href="/admin/spots/new" className="a-btn a-btn-soft h-9 px-3 text-xs">
                                                <Plus size={14} />
                                                {tr("Ajouter", "Add")}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>
                </>
            )}
        </>
    );
}
