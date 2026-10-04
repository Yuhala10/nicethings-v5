"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LocateFixed } from "lucide-react";
import { useAdminLang, useTr } from "@/components/admin/i18n";
import { PageHeader, useAdminToast } from "@/components/admin/ui";
import { adminPost } from "@/lib/admin-client";
import { CITIES } from "@/lib/cities";
import { CATEGORIES } from "@/lib/tags";

// Quick creation: the essentials, then the full editor for photos, prices…
export default function NewPlacePage() {
    const tr = useTr();
    const { lang } = useAdminLang();
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
                toast(tr("Position indisponible : active la localisation.", "Location unavailable: turn location on."), true);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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
            toast(tr("Lieu créé. Complète maintenant sa fiche.", "Place created. Now complete its listing."));
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
                {tr("Lieux", "Places")}
            </Link>
            <PageHeader title={tr("Ajouter un lieu", "Add a place")} subtitle={tr("L'essentiel d'abord. Photos, prix et horaires juste après.", "The essentials first. Photos, prices and hours right after.")} />
            <form
                className="a-card grid gap-4 p-5 sm:grid-cols-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    void create(false);
                }}
            >
                <div className="sm:col-span-2">
                    <label className="a-label" htmlFor="n-name">
                        {tr("Nom du lieu", "Place name")}
                    </label>
                    <input id="n-name" className="a-input" required value={form.name} onChange={set("name")} autoFocus />
                </div>
                <div>
                    <label className="a-label" htmlFor="n-cat">
                        {tr("Type", "Type")}
                    </label>
                    <select id="n-cat" className="a-input" value={form.category} onChange={set("category")}>
                        {Object.entries(CATEGORIES).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label[lang]}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="a-label" htmlFor="n-city">
                        {tr("Ville", "City")}
                    </label>
                    <select id="n-city" className="a-input" value={form.city} onChange={set("city")}>
                        {CITIES.map((city) => (
                            <option key={city.slug} value={city.slug}>
                                {city.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="a-label" htmlFor="n-area">
                        {tr("Quartier", "Neighbourhood")}
                    </label>
                    <input id="n-area" className="a-input" value={form.neighborhood} onChange={set("neighborhood")} />
                </div>
                <div>
                    <label className="a-label" htmlFor="n-phone">
                        {tr("Téléphone", "Phone")}
                    </label>
                    <input id="n-phone" type="tel" className="a-input" value={form.phone} onChange={set("phone")} />
                </div>
                <div className="sm:col-span-2">
                    <label className="a-label" htmlFor="n-landmark">
                        {tr("Repère", "Landmark")}
                    </label>
                    <input id="n-landmark" className="a-input" value={form.landmark} onChange={set("landmark")} placeholder={tr("Derrière Total Bastos…", "Behind Total Bastos…")} />
                </div>
                <div className="sm:col-span-2">
                    <p className="a-label">{tr("Position", "Location")}</p>
                    <div className="grid grid-cols-2 gap-2">
                        <input className="a-input" inputMode="decimal" placeholder="Latitude" aria-label="Latitude" value={form.latitude} onChange={set("latitude")} />
                        <input className="a-input" inputMode="decimal" placeholder="Longitude" aria-label="Longitude" value={form.longitude} onChange={set("longitude")} />
                    </div>
                    <button type="button" onClick={locate} disabled={locating} className="a-btn a-btn-dark mt-2">
                        <LocateFixed size={16} />
                        {locating ? tr("Localisation…", "Locating…") : tr("Je suis sur place", "I'm there now")}
                    </button>
                    {!hasPosition && (
                        <p className="mt-2 text-xs text-muted">
                            {tr("Sans position, le lieu reste en brouillon (il faut un point sur la carte pour le publier).", "Without a location the place stays a draft (it needs a point on the map to be published).")}
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <button type="submit" className="a-btn a-btn-soft" disabled={saving || form.name.trim().length < 2}>
                        {tr("Créer en brouillon", "Create as draft")}
                    </button>
                    <button type="button" className="a-btn a-btn-primary" disabled={saving || form.name.trim().length < 2 || !hasPosition} onClick={() => void create(true)}>
                        {tr("Créer et publier", "Create and publish")}
                    </button>
                </div>
            </form>
        </div>
    );
}
