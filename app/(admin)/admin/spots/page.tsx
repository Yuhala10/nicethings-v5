"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, ChevronLeft, ChevronRight, Download, ImageIcon, Plus, Search, Star } from "lucide-react";
import VerifiedTick from "@/components/place/VerifiedTick";
import { Empty, PageHeader, Skeleton, StatusBadge, timeAgo, useAdminData, useAdminToast } from "@/components/admin/ui";
import { SOURCE_LABELS } from "@/lib/admin-labels";
import { CITIES } from "@/lib/cities";
import { CATEGORIES } from "@/lib/tags";

type Row = {
    id: string;
    slug: string;
    name: string;
    category: string;
    city: string | null;
    neighborhood: string | null;
    status: string;
    verified: boolean;
    featured: boolean;
    minimum_price: number | null;
    maximum_price: number | null;
    opening_time: string | null;
    phone: string | null;
    source: string;
    updated_at: string;
    photo_count: number;
};

const STATUS_FILTERS = [
    ["", "Tous"],
    ["APPROVED", "Publiés"],
    ["DRAFT", "Brouillons"],
    ["CLOSED", "Fermés"],
    ["REJECTED", "Refusés"],
] as const;

const MISSING_FILTERS = [
    ["photo", "Sans photo"],
    ["price", "Sans prix"],
    ["hours", "Sans horaires"],
    ["phone", "Sans téléphone"],
] as const;

// A dot per fact: filled when known. Shows at a glance what a listing lacks.
function Facts({ row }: { row: Row }) {
    const facts = [
        ["Photo", row.photo_count > 0],
        ["Prix", Boolean(row.minimum_price || row.maximum_price)],
        ["Horaires", Boolean(row.opening_time)],
        ["Téléphone", Boolean(row.phone)],
    ] as const;
    return (
        <span className="flex gap-1" aria-label={facts.map(([label, ok]) => `${label} ${ok ? "oui" : "non"}`).join(", ")}>
            {facts.map(([label, ok]) => (
                <span key={label} title={label} className={`h-2 w-2 rounded-full ${ok ? "bg-good" : "bg-line-strong"}`} />
            ))}
        </span>
    );
}

