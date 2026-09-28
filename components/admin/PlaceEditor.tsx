"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Camera, ExternalLink, ImagePlus, LocateFixed, MapPin, Star, Trash2 } from "lucide-react";
import { adminGet, adminPatch } from "@/lib/admin-client";
import { SOURCE_LABELS } from "@/lib/admin-labels";
import VerifiedTick from "../place/VerifiedTick";
import { CITIES } from "@/lib/cities";
import { AMENITIES, CATEGORIES, GOOD_FOR, VIBES } from "@/lib/tags";
import { Skeleton, StatusBadge, useAdminToast } from "./ui";

type Photo = { id: string; image_url: string; alt_text: string | null; sort_order: number };
type Spot = Record<string, unknown> & { id: string; slug: string; name: string; status: string; source: string };

const DAYS = [
    ["monday", "Lun"],
    ["tuesday", "Mar"],
    ["wednesday", "Mer"],
    ["thursday", "Jeu"],
    ["friday", "Ven"],
    ["saturday", "Sam"],
    ["sunday", "Dim"],
] as const;

const TEXT = ["name", "city", "neighborhood", "address", "landmark", "cuisine", "description", "phone", "whatsapp", "website", "instagram"] as const;
const NUMBERS = ["minimum_price", "maximum_price", "latitude", "longitude"] as const;
const TIMES = ["opening_time", "closing_time"] as const;
const LISTS = { vibes: VIBES, good_for: GOOD_FOR, amenities: AMENITIES } as const;
const LIST_LABELS: Record<keyof typeof LISTS, string> = { vibes: "Ambiance", good_for: "Idéal pour", amenities: "Sur place" };
const STATUSES = [
    ["APPROVED", "Publié"],
    ["DRAFT", "Brouillon"],
    ["CLOSED", "Fermé définitivement"],
    ["REJECTED", "Refusé"],
] as const;

const text = (value: unknown) => (value === null || value === undefined ? "" : String(value));

// Photos are resized on the phone (~1600 px JPEG) so uploads work on mobile data.
async function compress(file: File): Promise<File> {
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
        return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
    } catch {
        return file;
    }
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
    return (
        <section className="a-card p-5">
            <h2 className="text-base font-extrabold">{title}</h2>
            {hint && <p className="mb-4 text-sm text-muted">{hint}</p>}
            <div className={hint ? "" : "mt-4"}>{children}</div>
        </section>
    );
}

function Field({ label, htmlFor, children, className = "" }: { label: string; htmlFor?: string; children: ReactNode; className?: string }) {
    return (
        <div className={className}>
            <label className="a-label" htmlFor={htmlFor}>
                {label}
            </label>
            {children}
        </div>
    );
}

