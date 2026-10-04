"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Camera, ExternalLink, ImagePlus, LocateFixed, MapPin, Star, Trash2 } from "lucide-react";
import { adminGet, adminPatch } from "@/lib/admin-client";
import { SOURCE_LABELS } from "@/lib/admin-labels";
import VerifiedTick from "../place/VerifiedTick";
import { CITIES } from "@/lib/cities";
import { compressImage } from "@/lib/compress-image";
import { AMENITIES, CATEGORIES, GOOD_FOR, VIBES } from "@/lib/tags";
import { useAdminLang, useTr } from "./i18n";
import { Skeleton, StatusBadge, useAdminToast } from "./ui";
import { translateAdminMessage } from "@/lib/admin-messages";

type Photo = { id: string; image_url: string; alt_text: string | null; sort_order: number };
type Spot = Record<string, unknown> & { id: string; slug: string; name: string; status: string; source: string };

const DAYS = [
    ["monday", "Lun", "Mon"],
    ["tuesday", "Mar", "Tue"],
    ["wednesday", "Mer", "Wed"],
    ["thursday", "Jeu", "Thu"],
    ["friday", "Ven", "Fri"],
    ["saturday", "Sam", "Sat"],
    ["sunday", "Dim", "Sun"],
] as const;

const TEXT = ["name", "city", "neighborhood", "address", "landmark", "cuisine", "description", "phone", "whatsapp", "website", "instagram"] as const;
const NUMBERS = ["minimum_price", "maximum_price", "latitude", "longitude"] as const;
const TIMES = ["opening_time", "closing_time"] as const;
const LISTS = { vibes: VIBES, good_for: GOOD_FOR, amenities: AMENITIES } as const;
const LIST_LABELS: Record<keyof typeof LISTS, [string, string]> = { vibes: ["Ambiance", "Vibe"], good_for: ["Idéal pour", "Good for"], amenities: ["Sur place", "On site"] };
const STATUSES = [
    ["APPROVED", "Publié", "Published"],
    ["DRAFT", "Brouillon", "Draft"],
    ["CLOSED", "Fermé définitivement", "Closed for good"],
    ["REJECTED", "Refusé", "Rejected"],
] as const;

