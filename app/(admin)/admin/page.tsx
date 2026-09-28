"use client";

import Link from "next/link";
import { BadgeCheck, Camera, Download, Flag, ImageIcon, Inbox, MapPin, Plus, Search, Star } from "lucide-react";
import { Bar, Empty, PageHeader, Skeleton, Stat, timeAgo, useAdminData } from "@/components/admin/ui";
import { REPORT_REASONS } from "@/lib/admin-labels";
import { cityByName } from "@/lib/cities";
import { CATEGORIES } from "@/lib/tags";

type Overview = {
    totals: {
        published: number;
        drafts: number;
        verified: number;
        featured: number;
        withPhotos: number;
        pendingSubmissions: number;
        pendingReports: number;
        searches7d: number;
    };
    cities: { city: string; published: number; photos: number; hours: number; prices: number; phones: number; verified: number }[];
    recentSubmissions: { id: string; name: string; city: string | null; neighborhood: string | null; category: string | null; created_at: string }[];
    recentReports: { id: string; reason: string; description: string | null; created_at: string; spot: { id: string; name: string } | null }[];
};

const number = (value: number) => value.toLocaleString("fr-FR");

export default function DashboardPage() {
    const { data, error, loading } = useAdminData<Overview>("dashboard");
    const hour = new Date().getHours();
    const hello = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

    return (
        <>
            <PageHeader
                title={`${hello} 👋`}
                subtitle="Voici l'état de NiceThings aujourd'hui."
                actions={
                    <>
                        <Link href="/admin/spots/new" className="a-btn a-btn-primary">
                            <Plus size={17} />
                            Ajouter un lieu
                        </Link>
                        <Link href="/admin/terrain" className="a-btn a-btn-dark">
                            <Camera size={17} />
                            Terrain
                        </Link>
                    </>
                }
            />

            {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-bad">{error}</p>}

            {/* Headline numbers */}
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {loading && !data
                    ? Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-[8.5rem]" />)
                    : data && (
                          <>
                              <Stat icon={MapPin} label="Lieux publiés" value={number(data.totals.published)} hint={`${number(data.totals.drafts)} brouillons`} tone="brand" href="/admin/spots?status=APPROVED" />
                              <Stat icon={Inbox} label="Propositions à traiter" value={data.totals.pendingSubmissions} tone={data.totals.pendingSubmissions ? "warn" : "neutral"} href="/admin/submissions" />
                              <Stat icon={Flag} label="Signalements à traiter" value={data.totals.pendingReports} tone={data.totals.pendingReports ? "warn" : "neutral"} href="/admin/reports" />
                              <Stat icon={Search} label="Recherches (7 jours)" value={number(data.totals.searches7d)} href="/admin/recherches" />
                              <Stat
                                  icon={ImageIcon}
                                  label="Avec photo"
                                  value={number(data.totals.withPhotos)}
                                  hint={`${data.totals.published ? Math.round((data.totals.withPhotos / data.totals.published) * 100) : 0}% des lieux publiés`}
                                  href="/admin/spots?status=APPROVED&missing=photo"
                              />
                              <Stat icon={BadgeCheck} label="Vérifiés sur place" value={number(data.totals.verified)} tone="good" />
                              <Stat icon={Star} label="Coups de cœur" value={data.totals.featured} href="/admin/spots?featured=1" />
                              { }
                              <a href="/api/admin/places/export" download className="a-card flex flex-col justify-between p-4 transition hover:border-line-strong">
                                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-soft">
                                      <Download size={19} />
                                  </span>
                                  <span>
                                      <span className="mt-3 block font-bold">Exporter en CSV</span>
                                      <span className="text-xs text-muted">Tout le catalogue, pour Excel</span>
                                  </span>
                              </a>
                          </>
                      )}
            </section>

            {/* Completeness by city */}
            <section className="a-card mt-6 overflow-hidden">
                <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line px-5 py-4">
                    <div>
                        <h2 className="text-lg font-extrabold">Qualité des fiches par ville</h2>
                        <p className="text-sm text-muted">Ce qui manque le plus : c&apos;est là que le travail de terrain rapporte.</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                        <thead>
                            <tr className="text-left text-xs text-muted">
                                <th className="px-5 py-3 font-bold">Ville</th>
                                <th className="px-3 py-3 text-right font-bold">Lieux</th>
                                <th className="px-3 py-3 font-bold">Photos</th>
                                <th className="px-3 py-3 font-bold">Horaires</th>
                                <th className="px-3 py-3 font-bold">Prix</th>
                                <th className="px-3 py-3 font-bold">Vérifiés</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.cities ?? []).map((row) => {
                                const slug = cityByName(row.city)?.slug ?? "";
                                return (
                                    <tr key={row.city} className="border-t border-line">
                                        <td className="px-5 py-3 font-bold">
                                            <Link href={`/admin/spots?city=${slug}`} className="hover:text-brand-600">
                                                {row.city}
                                            </Link>
                                        </td>
                                        <td className="px-3 py-3 text-right font-semibold tabular-nums">{number(row.published)}</td>
                                        <td className="w-[18%] px-3 py-3">
                                            <Link href={`/admin/spots?city=${slug}&missing=photo&status=APPROVED`}>
                                                <Bar value={row.photos} total={row.published} />
                                            </Link>
                                        </td>
                                        <td className="w-[18%] px-3 py-3">
                                            <Link href={`/admin/spots?city=${slug}&missing=hours&status=APPROVED`}>
                                                <Bar value={row.hours} total={row.published} tone="#0891b2" />
                                            </Link>
                                        </td>
                                        <td className="w-[18%] px-3 py-3">
                                            <Link href={`/admin/spots?city=${slug}&missing=price&status=APPROVED`}>
                                                <Bar value={row.prices} total={row.published} tone="#7c3aed" />
                                            </Link>
                                        </td>
                                        <td className="w-[18%] px-3 py-3">
                                            <Bar value={row.verified} total={row.published} tone="#15803d" />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Waiting lists */}
            <section className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="a-card p-5">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-lg font-extrabold">Propositions récentes</h2>
                        <Link href="/admin/submissions" className="text-sm font-bold text-brand-600">
                            Tout voir
                        </Link>
                    </div>
                    {data && data.recentSubmissions.length === 0 ? (
                        <Empty title="Rien à traiter" body="Les lieux proposés par les visiteurs apparaîtront ici." />
                    ) : (
                        <ul className="divide-y divide-line">
                            {(data?.recentSubmissions ?? []).map((item) => (
                                <li key={item.id}>
                                    <Link href="/admin/submissions" className="flex items-center justify-between gap-3 py-3">
                                        <span className="min-w-0">
                                            <span className="block truncate font-bold">{item.name}</span>
                                            <span className="block truncate text-xs text-muted">
                                                {[CATEGORIES[item.category as keyof typeof CATEGORIES]?.fr, item.neighborhood, item.city].filter(Boolean).join(" · ")}
                                            </span>
                                        </span>
                                        <span className="shrink-0 text-xs text-muted">{timeAgo(item.created_at)}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="a-card p-5">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-lg font-extrabold">Signalements récents</h2>
                        <Link href="/admin/reports" className="text-sm font-bold text-brand-600">
                            Tout voir
                        </Link>
                    </div>
                    {data && data.recentReports.length === 0 ? (
                        <Empty title="Aucun signalement" body="Quand un visiteur signale une erreur, elle arrive ici." />
                    ) : (
                        <ul className="divide-y divide-line">
                            {(data?.recentReports ?? []).map((item) => (
                                <li key={item.id}>
                                    <Link href={item.spot ? `/admin/spots/${item.spot.id}` : "/admin/reports"} className="flex items-center justify-between gap-3 py-3">
                                        <span className="min-w-0">
                                            <span className="block truncate font-bold">{item.spot?.name ?? "Lieu supprimé"}</span>
                                            <span className="block truncate text-xs text-muted">
                                                {REPORT_REASONS[item.reason] ?? item.reason}
                                                {item.description ? ` · ${item.description}` : ""}
                                            </span>
                                        </span>
                                        <span className="shrink-0 text-xs text-muted">{timeAgo(item.created_at)}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>
        </>
    );
}
