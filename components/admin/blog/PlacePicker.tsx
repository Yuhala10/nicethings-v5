"use client";

import { useEffect, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { adminGet } from "@/lib/admin-client";
import { useTr } from "../i18n";

export type PickedPlace = { slug: string; name: string; city: string | null; neighborhood: string | null };

// Finds a published place by name or neighbourhood, for article blocks.
export default function PlacePicker({ onPick, exclude = [] }: { onPick: (place: PickedPlace) => void; exclude?: string[] }) {
    const tr = useTr();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<PickedPlace[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setResults([]);
            return;
        }
        setLoading(true);
        const timer = window.setTimeout(() => {
            adminGet<{ rows: PickedPlace[] }>(`places?status=APPROVED&q=${encodeURIComponent(q)}`)
                .then((data) => setResults(data.rows.filter((row) => !exclude.includes(row.slug)).slice(0, 8)))
                .catch(() => setResults([]))
                .finally(() => setLoading(false));
        }, 250);
        return () => window.clearTimeout(timer);
    }, [query]);

    return (
        <div className="relative">
            <Search size={16} className="pointer-events-none absolute top-3.5 left-3 text-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr("Chercher un lieu publié (nom ou quartier)…", "Search a published place (name or neighbourhood)…")} className="a-input pl-9" />
            {query && (
                <button type="button" onClick={() => setQuery("")} className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-full text-muted" aria-label={tr("Effacer", "Clear")}>
                    <X size={15} />
                </button>
            )}
            {query.trim().length >= 2 && (
                <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-xl border border-line bg-white p-1 shadow-lg">
                    {loading && results.length === 0 && <li className="px-3 py-2.5 text-sm text-muted">{tr("Recherche…", "Searching…")}</li>}
                    {!loading && results.length === 0 && <li className="px-3 py-2.5 text-sm text-muted">{tr("Aucun lieu publié ne correspond.", "No published place matches.")}</li>}
                    {results.map((place) => (
                        <li key={place.slug}>
                            <button
                                type="button"
                                onClick={() => {
                                    onPick(place);
                                    setQuery("");
                                }}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-soft"
                            >
                                <MapPin size={15} className="shrink-0 text-brand-600" />
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-bold">{place.name}</span>
                                    <span className="block truncate text-xs text-muted">{[place.neighborhood, place.city].filter(Boolean).join(", ")}</span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