const text = (value: unknown) => (value === null || value === undefined ? "" : String(value));

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
    const tr = useTr();
    const { lang } = useAdminLang();
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
            toast(tr("Ajoute une position avant de publier.", "Add a location before publishing."), true);
            return;
        }
        if (!text(form.name).trim()) {
            toast(tr("Le nom est obligatoire.", "The name is required."), true);
            return;
        }
        setSaving(true);
        try {
            const data = await adminPatch<{ row: Spot }>(`spots/${spot.id}`, changes);
            setSpot(data.row);
            setForm(data.row);
            setVerifiedToday(false);
            toast(tr("Enregistré. Le site est à jour.", "Saved. The site is up to date."));
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
                body.set("file", await compressImage(original));
                body.set("alt", spot.name);
                const response = await fetch("/api/admin/photos", { method: "POST", body });
                const data = await response.json().catch(() => null);
                if (!response.ok || !data?.ok) throw new Error(data?.message ? translateAdminMessage(data.message, lang) : tr("Échec de l'envoi.", "Upload failed."));
                setPhotos((current) => [...current, data.row]);
                added++;
            } catch (caught) {
                toast((caught as Error).message, true);
            } finally {
                setUploading((count) => count - 1);
            }
        }
        if (added) toast(tr(`${added} photo${added > 1 ? "s" : ""} ajoutée${added > 1 ? "s" : ""}`, `${added} photo${added > 1 ? "s" : ""} added`));
    };

    const makeCover = async (photo: Photo) => {
        const response = await fetch(`/api/admin/photos/${photo.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cover: true }),
        });
        if (response.ok) {
            setPhotos((current) => [photo, ...current.filter((item) => item.id !== photo.id)]);
            toast(tr("Photo de couverture changée", "Cover photo changed"));
        }
    };

    const remove = async (photo: Photo) => {
        if (!window.confirm(tr("Supprimer cette photo ?", "Delete this photo?"))) return;
        const response = await fetch(`/api/admin/photos/${photo.id}`, { method: "DELETE" });
        if (response.ok) {
            setPhotos((current) => current.filter((item) => item.id !== photo.id));
            toast(tr("Photo supprimée", "Photo deleted"));
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
                toast(tr(`Position prise (précision ${Math.round(position.coords.accuracy)} m)`, `Location taken (accuracy ${Math.round(position.coords.accuracy)} m)`));
            },
            () => {
                setLocating(false);
                toast(tr("Position indisponible : active la localisation.", "Location unavailable: turn location on."), true);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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
                <Link href={backHref} className="a-btn a-btn-soft h-10 w-10 shrink-0 px-0" aria-label={tr("Retour", "Back")}>
                    <ArrowLeft size={18} />
                </Link>
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-2xl font-extrabold md:text-3xl">{text(form.name) || tr("Sans nom", "Untitled")}</h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                        <StatusBadge status={spot.status} />
                        <span>
                            {tr("Source", "Source")} : {SOURCE_LABELS[spot.source] ? tr(...SOURCE_LABELS[spot.source]) : spot.source}
                        </span>
                    </div>
                </div>
                {spot.status === "APPROVED" && (
                    <a href={`/fr/p/${spot.slug}`} target="_blank" rel="noreferrer" className="a-btn a-btn-soft shrink-0">
                        <ExternalLink size={16} />
                        <span className="hidden sm:inline">{tr("Voir sur le site", "View on the site")}</span>
                    </a>
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
                <div className="flex flex-col gap-4">
                    <Section title={tr("Photos", "Photos")} hint={tr("La première photo sert de couverture sur le site et dans les partages WhatsApp.", "The first photo is the cover on the site and in WhatsApp shares.")}>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {photos.map((photo, index) => (
                                <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl bg-soft">
                                    { }
                                    <img src={photo.image_url} alt={photo.alt_text ?? ""} loading="lazy" className="h-full w-full object-cover" />
                                    {index === 0 && (
                                        <span className="absolute top-1.5 left-1.5 rounded-full bg-gradient-to-r from-[#ff8a1f] to-[#eb3a6f] px-2 py-0.5 text-[0.62rem] font-extrabold text-white">
                                            {tr("Couverture", "Cover")}
                                        </span>
                                    )}
                                    <div className="absolute right-1.5 bottom-1.5 flex gap-1">
                                        {index > 0 && (
                                            <button type="button" onClick={() => void makeCover(photo)} className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white" aria-label={tr("Mettre en couverture", "Make cover")}>
                                                <Star size={14} />
                                            </button>
                                        )}
                                        <button type="button" onClick={() => void remove(photo)} className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white" aria-label={tr("Supprimer la photo", "Delete photo")}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {Array.from({ length: uploading }, (_, index) => (
                                <div key={`upload-${index}`} className="a-skeleton grid aspect-square place-items-center rounded-xl text-xs font-bold text-muted">
                                    {tr("Envoi…", "Uploading…")}
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <button type="button" className="a-btn a-btn-primary" onClick={() => cameraRef.current?.click()}>
                                <Camera size={17} />
                                {tr("Prendre une photo", "Take a photo")}
                            </button>
                            <button type="button" className="a-btn a-btn-soft" onClick={() => galleryRef.current?.click()}>
                                <ImagePlus size={17} />
                                {tr("Depuis la galerie", "From the gallery")}
                            </button>
                        </div>
                        <input ref={cameraRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => { void upload(event.target.files); event.target.value = ""; }} />
                        <input ref={galleryRef} className="sr-only" type="file" accept="image/*" multiple onChange={(event) => { void upload(event.target.files); event.target.value = ""; }} />
                    </Section>

                    <Section title={tr("Infos essentielles", "Essentials")}>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label={tr("Nom", "Name")} htmlFor="f-name" className="sm:col-span-2">
                                <input id="f-name" className="a-input" value={text(form.name)} onChange={(e) => set("name", e.target.value)} />
                            </Field>
                            <Field label={tr("Type de lieu", "Type of place")} htmlFor="f-category">
                                <select id="f-category" className="a-input" value={text(form.category)} onChange={(e) => set("category", e.target.value)}>
                                    {Object.entries(CATEGORIES).map(([key, label]) => (
                                        <option key={key} value={key}>
                                            {label[lang]}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label={tr("Cuisine", "Cuisine")} htmlFor="f-cuisine">
                                <input id="f-cuisine" className="a-input" value={text(form.cuisine)} onChange={(e) => set("cuisine", e.target.value)} placeholder={tr("camerounaise, pizza…", "cameroonian, pizza…")} />
                            </Field>
                            <Field label={tr("Prix min / personne (FCFA)", "Min price / person (FCFA)")} htmlFor="f-min">
                                <input id="f-min" className="a-input" inputMode="numeric" value={text(form.minimum_price)} onChange={(e) => set("minimum_price", e.target.value)} />
                            </Field>
                            <Field label={tr("Prix max / personne (FCFA)", "Max price / person (FCFA)")} htmlFor="f-max">
                                <input id="f-max" className="a-input" inputMode="numeric" value={text(form.maximum_price)} onChange={(e) => set("maximum_price", e.target.value)} />
                            </Field>
                            <Field label={tr("Description", "Description")} htmlFor="f-desc" className="sm:col-span-2">
                                <textarea
                                    id="f-desc"
                                    className="a-input"
                                    value={text(form.description)}
                                    onChange={(e) => set("description", e.target.value)}
                                    placeholder={tr("Ce qui rend ce lieu spécial, en deux ou trois phrases.", "What makes this place special, in two or three sentences.")}
                                />
                            </Field>
                        </div>
                    </Section>

                    <Section title={tr("Horaires", "Opening hours")}>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label={tr("Ouvre à", "Opens at")} htmlFor="f-open">
                                <input id="f-open" type="time" className="a-input" value={text(form.opening_time).slice(0, 5)} onChange={(e) => set("opening_time", e.target.value)} />
                            </Field>
                            <Field label={tr("Ferme à", "Closes at")} htmlFor="f-close">
                                <input id="f-close" type="time" className="a-input" value={text(form.closing_time).slice(0, 5)} onChange={(e) => set("closing_time", e.target.value)} />
                            </Field>
                        </div>
                        <p className="a-label mt-3">{tr("Jours d'ouverture", "Open days")}</p>
                        <div className="flex flex-wrap gap-1.5">
                            {DAYS.map(([day, fr, en]) => {
                                const on = form[`${day}_open`] !== false;
                                return (
                                    <button key={day} type="button" className="a-chip" aria-pressed={on} onClick={() => set(`${day}_open`, !on)}>
                                        {tr(fr, en)}
                                    </button>
                                );
                            })}
                        </div>
                    </Section>

                    <Section
                        title={tr("Ambiance et usages", "Vibe and uses")}
                        hint={tr("Ces étiquettes alimentent la recherche : « date », « chill », « regarder le match »…", "These tags power search: “date”, “chill”, “watch the match”…")}
                    >
                        <div className="flex flex-col gap-4">
                            {(Object.keys(LISTS) as (keyof typeof LISTS)[]).map((key) => {
                                const values = (form[key] as string[]) ?? [];
                                return (
                                    <div key={key}>
                                        <p className="a-label">{tr(...LIST_LABELS[key])}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {Object.entries(LISTS[key]).map(([value, label]) => {
                                                const on = values.includes(value);
                                                return (
                                                    <button key={value} type="button" className="a-chip" aria-pressed={on} onClick={() => set(key, on ? values.filter((v) => v !== value) : [...values, value])}>
                                                        {label[lang]}
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
                    <Section title={tr("Publication", "Publishing")}>
                        <Field label={tr("Statut", "Status")} htmlFor="f-status">
                            <select id="f-status" className="a-input" value={text(form.status)} onChange={(e) => set("status", e.target.value)}>
                                {STATUSES.map(([value, fr, en]) => (
                                    <option key={value} value={value}>
                                        {tr(fr, en)}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <div className="mt-3 flex flex-col gap-2">
                            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-soft px-3.5 py-3 text-sm font-semibold">
                                <input type="checkbox" className="h-5 w-5 accent-[#ff5b36]" checked={Boolean(form.featured)} onChange={(e) => set("featured", e.target.checked)} />
                                <Star size={16} className="text-amber-500" /> {tr("Coup de cœur (mis en avant)", "Featured (highlighted)")}
                            </label>
                            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-sky-50 px-3.5 py-3 text-sm font-semibold">
                                <input type="checkbox" className="h-5 w-5 accent-[#ff5b36]" checked={verifiedToday || Boolean(form.verified)} onChange={(e) => (e.target.checked ? setVerifiedToday(true) : (setVerifiedToday(false), set("verified", false)))} />
                                <VerifiedTick size={18} />{" "}
                                <span>
                                    {tr("Coche bleue « Vérifié »", "Blue “Verified” tick")}
                                    <span className="block text-xs font-medium text-muted">{tr("Infos confirmées sur place par l'équipe", "Info confirmed on site by the team")}</span>
                                </span>
                            </label>
                            {Boolean(spot.last_verified_at) && (
                                <p className="text-xs text-muted">
                                    {tr("Dernière vérification", "Last checked")} : {new Date(text(spot.last_verified_at)).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR")}
                                </p>
                            )}
                        </div>
                    </Section>

                    <Section title={tr("Adresse et position", "Address and location")}>
                        <div className="grid gap-3">
                            <div className="grid grid-cols-2 gap-3">
                                <Field label={tr("Ville", "City")} htmlFor="f-city">
                                    <select id="f-city" className="a-input" value={text(form.city)} onChange={(e) => set("city", e.target.value)}>
                                        {CITIES.map((city) => (
                                            <option key={city.slug} value={city.name}>
                                                {city.name}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label={tr("Quartier", "Neighbourhood")} htmlFor="f-area">
                                    <input id="f-area" className="a-input" value={text(form.neighborhood)} onChange={(e) => set("neighborhood", e.target.value)} />
                                </Field>
                            </div>
                            <Field label={tr("Adresse", "Address")} htmlFor="f-address">
                                <input id="f-address" className="a-input" value={text(form.address)} onChange={(e) => set("address", e.target.value)} />
                            </Field>
                            <Field label={tr("Repère (ex : derrière Total Bastos)", "Landmark (e.g. behind Total Bastos)")} htmlFor="f-landmark">
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
                                    {locating ? tr("Localisation…", "Locating…") : tr("Je suis sur place", "I'm there now")}
                                </button>
                                {lat && lng && (
                                    <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`} target="_blank" rel="noreferrer" className="a-btn a-btn-soft">
                                        <MapPin size={16} />
                                        {tr("Vérifier sur la carte", "Check on the map")}
                                    </a>
                                )}
                            </div>
                        </div>
                    </Section>

                    <Section title={tr("Contact", "Contact")}>
                        <div className="grid gap-3">
                            <div className="grid grid-cols-2 gap-3">
                                <Field label={tr("Téléphone", "Phone")} htmlFor="f-phone">
                                    <input id="f-phone" type="tel" className="a-input" value={text(form.phone)} onChange={(e) => set("phone", e.target.value)} />
                                </Field>
                                <Field label="WhatsApp" htmlFor="f-wa">
                                    <input id="f-wa" type="tel" className="a-input" value={text(form.whatsapp)} onChange={(e) => set("whatsapp", e.target.value)} />
                                </Field>
                            </div>
                            <Field label={tr("Site web", "Website")} htmlFor="f-web">
                                <input id="f-web" className="a-input" value={text(form.website)} onChange={(e) => set("website", e.target.value)} />
                            </Field>
                            <Field label="Instagram" htmlFor="f-ig">
                                <input id="f-ig" className="a-input" value={text(form.instagram)} onChange={(e) => set("instagram", e.target.value)} placeholder={tr("@nomdulieu", "@placename")} />
                            </Field>
                        </div>
                    </Section>
                </div>
            </div>

            {/* Save bar */}
            <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+3.9rem)] z-30 border-t border-line bg-white/97 px-4 py-3 md:bottom-0 md:left-64">
                <div className="mx-auto flex max-w-6xl items-center gap-3">
                    <p className="flex-1 text-sm font-semibold text-muted">{dirty ? tr("Modifications non enregistrées", "Unsaved changes") : tr("Tout est enregistré", "Everything is saved")}</p>
                    {dirty && (
                        <button type="button" className="a-btn a-btn-ghost" onClick={() => { setForm(spot); setVerifiedToday(false); }}>
                            {tr("Annuler", "Cancel")}
                        </button>
                    )}
                    <button type="button" className="a-btn a-btn-primary" disabled={!dirty || saving} onClick={() => void save()}>
                        {saving ? tr("Enregistrement…", "Saving…") : tr("Enregistrer", "Save")}
                    </button>
                </div>
            </div>
        </div>
    );
}
