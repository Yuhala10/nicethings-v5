"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, PenLine, X } from "lucide-react";
import { useTr } from "@/components/admin/i18n";
import { Empty, PageHeader, Skeleton, StatusBadge, timeAgo, useAdminData, useAdminToast } from "@/components/admin/ui";
import { adminPatch } from "@/lib/admin-client";
import { REPORT_REASONS } from "@/lib/admin-labels";

type Report = { id: string; spot_id: string | null; reason: string; description: string | null; status: string; created_at: string };
type Spot = { id: string; name: string; slug: string; city: string | null; neighborhood: string | null; status: string };

// Errors reported by visitors: open the place, fix it, mark it resolved.
export default function ReportsPage() {
    const tr = useTr();
    const toast = useAdminToast();
    const [filter, setFilter] = useState<"PENDING" | "ALL">("PENDING");
    const [busy, setBusy] = useState<string | null>(null);
    const { data, loading, error, reload } = useAdminData<{ rows: Report[]; spots: Spot[] }>("reports");
    const spots = new Map((data?.spots ?? []).map((spot) => [spot.id, spot]));
    const rows = (data?.rows ?? []).filter((row) => filter === "ALL" || row.status === "PENDING");

    const update = async (row: Report, status: "RESOLVED" | "REJECTED") => {
        setBusy(row.id);
        try {
            await adminPatch(`reports/${row.id}`, { status });
            toast(status === "RESOLVED" ? tr("Marqué comme résolu", "Marked as resolved") : tr("Signalement écarté", "Report dismissed"));
            await reload();
        } catch (caught) {
            toast((caught as Error).message, true);
        } finally {
            setBusy(null);
        }
    };

    return (
        <>
            <PageHeader
                title={tr("Signalements", "Reports")}
                subtitle={tr("Les erreurs remontées par les visiteurs. Corrige la fiche, puis marque comme résolu.", "Mistakes reported by visitors. Fix the listing, then mark it resolved.")}
                actions={
                    <div className="flex gap-1.5">
                        <button type="button" className="a-chip" aria-pressed={filter === "PENDING"} onClick={() => setFilter("PENDING")}>
                            {tr("À traiter", "To handle")}
                        </button>
                        <button type="button" className="a-chip" aria-pressed={filter === "ALL"} onClick={() => setFilter("ALL")}>
                            {tr("Tous", "All")}
                        </button>
                    </div>
                }
            />
            {error && <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-bad">{error}</p>}
            {loading && !data ? (
                <div className="flex flex-col gap-2">
                    {Array.from({ length: 5 }, (_, i) => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <Empty title={tr("Aucun signalement à traiter 🎉", "No reports to handle 🎉")} body={tr("Les visiteurs peuvent signaler une erreur depuis chaque fiche.", "Visitors can report a mistake from any place page.")} />
            ) : (
                <ul className="flex flex-col gap-2.5">
                    {rows.map((row) => {
                        const spot = row.spot_id ? spots.get(row.spot_id) : null;
                        return (
                            <li key={row.id} className="a-card flex flex-col gap-3 p-4 md:flex-row md:items-center">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-warn">
                                            {REPORT_REASONS[row.reason] ? tr(...REPORT_REASONS[row.reason]) : row.reason}
                                        </span>
                                        <StatusBadge status={row.status} />
                                        <span className="text-xs text-muted">{timeAgo(row.created_at)}</span>
                                    </div>
                                    <p className="mt-1.5 truncate font-bold">{spot?.name ?? tr("Lieu supprimé", "Deleted place")}</p>
                                    {spot && <p className="text-xs text-muted">{[spot.neighborhood, spot.city].filter(Boolean).join(", ")}</p>}
                                    {row.description && <p className="mt-2 rounded-xl bg-soft px-3 py-2 text-sm text-text-2">« {row.description} »</p>}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {spot && (
                                        <>
                                            <Link href={`/admin/spots/${spot.id}`} className="a-btn a-btn-dark">
                                                <PenLine size={15} />
                                                {tr("Corriger", "Fix")}
                                            </Link>
                                            <a href={`/fr/p/${spot.slug}`} target="_blank" rel="noreferrer" className="a-btn a-btn-soft px-3" aria-label={tr("Voir sur le site", "View on the site")}>
                                                <ExternalLink size={15} />
                                            </a>
                                        </>
                                    )}
                                    {row.status === "PENDING" && (
                                        <>
                                            <button type="button" disabled={busy === row.id} onClick={() => void update(row, "RESOLVED")} className="a-btn bg-green-50 text-good">
                                                <Check size={15} />
                                                {tr("Résolu", "Resolved")}
                                            </button>
                                            <button type="button" disabled={busy === row.id} onClick={() => void update(row, "REJECTED")} className="a-btn a-btn-danger px-3" aria-label={tr("Écarter", "Dismiss")}>
                                                <X size={15} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </>
    );
}
