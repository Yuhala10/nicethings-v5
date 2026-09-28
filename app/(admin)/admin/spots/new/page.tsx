"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LocateFixed } from "lucide-react";
import { PageHeader, useAdminToast } from "@/components/admin/ui";
import { adminPost } from "@/lib/admin-client";
import { CITIES } from "@/lib/cities";
import { CATEGORIES } from "@/lib/tags";

// Quick creation: the essentials, then the full editor for photos, prices…
export default function NewPlacePage() {
    const router = useRouter();
    const toast = useAdminToast();
    const [form, setForm] = useState({ name: "", category: "Restaurant", city: "yaounde", neighborhood: "", landmark: "", latitude: "", longitude: "", phone: "" });
    const [saving, setSaving] = useState(false);
    const [locating, setLocating] = useState(false);
    const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: event.target.value });

    const locate = () => {
        setLocating(true);
        navigator.geolocation?.getCurrentPosition(
            (position) => {
                setForm((current) => ({ ...current, latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) }));
                setLocating(false);
            },
            () => {
                setLocating(false);
                toast("Position indisponible : active la localisation.", true);
            },
            { enableHighAccuracy: true, timeout: 15000 }
        );
    };

    const create = async (publish: boolean) => {
        setSaving(true);
        try {
            const data = await adminPost<{ row: { id: string } }>("places", {
                ...form,
                latitude: form.latitude ? Number(form.latitude.replace(",", ".")) : null,
                longitude: form.longitude ? Number(form.longitude.replace(",", ".")) : null,
                status: publish ? "APPROVED" : "DRAFT",
            });
            toast("Lieu créé. Complète maintenant sa fiche.");
            router.push(`/admin/spots/${data.row.id}`);
        } catch (caught) {
            toast((caught as Error).message, true);
            setSaving(false);
        }
    };

    const hasPosition = Boolean(form.latitude && form.longitude);

    return (
        <div className="max-w-2xl">
            <Link href="/admin/spots" className="a-btn a-btn-ghost -ml-3 mb-2">
                <ArrowLeft size={17} />
                Lieux
            </Link>
            <PageHeader title="Ajouter un lieu" subtitle="L'essentiel d'abord. Photos, prix et horaires juste après." />
            <form
                className="a-card grid gap-4 p-5 sm:grid-cols-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    void create(false);
                }}
            >
                <div className="sm:col-span-2">
                    <label className="a-label" htmlFor="n-name">Nom du lieu</label>
                    <input id="n-name" className="a-input" required value={form.name} onChange={set("name")} autoFocus />
                </div>
                <div>
                    <label className="a-label" htmlFor="n-cat">Type</label>
                    <select id="n-cat" className="a-input" value={form.category} onChange={set("category")}>
                        {Object.entries(CATEGORIES).map(([key, label]) => (
                            <option key={key} value={key}>{label.fr}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="a-label" htmlFor="n-city">Ville</label>
                    <select id="n-city" className="a-input" value={form.city} onChange={set("city")}>
                        {CITIES.map((city) => (
                            <option key={city.slug} value={city.slug}>{city.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="a-label" htmlFor="n-area">Quartier</label>
                    <input id="n-area" className="a-input" value={form.neighborhood} onChange={set("neighborhood")} />
                </div>
                <div>
                    <label className="a-label" htmlFor="n-phone">Téléphone</label>
                    <input id="n-phone" type="tel" className="a-input" value={form.phone} onChange={set("phone")} />
                </div>
                <div className="sm:col-span-2">
                    <label className="a-label" htmlFor="n-landmark">Repère</label>
                    <input id="n-landmark" className="a-input" value={form.landmark} onChange={set("landmark")} placeholder="Derrière Total Bastos…" />
                </div>
                <div className="sm:col-span-2">
                    <p className="a-label">Position</p>
                    <div className="grid grid-cols-2 gap-2">
                        <input className="a-input" inputMode="decimal" placeholder="Latitude" aria-label="Latitude" value={form.latitude} onChange={set("latitude")} />
                        <input className="a-input" inputMode="decimal" placeholder="Longitude" aria-label="Longitude" value={form.longitude} onChange={set("longitude")} />
                    </div>
                    <button type="button" onClick={locate} disabled={locating} className="a-btn a-btn-dark mt-2">
                        <LocateFixed size={16} />
                        {locating ? "Localisation…" : "Je suis sur place"}
                    </button>
                    {!hasPosition && <p className="mt-2 text-xs text-muted">Sans position, le lieu reste en brouillon (il faut un point sur la carte pour le publier).</p>}
                </div>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <button type="submit" className="a-btn a-btn-soft" disabled={saving || form.name.trim().length < 2}>
                        Créer en brouillon
                    </button>
                    <button type="button" className="a-btn a-btn-primary" disabled={saving || form.name.trim().length < 2 || !hasPosition} onClick={() => void create(true)}>
                        Créer et publier
                    </button>
                </div>
            </form>
        </div>
    );
}
