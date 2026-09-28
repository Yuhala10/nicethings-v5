"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MapPin, Phone, X } from "lucide-react";
import { Empty, PageHeader, Skeleton, StatusBadge, timeAgo, useAdminData, useAdminToast } from "@/components/admin/ui";
import { adminPatch, adminPost } from "@/lib/admin-client";
import { CATEGORIES } from "@/lib/tags";

type Submission = {
    id: string;
    name: string;
    category: string | null;
    city: string | null;
    neighborhood: string | null;
    landmark: string | null;
    phone: string | null;
    description: string | null;
    latitude: number | null;
    longitude: number | null;
    status: string;
    created_at: string;
};

// Places suggested by visitors: turn one into a real listing in one tap.
export default function SubmissionsPage() {
    const router = useRouter();
    const toast = useAdminToast();
    const [filter, setFilter] = useState<"PENDING" | "ALL">("PENDING");
    const [busy, setBusy] = useState<string | null>(null);
    const { data, loading, error, reload } = useAdminData<{ rows: Submission[] }>("submissions");
    const rows = (data?.rows ?? []).filter((row) => filter === "ALL" || row.status === "PENDING");

    const convert = async (row: Submission, publish: boolean) => {
        setBusy(row.id);
        try {
            const result = await adminPost<{ row: { id: string } }>(`submissions/${row.id}/convert`, { publish });
            toast(publish ? "Lieu créé et publié" : "Lieu créé en brouillon");
            router.push(`/admin/spots/${result.row.id}`);
        } catch (caught) {
            toast((caught as Error).message, true);
            setBusy(null);
        }
    };

    const reject = async (row: Submission) => {
        setBusy(row.id);
        try {
            await adminPatch(`submissions/${row.id}`, { status: "REJECTED" });
            toast("Proposition refusée");
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
                title="Propositions"
                subtitle="Des lieux signalés par les visiteurs. Vérifie, puis crée la fiche en un geste."
                actions={
                    <div className="flex gap-1.5">
                        <button type="button" className="a-chip" aria-pressed={filter === "PENDING"} onClick={() => setFilter("PENDING")}>À traiter</button>
                        <button type="button" className="a-chip" aria-pressed={filter === "ALL"} onClick={() => setFilter("ALL")}>Toutes</button>
                    </div>
                }
            />
            {error && <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-bad">{error}</p>}
            {loading && !data ? (
                <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-48" />)}</div>
            ) : rows.length === 0 ? (
                <Empty title="Rien à traiter 🎉" body="Quand un visiteur propose un lieu depuis le site, il arrive ici." />
            ) : (
                <ul className="grid gap-3 md:grid-cols-2">
                    {rows.map((row) => (
                        <li key={row.id} className="a-card flex flex-col p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="truncate text-lg font-extrabold">{row.name}</h2>
                                    <p className="text-sm text-muted">
                                        {[CATEGORIES[row.category as keyof typeof CATEGORIES]?.fr, row.neighborhood, row.city].filter(Boolean).join(" · ") || "Type non précisé"}
                                    </p>
                                </div>
                                <StatusBadge status={row.status} />
                            </div>
                            <dl className="mt-3 grid gap-1.5 text-sm">
                                {row.landmark && <div className="flex gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-muted" /><span>{row.landmark}</span></div>}
                                {row.phone && <div className="flex gap-2"><Phone size={15} className="mt-0.5 shrink-0 text-muted" /><a href={`tel:${row.phone}`} className="font-semibold">{row.phone}</a></div>}
                                {row.description && <p className="mt-1 rounded-xl bg-soft px-3 py-2 whitespace-pre-line text-text-2">{row.description}</p>}
                            </dl>
                            <p className="mt-3 text-xs text-muted">
                                Reçue {timeAgo(row.created_at)}
                                {row.latitude !== null && row.longitude !== null ? (
                                    <>
                                        {" · "}
                                        <a href={`https://www.openstreetmap.org/?mlat=${row.latitude}&mlon=${row.longitude}#map=18/${row.latitude}/${row.longitude}`} target="_blank" rel="noreferrer" className="font-bold text-brand-600">
                                            Position envoyée ✓
                                        </a>
                                    </>
                                ) : (
                                    " · Sans position"
                                )}
                            </p>
                            {row.status === "PENDING" && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button type="button" disabled={busy === row.id} onClick={() => void convert(row, row.latitude !== null)} className="a-btn a-btn-primary flex-1">
                                        <Check size={16} />
                                        {row.latitude !== null ? "Créer et publier" : "Créer la fiche"}
                                    </button>
                                    <button type="button" disabled={busy === row.id} onClick={() => void reject(row)} className="a-btn a-btn-danger">
                                        <X size={16} />
                                        Refuser
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}
