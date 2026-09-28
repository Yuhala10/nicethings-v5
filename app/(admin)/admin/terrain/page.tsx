"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ImageIcon, LocateFixed, Search } from "lucide-react";
import { Empty, PageHeader, Skeleton, StatusBadge, useAdminToast } from "@/components/admin/ui";
import VerifiedTick from "@/components/place/VerifiedTick";
import { adminGet } from "@/lib/admin-client";
import { CATEGORIES } from "@/lib/tags";

type Result = {
    id: string;
    name: string;
    category: string;
    city: string | null;
    neighborhood: string | null;
    latitude: number | null;
    longitude: number | null;
    status: string;
    verified: boolean;
    photo_count: number;
};

function metres(a: { lat: number; lng: number }, b: { lat: number | null; lng: number | null }) {
    if (b.lat === null || b.lng === null) return null;
    const rad = Math.PI / 180;
    const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
    const y = (b.lat - a.lat) * rad;
    return Math.round(Math.sqrt(x * x + y * y) * 6_371_000);
}

// On site with a phone: the places around you, closest first, one tap to
// the editor (photos, prices, hours, blue tick).
export default function TerrainPage() {
    const toast = useAdminToast();
    const [query, setQuery] = useState("");
    const [rows, setRows] = useState<Result[] | null>(null);
    const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
    const [loading, setLoading] = useState(false);

    const search = useCallback(
        async (params: string) => {
            setLoading(true);
            try {
                const data = await adminGet<{ rows: Result[] }>(`field?${params}`);
                setRows(data.rows);
            } catch (caught) {
                toast((caught as Error).message, true);
            } finally {
                setLoading(false);
            }
        },
        [toast]
    );

    const nearMe = useCallback(() => {
        if (!("geolocation" in navigator)) return;
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const point = { lat: position.coords.latitude, lng: position.coords.longitude };
                setHere(point);
                void search(`lat=${point.lat}&lng=${point.lng}`);
            },
            () => {
                setLoading(false);
                toast("Position indisponible : active la localisation, ou cherche par nom.", true);
            },
            { enableHighAccuracy: true, timeout: 15000 }
        );
    }, [search, toast]);

    // Straight to "around me" when opened.
    useEffect(() => {
        nearMe();
    }, [nearMe]);

    return (
        <>
            <PageHeader title="Terrain" subtitle="Sur place : photos, prix, horaires et coche bleue, lieu par lieu." />
            <form
                className="mb-3 flex gap-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    setHere(null);
                    void search(`q=${encodeURIComponent(query)}`);
                }}
            >
                <div className="relative flex-1">
                    <Search size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
                    <input className="a-input pl-10" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom du lieu…" aria-label="Chercher un lieu" />
                </div>
                <button type="submit" className="a-btn a-btn-dark">Chercher</button>
            </form>
            <button type="button" onClick={nearMe} className="a-btn a-btn-primary mb-5 w-full">
                <LocateFixed size={17} />
                Les lieux autour de moi
            </button>

            {loading ? (
                <div className="flex flex-col gap-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : rows && rows.length === 0 ? (
                <Empty title="Aucun lieu trouvé ici" body="Ajoute-le : il sera placé exactement où tu te trouves." action={<Link href="/admin/spots/new" className="a-btn a-btn-primary">Ajouter un lieu</Link>} />
            ) : (
                <ul className="a-card divide-y divide-line overflow-hidden">
                    {(rows ?? []).map((row) => {
                        const distance = here ? metres(here, { lat: row.latitude, lng: row.longitude }) : null;
                        return (
                            <li key={row.id}>
                                <Link href={`/admin/spots/${row.id}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-soft/60">
                                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${row.photo_count ? "bg-green-50 text-good" : "bg-soft text-muted"}`}>
                                        <ImageIcon size={18} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center gap-1.5">
                                            <span className="truncate font-bold">{row.name}</span>
                                            {row.verified && <VerifiedTick size={15} label="Vérifié" />}
                                        </span>
                                        <span className="block truncate text-xs text-muted">
                                            {[CATEGORIES[row.category as keyof typeof CATEGORIES]?.fr, row.neighborhood, row.city].filter(Boolean).join(" · ")}
                                        </span>
                                    </span>
                                    <span className="flex shrink-0 flex-col items-end gap-1">
                                        {distance !== null && <span className="text-sm font-bold tabular-nums">{distance < 1000 ? `${distance} m` : `${(distance / 1000).toFixed(1)} km`}</span>}
                                        {row.status !== "APPROVED" && <StatusBadge status={row.status} />}
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
