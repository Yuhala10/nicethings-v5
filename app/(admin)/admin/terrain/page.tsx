"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ImageIcon, LocateFixed, Search } from "lucide-react";
import { useAdminLang, useTr } from "@/components/admin/i18n";
import { Empty, PageHeader, Skeleton, StatusBadge, useAdminToast } from "@/components/admin/ui";
import VerifiedTick from "@/components/place/VerifiedTick";
import { adminGet } from "@/lib/admin-client";
import { distanceMeters } from "@/lib/places/geo";
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

// On site with a phone: the places around you, closest first, one tap to
// the editor (photos, prices, hours, blue tick).
export default function TerrainPage() {
    const tr = useTr();
    const { lang } = useAdminLang();
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
                toast(tr("Position indisponible : active la localisation, ou cherche par nom.", "Location unavailable: turn location on, or search by name."), true);
            },
            { enableHighAccuracy: true, timeout: 15000 }
        );
    }, [search, toast, tr]);

    // Straight to "around me" when opened.
    useEffect(() => {
        nearMe();
    }, []);

    return (
        <>
            <PageHeader title={tr("Terrain", "Field kit")} subtitle={tr("Sur place : photos, prix, horaires et coche bleue, lieu par lieu.", "On site: photos, prices, hours and the blue tick, place by place.")} />
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
                    <input
                        className="a-input pl-10"
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={tr("Nom du lieu…", "Place name…")}
                        aria-label={tr("Chercher un lieu", "Search a place")}
                    />
                </div>
                <button type="submit" className="a-btn a-btn-dark">
                    {tr("Chercher", "Search")}
                </button>
            </form>
            <button type="button" onClick={nearMe} className="a-btn a-btn-primary mb-5 w-full">
                <LocateFixed size={17} />
                {tr("Les lieux autour de moi", "Places around me")}
            </button>

            {loading ? (
                <div className="flex flex-col gap-2">
                    {Array.from({ length: 6 }, (_, i) => (
                        <Skeleton key={i} className="h-16" />
                    ))}
                </div>
            ) : rows && rows.length === 0 ? (
                <Empty
                    title={tr("Aucun lieu trouvé ici", "No place found here")}
                    body={tr("Ajoute-le : il sera placé exactement où tu te trouves.", "Add it: it will be placed exactly where you stand.")}
                    action={
                        <Link href="/admin/spots/new" className="a-btn a-btn-primary">
                            {tr("Ajouter un lieu", "Add a place")}
                        </Link>
                    }
                />
            ) : (
                <ul className="a-card divide-y divide-line overflow-hidden">
                    {(rows ?? []).map((row) => {
                        const distance = here && row.latitude !== null && row.longitude !== null ? Math.round(distanceMeters(here, { lat: row.latitude, lng: row.longitude })) : null;
                        return (
                            <li key={row.id}>
                                <Link href={`/admin/spots/${row.id}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-soft/60">
                                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${row.photo_count ? "bg-green-50 text-good" : "bg-soft text-muted"}`}>
                                        <ImageIcon size={18} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center gap-1.5">
                                            <span className="truncate font-bold">{row.name}</span>
                                            {row.verified && <VerifiedTick size={15} label={tr("Vérifié", "Verified")} />}
                                        </span>
                                        <span className="block truncate text-xs text-muted">
                                            {[CATEGORIES[row.category as keyof typeof CATEGORIES]?.[lang], row.neighborhood, row.city].filter(Boolean).join(" · ")}
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