function PlacesList() {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const toast = useAdminToast();

    const q = params.get("q") ?? "";
    const [text, setText] = useState(q);
    const [selected, setSelected] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);

    const setParam = (changes: Record<string, string | null>) => {
        const next = new URLSearchParams(params.toString());
        for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
        }
        if (!("page" in changes)) next.delete("page");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    };

    // Search as you type (debounced).
    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (text !== q) setParam({ q: text || null });
        }, 350);
        return () => window.clearTimeout(timer);
         
    }, [text]);

    const query = params.toString();
    const { data, loading, error, reload } = useAdminData<{ rows: Row[]; total: number; pageSize: number }>(`places${query ? `?${query}` : ""}`);
    const page = Number(params.get("page")) || 0;
    const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

     
    useEffect(() => setSelected([]), [query]);

    const allSelected = useMemo(() => Boolean(data?.rows.length) && data!.rows.every((row) => selected.includes(row.id)), [data, selected]);

    const bulk = async (changes: Record<string, unknown>, label: string) => {
        setBusy(true);
        try {
            const response = await fetch("/api/admin/places", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selected, changes }),
            });
            const body = await response.json().catch(() => null);
            if (!response.ok || !body?.ok) throw new Error(body?.message ?? "Échec.");
            toast(`${body.updated} lieu${body.updated > 1 ? "x" : ""} : ${label}`);
            setSelected([]);
            await reload();
        } catch (caught) {
            toast((caught as Error).message, true);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <PageHeader
                title="Lieux"
                subtitle={data ? `${data.total.toLocaleString("fr-FR")} lieux correspondent` : "Chargement…"}
                actions={
                    <>
                        { }
                        <a href="/api/admin/places/export" download className="a-btn a-btn-soft">
                            <Download size={16} />
                            CSV
                        </a>
                        <Link href="/admin/spots/new" className="a-btn a-btn-primary">
                            <Plus size={17} />
                            Ajouter
                        </Link>
                    </>
                }
            />

            {/* Filters */}
            <div className="a-card mb-4 p-3">
                <div className="flex flex-wrap gap-2">
                    <div className="relative min-w-[200px] flex-1">
                        <Search size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
                        <input
                            className="a-input pl-10"
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            placeholder="Nom ou quartier…"
                            type="search"
                            aria-label="Chercher un lieu"
                        />
                    </div>
                    <select className="a-input w-auto min-w-[150px]" value={params.get("city") ?? ""} onChange={(event) => setParam({ city: event.target.value || null })} aria-label="Ville">
                        <option value="">Toutes les villes</option>
                        {CITIES.map((city) => (
                            <option key={city.slug} value={city.slug}>
                                {city.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {STATUS_FILTERS.map(([value, label]) => (
                        <button key={label} type="button" className="a-chip" aria-pressed={(params.get("status") ?? "") === value} onClick={() => setParam({ status: value || null })}>
                            {label}
                        </button>
                    ))}
                    <span className="mx-1 w-px self-stretch bg-line" />
                    {MISSING_FILTERS.map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            className="a-chip"
                            aria-pressed={params.get("missing") === value}
                            onClick={() => setParam({ missing: params.get("missing") === value ? null : value })}
                        >
                            {label}
                        </button>
                    ))}
                    <button type="button" className="a-chip" aria-pressed={params.get("featured") === "1"} onClick={() => setParam({ featured: params.get("featured") === "1" ? null : "1" })}>
                        <Star size={13} /> Coups de cœur
                    </button>
                </div>
            </div>

            {/* Bulk actions */}
            {selected.length > 0 && (
                <div className="sticky top-16 z-30 mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-ink p-2.5 pl-4 text-white shadow-lg md:top-3">
                    <span className="mr-auto text-sm font-bold">{selected.length} sélectionné(s)</span>
                    <button type="button" disabled={busy} onClick={() => bulk({ status: "APPROVED" }, "publié")} className="a-btn h-9 bg-white/10 text-white">
                        Publier
                    </button>
                    <button type="button" disabled={busy} onClick={() => bulk({ status: "DRAFT" }, "dépublié")} className="a-btn h-9 bg-white/10 text-white">
                        Dépublier
                    </button>
                    <button type="button" disabled={busy} onClick={() => bulk({ verified: true }, "vérifié")} className="a-btn h-9 bg-white/10 text-white">
                        <BadgeCheck size={15} /> Vérifié
                    </button>
                    <button type="button" disabled={busy} onClick={() => bulk({ featured: true }, "coup de cœur")} className="a-btn h-9 bg-white/10 text-white">
                        <Star size={15} /> Coup de cœur
                    </button>
                    <button type="button" onClick={() => setSelected([])} className="a-btn h-9 text-white/70">
                        Annuler
                    </button>
                </div>
            )}

            {error && <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-bad">{error}</p>}

            {loading && !data ? (
                <div className="flex flex-col gap-2">
                    {Array.from({ length: 8 }, (_, index) => (
                        <Skeleton key={index} className="h-16" />
                    ))}
                </div>
            ) : data && data.rows.length === 0 ? (
                <Empty title="Aucun lieu" body="Change les filtres, ou ajoute le lieu toi-même." action={<Link href="/admin/spots/new" className="a-btn a-btn-primary">Ajouter un lieu</Link>} />
            ) : (
                <div className={`a-card overflow-hidden transition-opacity ${loading ? "opacity-60" : ""}`}>
                    <div className="flex items-center gap-3 border-b border-line px-4 py-2.5 text-xs font-bold text-muted">
                        <input
                            type="checkbox"
                            className="h-4 w-4 accent-[#ff5b36]"
                            checked={allSelected}
                            onChange={() => setSelected(allSelected ? [] : (data?.rows ?? []).map((row) => row.id))}
                            aria-label="Tout sélectionner"
                        />
                        <span className="flex-1">Lieu</span>
                        <span className="hidden w-28 md:block">Infos</span>
                        <span className="hidden w-24 md:block">Statut</span>
                        <span className="hidden w-24 text-right md:block">Modifié</span>
                    </div>
                    <ul className="divide-y divide-line">
                        {(data?.rows ?? []).map((row) => (
                            <li key={row.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-soft/60">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 shrink-0 accent-[#ff5b36]"
                                    checked={selected.includes(row.id)}
                                    onChange={() => setSelected((current) => (current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id]))}
                                    aria-label={`Sélectionner ${row.name}`}
                                />
                                <Link href={`/admin/spots/${row.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${row.photo_count ? "bg-green-50 text-good" : "bg-soft text-muted"}`}>
                                        <ImageIcon size={17} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center gap-1.5">
                                            <span className="truncate font-bold">{row.name}</span>
                                            {row.verified && <VerifiedTick size={16} label="Vérifié" />}
                                            {row.featured && <Star size={14} className="shrink-0 fill-amber-400 text-amber-400" />}
                                        </span>
                                        <span className="block truncate text-xs text-muted">
                                            {[CATEGORIES[row.category as keyof typeof CATEGORIES]?.fr ?? row.category, row.neighborhood, row.city, SOURCE_LABELS[row.source]].filter(Boolean).join(" · ")}
                                        </span>
                                        <span className="mt-1 flex items-center gap-2 md:hidden">
                                            <StatusBadge status={row.status} />
                                            <Facts row={row} />
                                        </span>
                                    </span>
                                    <span className="hidden w-28 md:block">
                                        <Facts row={row} />
                                    </span>
                                    <span className="hidden w-24 md:block">
                                        <StatusBadge status={row.status} />
                                    </span>
                                    <span className="hidden w-24 text-right text-xs text-muted md:block">{timeAgo(row.updated_at)}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {data && pages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                    <button type="button" className="a-btn a-btn-soft h-10 w-10 px-0" disabled={page === 0} onClick={() => setParam({ page: String(page - 1) })} aria-label="Page précédente">
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-sm font-bold tabular-nums">
                        {page + 1} / {pages}
                    </span>
                    <button type="button" className="a-btn a-btn-soft h-10 w-10 px-0" disabled={page + 1 >= pages} onClick={() => setParam({ page: String(page + 1) })} aria-label="Page suivante">
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}
        </>
    );
}

export default function PlacesPage() {
    return (
        <Suspense>
            <PlacesList />
        </Suspense>
    );
}
