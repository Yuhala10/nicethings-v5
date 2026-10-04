"use client";

import Link from "next/link";
import { BadgeCheck, Camera, Download, Flag, ImageIcon, Inbox, MapPin, Plus, Repeat2, Search, Star, Users } from "lucide-react";
import { useTr } from "@/components/admin/i18n";
import { Bar, Empty, PageHeader, Skeleton, Stat, formatCount, timeAgo, useAdminData } from "@/components/admin/ui";
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
        visitors7d: number | null;
        returned7d: number | null;
    };
    cities: { city: string; published: number; photos: number; hours: number; prices: number; phones: number; verified: number }[];
    recentSubmissions: { id: string; name: string; city: string | null; neighborhood: string | null; category: string | null; created_at: string }[];
    recentReports: { id: string; reason: string; description: string | null; created_at: string; spot: { id: string; name: string } | null }[];
};

const number = formatCount;

export default function DashboardPage() {
    const tr = useTr();
    const { data, error, loading } = useAdminData<Overview>("dashboard");
    const hour = new Date().getHours();
    const hello = hour < 12 ? tr("Bonjour", "Good morning") : hour < 18 ? tr("Bon après-midi", "Good afternoon") : tr("Bonsoir", "Good evening");

    return (
        <>
            <PageHeader
                title={`${hello} 👋`}
                subtitle={tr("Voici l'état de NiceThings aujourd'hui.", "Here's how NiceThings is doing today.")}
                actions={
                    <>
                        <Link href="/admin/spots/new" className="a-btn a-btn-primary">
                            <Plus size={17} />
                            {tr("Ajouter un lieu", "Add a place")}
                        </Link>
                        <Link href="/admin/terrain" className="a-btn a-btn-dark">
                            <Camera size={17} />
                            {tr("Terrain", "Field kit")}
                        </Link>
                    </>
                }
            />

            {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-bad">{error}</p>}

            {/* This week's audience: the first thing worth knowing. */}
            {data && data.totals.visitors7d !== null && (
                <section className="mb-3 grid grid-cols-2 gap-3">
                    <Stat icon={Users} label={tr("Visiteurs (7 jours)", "Visitors (7 days)")} value={number(data.totals.visitors7d)} tone="brand" href="/admin/audience" />
                    <Stat
                        icon={Repeat2}
                        label={tr("Sont revenus", "Came back")}
                        value={number(data.totals.returned7d ?? 0)}
                        hint={data.totals.visitors7d ? tr(`${Math.round(((data.totals.returned7d ?? 0) / data.totals.visitors7d) * 100)}% des visiteurs`, `${Math.round(((data.totals.returned7d ?? 0) / data.totals.visitors7d) * 100)}% of visitors`) : undefined}
                        tone="good"
                        href="/admin/audience"
                    />
                </section>
            )}

            {/* Headline numbers */}
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {loading && !data
                    ? Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-[8.5rem]" />)
                    : data && (
                          <>
                              <Stat icon={MapPin} label={tr("Lieux publiés", "Published places")} value={number(data.totals.published)} hint={tr(`${number(data.totals.drafts)} brouillons`, `${number(data.totals.drafts)} drafts`)} tone="brand" href="/admin/spots?status=APPROVED" />
                              <Stat icon={Inbox} label={tr("Propositions à traiter", "Suggestions to review")} value={data.totals.pendingSubmissions} tone={data.totals.pendingSubmissions ? "warn" : "neutral"} href="/admin/submissions" />
                              <Stat icon={Flag} label={tr("Signalements à traiter", "Reports to handle")} value={data.totals.pendingReports} tone={data.totals.pendingReports ? "warn" : "neutral"} href="/admin/reports" />
                              <Stat icon={Search} label={tr("Recherches (7 jours)", "Searches (7 days)")} value={number(data.totals.searches7d)} href="/admin/recherches" />
                              <Stat
                                  icon={ImageIcon}
                                  label={tr("Avec photo", "With a photo")}
                                  value={number(data.totals.withPhotos)}
                                  hint={tr(
                                      `${data.totals.published ? Math.round((data.totals.withPhotos / data.totals.published) * 100) : 0}% des lieux publiés`,
                                      `${data.totals.published ? Math.round((data.totals.withPhotos / data.totals.published) * 100) : 0}% of published places`
                                  )}
                                  href="/admin/spots?status=APPROVED&missing=photo"
                              />
                              <Stat icon={BadgeCheck} label={tr("Vérifiés sur place", "Verified on site")} value={number(data.totals.verified)} tone="good" />
                              <Stat icon={Star} label={tr("Coups de cœur", "Featured")} value={data.totals.featured} href="/admin/spots?featured=1" />
                              { }
                              <a href="/api/admin/places/export" download className="a-card flex flex-col justify-between p-4 transition hover:border-line-strong">
                                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-soft">
                                      <Download size={19} />
                                  </span>
                                  <span>
                                      <span className="mt-3 block font-bold">{tr("Exporter en CSV", "Export as CSV")}</span>
                                      <span className="text-xs text-muted">{tr("Tout le catalogue, pour Excel", "The whole catalogue, for Excel")}</span>
                                  </span>
                              </a>
                          </>
                      )}
            </section>

            {/* Completeness by city */}
            <section className="a-card mt-6 overflow-hidden">
                <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line px-5 py-4">
                    <div>
                        <h2 className="text-lg font-extrabold">{tr("Qualité des fiches par ville", "Listing quality by city")}</h2>
                        <p className="text-sm text-muted">{tr("Ce qui manque le plus : c'est là que le travail de terrain rapporte.", "What's missing most: that's where field work pays off.")}</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                        <thead>
                            <tr className="text-left text-xs text-muted">
                                <th className="px-5 py-3 font-bold">{tr("Ville", "City")}</th>
                                <th className="px-3 py-3 text-right font-bold">{tr("Lieux", "Places")}</th>
                                <th className="px-3 py-3 font-bold">{tr("Photos", "Photos")}</th>
                                <th className="px-3 py-3 font-bold">{tr("Horaires", "Hours")}</th>
                                <th className="px-3 py-3 font-bold">{tr("Prix", "Prices")}</th>
                                <th className="px-3 py-3 font-bold">{tr("Vérifiés", "Verified")}</th>
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
                        <h2 className="text-lg font-extrabold">{tr("Propositions récentes", "Recent suggestions")}</h2>
                        <Link href="/admin/submissions" className="text-sm font-bold text-brand-600">
                            {tr("Tout voir", "See all")}
                        </Link>
                    </div>
                    {data && data.recentSubmissions.length === 0 ? (
                        <Empty title={tr("Rien à traiter", "Nothing to review")} body={tr("Les lieux proposés par les visiteurs apparaîtront ici.", "Places suggested by visitors will appear here.")} />
                    ) : (
                        <ul className="divide-y divide-line">
                            {(data?.recentSubmissions ?? []).map((item) => (
                                <li key={item.id}>
                                    <Link href="/admin/submissions" className="flex items-center justify-between gap-3 py-3">
                                        <span className="min-w-0">
                                            <span className="block truncate font-bold">{item.name}</span>
                                            <span className="block truncate text-xs text-muted">
                                                {[CATEGORIES[item.category as keyof typeof CATEGORIES]?.[tr("fr", "en") as "fr" | "en"], item.neighborhood, item.city].filter(Boolean).join(" · ")}
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
                        <h2 className="text-lg font-extrabold">{tr("Signalements récents", "Recent reports")}</h2>
                        <Link href="/admin/reports" className="text-sm font-bold text-brand-600">
                            {tr("Tout voir", "See all")}
                        </Link>
                    </div>
                    {data && data.recentReports.length === 0 ? (
                        <Empty title={tr("Aucun signalement", "No reports")} body={tr("Quand un visiteur signale une erreur, elle arrive ici.", "When a visitor reports a mistake, it lands here.")} />
                    ) : (
                        <ul className="divide-y divide-line">
                            {(data?.recentReports ?? []).map((item) => (
                                <li key={item.id}>
                                    <Link href={item.spot ? `/admin/spots/${item.spot.id}` : "/admin/reports"} className="flex items-center justify-between gap-3 py-3">
                                        <span className="min-w-0">
                                            <span className="block truncate font-bold">{item.spot?.name ?? tr("Lieu supprimé", "Deleted place")}</span>
                                            <span className="block truncate text-xs text-muted">
                                                {REPORT_REASONS[item.reason] ? tr(...REPORT_REASONS[item.reason]) : item.reason}
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