export default function PlaceEditor({ id, backHref = "/admin/spots" }: { id: string; backHref?: string }) {
    const toast = useAdminToast();
    const [spot, setSpot] = useState<Spot | null>(null);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [form, setForm] = useState<Record<string, unknown>>({});
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(0);
    const [verifiedToday, setVerifiedToday] = useState(false);
    const [locating, setLocating] = useState(false);
    const cameraRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let cancelled = false;
        adminGet<{ row: Spot; photos: Photo[] }>(`field/${id}`)
            .then((data) => {
                if (cancelled) return;
                setSpot(data.row);
                setForm(data.row);
                setPhotos(data.photos);
            })
            .catch((caught) => setError((caught as Error).message));
        return () => {
            cancelled = true;
        };
    }, [id]);

    const set = (key: string, value: unknown) => setForm((current) => ({ ...current, [key]: value }));

    const changes = useMemo(() => {
        if (!spot) return {};
        const diff: Record<string, unknown> = {};
        for (const key of TEXT) {
            const value = text(form[key]).trim() || null;
            if (value !== (spot[key] ?? null)) diff[key] = value;
        }
        for (const key of NUMBERS) {
            const raw = text(form[key]).replace(/\s/g, "").replace(",", ".");
            const value = raw === "" ? null : Number(raw);
            if (value !== null && !Number.isFinite(value)) continue;
            if (value !== (spot[key] ?? null)) diff[key] = value;
        }
        for (const key of TIMES) {
            const value = text(form[key]).slice(0, 5) || null;
            if (value !== (text(spot[key]).slice(0, 5) || null)) diff[key] = value;
        }
        for (const [day] of DAYS) if (form[`${day}_open`] !== spot[`${day}_open`]) diff[`${day}_open`] = form[`${day}_open`];
        for (const key of Object.keys(LISTS)) {
            if (JSON.stringify(form[key] ?? []) !== JSON.stringify(spot[key] ?? [])) diff[key] = form[key] ?? [];
        }
        for (const key of ["category", "status", "verified", "featured"]) if (form[key] !== spot[key]) diff[key] = form[key];
        if (verifiedToday) {
            diff.verified = true;
            diff.last_verified_at = new Date().toISOString();
        }
        return diff;
    }, [form, spot, verifiedToday]);
    const dirty = Object.keys(changes).length > 0;

    // Leaving with unsaved changes asks first.
    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => event.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    const save = async () => {
        if (!spot || !dirty) return;
        const publishing = (changes.status ?? spot.status) === "APPROVED";
        const lat = changes.latitude !== undefined ? changes.latitude : spot.latitude;
        const lng = changes.longitude !== undefined ? changes.longitude : spot.longitude;
        if (publishing && (lat === null || lng === null)) {
            toast("Ajoute une position avant de publier.", true);
            return;
        }
        if (!text(form.name).trim()) {
            toast("Le nom est obligatoire.", true);
            return;
        }
        setSaving(true);
        try {
            const data = await adminPatch<{ row: Spot }>(`spots/${spot.id}`, changes);
            setSpot(data.row);
            setForm(data.row);
            setVerifiedToday(false);
            toast("Enregistré. Le site est à jour.");
        } catch (caught) {
            toast((caught as Error).message, true);
        } finally {
            setSaving(false);
        }
    };

    const upload = async (files: FileList | null) => {
        if (!spot || !files?.length) return;
        const list = Array.from(files).slice(0, 10);
        setUploading(list.length);
        let added = 0;
        for (const original of list) {
            try {
                const body = new FormData();
                body.set("spotId", spot.id);
                body.set("file", await compress(original));
                body.set("alt", spot.name);
                const response = await fetch("/api/admin/photos", { method: "POST", body });
                const data = await response.json().catch(() => null);
                if (!response.ok || !data?.ok) throw new Error(data?.message ?? "Échec de l'envoi.");
                setPhotos((current) => [...current, data.row]);
                added++;
            } catch (caught) {
                toast((caught as Error).message, true);
            } finally {
                setUploading((count) => count - 1);
            }
        }
        if (added) toast(`${added} photo${added > 1 ? "s" : ""} ajoutée${added > 1 ? "s" : ""}`);
    };

    const makeCover = async (photo: Photo) => {
        const response = await fetch(`/api/admin/photos/${photo.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cover: true }),
        });
        if (response.ok) {
            setPhotos((current) => [photo, ...current.filter((item) => item.id !== photo.id)]);
            toast("Photo de couverture changée");
        }
    };

    const remove = async (photo: Photo) => {
        if (!window.confirm("Supprimer cette photo ?")) return;
        const response = await fetch(`/api/admin/photos/${photo.id}`, { method: "DELETE" });
        if (response.ok) {
            setPhotos((current) => current.filter((item) => item.id !== photo.id));
            toast("Photo supprimée");
        }
    };

    const useMyPosition = () => {
        if (!("geolocation" in navigator)) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                set("latitude", Number(position.coords.latitude.toFixed(6)));
                set("longitude", Number(position.coords.longitude.toFixed(6)));
                setLocating(false);
                toast(`Position prise (précision ${Math.round(position.coords.accuracy)} m)`);
            },
            () => {
                setLocating(false);
                toast("Position indisponible : active la localisation.", true);
            },
            { enableHighAccuracy: true, timeout: 15000 }
        );
    };

    if (error) return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-bad">{error}</p>;
    if (!spot) {
        return (
            <div className="flex flex-col gap-4">
                <Skeleton className="h-12 w-2/3" />
                <Skeleton className="h-48" />
                <Skeleton className="h-72" />
            </div>
        );
    }

    const lat = text(form.latitude);
    const lng = text(form.longitude);

    return (
        <div className="pb-24">
            {/* Header */}
            <div className="mb-5 flex items-start gap-3">
                <Link href={backHref} className="a-btn a-btn-soft h-10 w-10 shrink-0 px-0" aria-label="Retour">
                    <ArrowLeft size={18} />
                </Link>
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-2xl font-extrabold md:text-3xl">{text(form.name) || "Sans nom"}</h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                        <StatusBadge status={spot.status} />
                        <span>Source : {SOURCE_LABELS[spot.source] ?? spot.source}</span>
                    </div>
                </div>
                {spot.status === "APPROVED" && (
                    <a href={`/fr/p/${spot.slug}`} target="_blank" rel="noreferrer" className="a-btn a-btn-soft shrink-0">
                        <ExternalLink size={16} />
                        <span className="hidden sm:inline">Voir sur le site</span>
                    </a>
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
                <div className="flex flex-col gap-4">
                    <Section title="Photos" hint="La première photo sert de couverture sur le site et dans les partages WhatsApp.">
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {photos.map((photo, index) => (
                                <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl bg-soft">
                                    { }
                                    <img src={photo.image_url} alt={photo.alt_text ?? ""} loading="lazy" className="h-full w-full object-cover" />
                                    {index === 0 && (
                                        <span className="absolute top-1.5 left-1.5 rounded-full bg-gradient-to-r from-[#ff8a1f] to-[#eb3a6f] px-2 py-0.5 text-[0.62rem] font-extrabold text-white">
                                            Couverture
                                        </span>
                                    )}
                                    <div className="absolute right-1.5 bottom-1.5 flex gap-1">
                                        {index > 0 && (
                                            <button type="button" onClick={() => void makeCover(photo)} className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white" aria-label="Mettre en couverture">
                                                <Star size={14} />
                                            </button>
                                        )}
                                        <button type="button" onClick={() => void remove(photo)} className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white" aria-label="Supprimer la photo">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {Array.from({ length: uploading }, (_, index) => (
                                <div key={`upload-${index}`} className="a-skeleton grid aspect-square place-items-center rounded-xl text-xs font-bold text-muted">
                                    Envoi…
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <button type="button" className="a-btn a-btn-primary" onClick={() => cameraRef.current?.click()}>
                                <Camera size={17} />
                                Prendre une photo
                            </button>
                            <button type="button" className="a-btn a-btn-soft" onClick={() => galleryRef.current?.click()}>
                                <ImagePlus size={17} />
                                Depuis la galerie
                            </button>
                        </div>
                        <input ref={cameraRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => { void upload(event.target.files); event.target.value = ""; }} />
                        <input ref={galleryRef} className="sr-only" type="file" accept="image/*" multiple onChange={(event) => { void upload(event.target.files); event.target.value = ""; }} />
                    </Section>

                    <Section title="Infos essentielles">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Nom" htmlFor="f-name" className="sm:col-span-2">
                                <input id="f-name" className="a-input" value={text(form.name)} onChange={(e) => set("name", e.target.value)} />
                            </Field>
                            <Field label="Type de lieu" htmlFor="f-category">
                                <select id="f-category" className="a-input" value={text(form.category)} onChange={(e) => set("category", e.target.value)}>
                                    {Object.entries(CATEGORIES).map(([key, label]) => (
                                        <option key={key} value={key}>
                                            {label.fr}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Cuisine" htmlFor="f-cuisine">
                                <input id="f-cuisine" className="a-input" value={text(form.cuisine)} onChange={(e) => set("cuisine", e.target.value)} placeholder="camerounaise, pizza…" />
                            </Field>
                            <Field label="Prix min / personne (FCFA)" htmlFor="f-min">
                                <input id="f-min" className="a-input" inputMode="numeric" value={text(form.minimum_price)} onChange={(e) => set("minimum_price", e.target.value)} />
                            </Field>
                            <Field label="Prix max / personne (FCFA)" htmlFor="f-max">
                                <input id="f-max" className="a-input" inputMode="numeric" value={text(form.maximum_price)} onChange={(e) => set("maximum_price", e.target.value)} />
                            </Field>
                            <Field label="Description" htmlFor="f-desc" className="sm:col-span-2">
                                <textarea id="f-desc" className="a-input" value={text(form.description)} onChange={(e) => set("description", e.target.value)} placeholder="Ce qui rend ce lieu spécial, en deux ou trois phrases." />
                            </Field>
                        </div>
                    </Section>

                    <Section title="Horaires">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Ouvre à" htmlFor="f-open">
                                <input id="f-open" type="time" className="a-input" value={text(form.opening_time).slice(0, 5)} onChange={(e) => set("opening_time", e.target.value)} />
                            </Field>
                            <Field label="Ferme à" htmlFor="f-close">
                                <input id="f-close" type="time" className="a-input" value={text(form.closing_time).slice(0, 5)} onChange={(e) => set("closing_time", e.target.value)} />
                            </Field>
                        </div>
                        <p className="a-label mt-3">Jours d&apos;ouverture</p>
                        <div className="flex flex-wrap gap-1.5">
                            {DAYS.map(([day, label]) => {
                                const on = form[`${day}_open`] !== false;
                                return (
                                    <button key={day} type="button" className="a-chip" aria-pressed={on} onClick={() => set(`${day}_open`, !on)}>
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </Section>

                    <Section title="Ambiance et usages" hint="Ces étiquettes alimentent la recherche : « date », « chill », « regarder le match »…">
                        <div className="flex flex-col gap-4">
                            {(Object.keys(LISTS) as (keyof typeof LISTS)[]).map((key) => {
                                const values = (form[key] as string[]) ?? [];
                                return (
                                    <div key={key}>
                                        <p className="a-label">{LIST_LABELS[key]}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {Object.entries(LISTS[key]).map(([value, label]) => {
                                                const on = values.includes(value);
                                                return (
                                                    <button key={value} type="button" className="a-chip" aria-pressed={on} onClick={() => set(key, on ? values.filter((v) => v !== value) : [...values, value])}>
                                                        {label.fr}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Section>
                </div>

                <div className="flex flex-col gap-4">
                    <Section title="Publication">
                        <Field label="Statut" htmlFor="f-status">
                            <select id="f-status" className="a-input" value={text(form.status)} onChange={(e) => set("status", e.target.value)}>
                                {STATUSES.map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <div className="mt-3 flex flex-col gap-2">
                            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-soft px-3.5 py-3 text-sm font-semibold">
                                <input type="checkbox" className="h-5 w-5 accent-[#ff5b36]" checked={Boolean(form.featured)} onChange={(e) => set("featured", e.target.checked)} />
                                <Star size={16} className="text-amber-500" /> Coup de cœur (mis en avant)
                            </label>
                            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-sky-50 px-3.5 py-3 text-sm font-semibold">
                                <input type="checkbox" className="h-5 w-5 accent-[#ff5b36]" checked={verifiedToday || Boolean(form.verified)} onChange={(e) => (e.target.checked ? setVerifiedToday(true) : (setVerifiedToday(false), set("verified", false)))} />
                                <VerifiedTick size={18} /> <span>Coche bleue « Vérifié »<span className="block text-xs font-medium text-muted">Infos confirmées sur place par l&apos;équipe</span></span>
                            </label>
                            {Boolean(spot.last_verified_at) && <p className="text-xs text-muted">Dernière vérification : {new Date(text(spot.last_verified_at)).toLocaleDateString("fr-FR")}</p>}
                        </div>
                    </Section>

                    <Section title="Adresse et position">
                        <div className="grid gap-3">
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Ville" htmlFor="f-city">
                                    <select id="f-city" className="a-input" value={text(form.city)} onChange={(e) => set("city", e.target.value)}>
                                        {CITIES.map((city) => (
                                            <option key={city.slug} value={city.name}>
                                                {city.name}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Quartier" htmlFor="f-area">
                                    <input id="f-area" className="a-input" value={text(form.neighborhood)} onChange={(e) => set("neighborhood", e.target.value)} />
                                </Field>
                            </div>
                            <Field label="Adresse" htmlFor="f-address">
                                <input id="f-address" className="a-input" value={text(form.address)} onChange={(e) => set("address", e.target.value)} />
                            </Field>
                            <Field label="Repère (ex : derrière Total Bastos)" htmlFor="f-landmark">
                                <input id="f-landmark" className="a-input" value={text(form.landmark)} onChange={(e) => set("landmark", e.target.value)} />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Latitude" htmlFor="f-lat">
                                    <input id="f-lat" className="a-input" inputMode="decimal" value={lat} onChange={(e) => set("latitude", e.target.value)} />
                                </Field>
                                <Field label="Longitude" htmlFor="f-lng">
                                    <input id="f-lng" className="a-input" inputMode="decimal" value={lng} onChange={(e) => set("longitude", e.target.value)} />
                                </Field>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" className="a-btn a-btn-dark" onClick={useMyPosition} disabled={locating}>
                                    <LocateFixed size={16} />
                                    {locating ? "Localisation…" : "Je suis sur place"}
                                </button>
                                {lat && lng && (
                                    <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`} target="_blank" rel="noreferrer" className="a-btn a-btn-soft">
                                        <MapPin size={16} />
                                        Vérifier sur la carte
                                    </a>
                                )}
                            </div>
                        </div>
                    </Section>

                    <Section title="Contact">
                        <div className="grid gap-3">
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Téléphone" htmlFor="f-phone">
                                    <input id="f-phone" type="tel" className="a-input" value={text(form.phone)} onChange={(e) => set("phone", e.target.value)} />
                                </Field>
                                <Field label="WhatsApp" htmlFor="f-wa">
                                    <input id="f-wa" type="tel" className="a-input" value={text(form.whatsapp)} onChange={(e) => set("whatsapp", e.target.value)} />
                                </Field>
                            </div>
                            <Field label="Site web" htmlFor="f-web">
                                <input id="f-web" className="a-input" value={text(form.website)} onChange={(e) => set("website", e.target.value)} />
                            </Field>
                            <Field label="Instagram" htmlFor="f-ig">
                                <input id="f-ig" className="a-input" value={text(form.instagram)} onChange={(e) => set("instagram", e.target.value)} placeholder="@nomdulieu" />
                            </Field>
                        </div>
                    </Section>
                </div>
            </div>

            {/* Save bar */}
            <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+3.9rem)] z-30 border-t border-line bg-white/97 px-4 py-3 md:bottom-0 md:left-64">
                <div className="mx-auto flex max-w-6xl items-center gap-3">
                    <p className="flex-1 text-sm font-semibold text-muted">{dirty ? "Modifications non enregistrées" : "Tout est enregistré"}</p>
                    {dirty && (
                        <button type="button" className="a-btn a-btn-ghost" onClick={() => { setForm(spot); setVerifiedToday(false); }}>
                            Annuler
                        </button>
                    )}
                    <button type="button" className="a-btn a-btn-primary" disabled={!dirty || saving} onClick={() => void save()}>
                        {saving ? "Enregistrement…" : "Enregistrer"}
                    </button>
                </div>
            </div>
        </div>
    );
}
