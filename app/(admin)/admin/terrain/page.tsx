"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Camera, ExternalLink, ImagePlus, LocateFixed, Search, Star, Trash2 } from "lucide-react";
import { adminGet, adminPatch } from "@/lib/admin-client";
import { AMENITIES, CATEGORIES, GOOD_FOR, VIBES } from "@/lib/tags";
import styles from "./terrain.module.css";

// Field kit: find a place (by name or where you stand), add photos taken on
// the spot, and fill in what visitors ask about — price, hours, contacts,
// mood. Saving refreshes the public site straight away.

type Result = {
    id: string;
    slug: string;
    name: string;
    category: string;
    city: string | null;
    neighborhood: string | null;
    status: string;
    verified: boolean;
    photo_count: number;
};

type Photo = { id: string; image_url: string; alt_text: string | null; sort_order: number };

type Spot = Record<string, unknown> & { id: string; slug: string; name: string; city: string | null };

const DAYS = [
    ["monday", "Lun"],
    ["tuesday", "Mar"],
    ["wednesday", "Mer"],
    ["thursday", "Jeu"],
    ["friday", "Ven"],
    ["saturday", "Sam"],
    ["sunday", "Dim"],
] as const;

// Fields this screen edits, and how they are read from the form.
const TEXT_FIELDS = ["description", "landmark", "cuisine", "phone", "whatsapp", "website", "instagram"] as const;
const NUMBER_FIELDS = ["minimum_price", "maximum_price"] as const;
const TIME_FIELDS = ["opening_time", "closing_time"] as const;
const LIST_FIELDS = { vibes: VIBES, good_for: GOOD_FOR, amenities: AMENITIES } as const;
const LIST_LABELS: Record<keyof typeof LIST_FIELDS, string> = {
    vibes: "Ambiance",
    good_for: "Idéal pour",
    amenities: "Sur place",
};

// Resize on the phone before uploading: ~1600 px JPEG, a few hundred KB,
// fine on mobile data. Falls back to the original file if decoding fails.
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

function asText(value: unknown) {
    return value === null || value === undefined ? "" : String(value);
}

function FieldKit() {
    const router = useRouter();
    const params = useSearchParams();
    const selectedId = params.get("id");

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Result[] | null>(null);
    const [searching, setSearching] = useState(false);
    const [spot, setSpot] = useState<Spot | null>(null);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [form, setForm] = useState<Record<string, unknown>>({});
    const [uploading, setUploading] = useState(0);
    const [verifiedToday, setVerifiedToday] = useState(false);
    const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
    const [saving, setSaving] = useState(false);
    const cameraRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);

    const search = useCallback(async (extra: string) => {
        setSearching(true);
        try {
            const data = await adminGet<{ rows: Result[] }>(`field?${extra}`);
            setResults(data.rows);
        } catch (error) {
            setMessage({ text: (error as Error).message, error: true });
        } finally {
            setSearching(false);
        }
    }, []);

    const nearMe = () => {
        if (!("geolocation" in navigator)) return;
        setSearching(true);
        navigator.geolocation.getCurrentPosition(
            (position) => void search(`lat=${position.coords.latitude}&lng=${position.coords.longitude}`),
            () => {
                setSearching(false);
                setMessage({ text: "Position indisponible : active la localisation ou cherche par nom.", error: true });
            },
            { enableHighAccuracy: true, timeout: 15000 }
        );
    };

    // Recent places on first open.
    useEffect(() => {
        if (!selectedId) void search("");
    }, [search, selectedId]);

    // Load the chosen place.
    useEffect(() => {
        if (!selectedId) {
            setSpot(null);
            return;
        }
        let cancelled = false;
        adminGet<{ row: Spot; photos: Photo[] }>(`field/${selectedId}`)
            .then((data) => {
                if (cancelled) return;
                setSpot(data.row);
                setPhotos(data.photos);
                setForm(data.row);
                setVerifiedToday(false);
                setMessage(null);
            })
            .catch((error) => setMessage({ text: (error as Error).message, error: true }));
        return () => {
            cancelled = true;
        };
    }, [selectedId]);

    const set = (key: string, value: unknown) => setForm((current) => ({ ...current, [key]: value }));

    const changes = useMemo(() => {
        if (!spot) return {};
        const diff: Record<string, unknown> = {};
        for (const key of TEXT_FIELDS) {
            const value = asText(form[key]).trim() || null;
            if (value !== (spot[key] ?? null)) diff[key] = value;
        }
        for (const key of NUMBER_FIELDS) {
            const raw = asText(form[key]).replace(/\s/g, "");
            const value = raw === "" ? null : Number(raw);
            if (value !== null && (!Number.isInteger(value) || value < 0)) continue;
            if (value !== (spot[key] ?? null)) diff[key] = value;
        }
        for (const key of TIME_FIELDS) {
            const value = asText(form[key]).slice(0, 5) || null;
            if (value !== (asText(spot[key]).slice(0, 5) || null)) diff[key] = value;
        }
        for (const [day] of DAYS) {
            const key = `${day}_open`;
            if (form[key] !== spot[key]) diff[key] = form[key];
        }
        for (const key of Object.keys(LIST_FIELDS)) {
            const value = (form[key] as string[]) ?? [];
            if (JSON.stringify(value) !== JSON.stringify(spot[key] ?? [])) diff[key] = value;
        }
        if (form.category !== spot.category) diff.category = form.category;
        if (verifiedToday) {
            diff.verified = true;
            diff.last_verified_at = new Date().toISOString();
        }
        return diff;
    }, [form, spot, verifiedToday]);

    const dirty = Object.keys(changes).length > 0;

    const save = async () => {
        if (!spot || !dirty) return;
        setSaving(true);
        try {
            const data = await adminPatch<{ row: Spot }>(`spots/${spot.id}`, changes);
            setSpot(data.row);
            setForm(data.row);
            setVerifiedToday(false);
            setMessage({ text: "Enregistré ✓ Le site est à jour." });
        } catch (error) {
            setMessage({ text: (error as Error).message, error: true });
        } finally {
            setSaving(false);
        }
    };

    const upload = async (files: FileList | null) => {
        if (!spot || !files?.length) return;
        const list = Array.from(files).slice(0, 10);
        setUploading(list.length);
        for (const original of list) {
            try {
                const file = await compress(original);
                const body = new FormData();
                body.set("spotId", spot.id);
                body.set("file", file);
                body.set("alt", spot.name);
                const response = await fetch("/api/admin/photos", { method: "POST", body });
                const data = await response.json().catch(() => null);
                if (!response.ok || !data?.ok) throw new Error(data?.message ?? "Échec de l'envoi.");
                setPhotos((current) => [...current, data.row]);
            } catch (error) {
                setMessage({ text: (error as Error).message, error: true });
            } finally {
                setUploading((count) => count - 1);
            }
        }
        setMessage({ text: "Photos ajoutées ✓" });
    };

    const makeCover = async (photo: Photo) => {
        const response = await fetch(`/api/admin/photos/${photo.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cover: true }),
        });
        if (response.ok) setPhotos((current) => [photo, ...current.filter((item) => item.id !== photo.id)]);
    };

    const remove = async (photo: Photo) => {
        const response = await fetch(`/api/admin/photos/${photo.id}`, { method: "DELETE" });
        if (response.ok) setPhotos((current) => current.filter((item) => item.id !== photo.id));
    };

    // ---------------- Search view ----------------
    if (!selectedId) {
        return (
            <main className={styles.page}>
                <div className={styles.wrap}>
                    <div className={styles.top}>
                        <Link href="/admin" className={styles.iconButton} aria-label="Retour">
                            <ArrowLeft size={19} />
                        </Link>
                        <div>
                            <h1 className={styles.title}>Terrain</h1>
                            <p className={styles.subtitle}>Photos, prix et horaires, sur place.</p>
                        </div>
                    </div>

                    <form
                        className={styles.searchRow}
                        onSubmit={(event) => {
                            event.preventDefault();
                            void search(`q=${encodeURIComponent(query)}`);
                        }}
                    >
                        <input
                            className={styles.input}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Nom du lieu…"
                            aria-label="Chercher un lieu"
                            type="search"
                            enterKeyHint="search"
                        />
                        <button type="submit" className={`${styles.button} ${styles.dark}`} aria-label="Chercher">
                            <Search size={18} />
                        </button>
                    </form>
                    <button type="button" onClick={nearMe} className={`${styles.button} ${styles.primary}`} style={{ width: "100%", marginBottom: 16 }}>
                        <LocateFixed size={18} />
                        Les lieux autour de moi
                    </button>

                    {message?.error && <p className={`${styles.message} ${styles.error}`}>{message.text}</p>}
                    {searching && <p className={styles.empty}>Recherche…</p>}
                    {!searching && results && results.length === 0 && <p className={styles.empty}>Aucun lieu trouvé.</p>}
                    {!searching && results && results.length > 0 && (
                        <ul className={styles.list}>
                            {results.map((row) => (
                                <li key={row.id}>
                                    <button type="button" className={styles.row} onClick={() => router.push(`/admin/terrain?id=${row.id}`)}>
                                        <div className={styles.rowMain}>
                                            <div className={styles.rowName}>{row.name}</div>
                                            <div className={styles.rowMeta}>
                                                {[CATEGORIES[row.category as keyof typeof CATEGORIES]?.fr ?? row.category, row.neighborhood, row.city]
                                                    .filter(Boolean)
                                                    .join(" · ")}
                                            </div>
                                        </div>
                                        <div className={styles.badges}>
                                            {row.photo_count > 0 && <span className={styles.badge}>📷 {row.photo_count}</span>}
                                            {row.verified ? (
                                                <span className={`${styles.badge} ${styles.badgeGood}`}>Vérifié</span>
                                            ) : row.status !== "APPROVED" ? (
                                                <span className={`${styles.badge} ${styles.badgeWarn}`}>{row.status}</span>
                                            ) : null}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </main>
        );
    }

    // ---------------- Editor view ----------------
    return (
        <main className={styles.page}>
            <div className={styles.wrap}>
                <div className={styles.top}>
                    <button type="button" onClick={() => router.push("/admin/terrain")} className={styles.iconButton} aria-label="Retour">
                        <ArrowLeft size={19} />
                    </button>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <h1 className={styles.title} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {spot?.name ?? "…"}
                        </h1>
                        <p className={styles.subtitle}>{[asText(spot?.neighborhood), asText(spot?.city)].filter(Boolean).join(", ")}</p>
                    </div>
                    {spot && (
                        <a href={`/fr/p/${spot.slug}`} target="_blank" rel="noreferrer" className={styles.iconButton} aria-label="Voir sur le site">
                            <ExternalLink size={18} />
                        </a>
                    )}
                </div>

                {spot && (
                    <>
                        <section className={styles.card}>
                            <h2 className={styles.cardTitle}>Photos</h2>
                            <div className={styles.photos}>
                                {photos.map((photo, index) => (
                                    <div key={photo.id} className={styles.photo}>
                                        { }
                                        <img src={photo.image_url} alt={photo.alt_text ?? ""} loading="lazy" />
                                        {index === 0 && <span className={styles.photoCover}>Couverture</span>}
                                        <div className={styles.photoActions}>
                                            {index > 0 && (
                                                <button type="button" className={styles.photoButton} onClick={() => void makeCover(photo)} aria-label="Mettre en couverture">
                                                    <Star size={15} />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className={styles.photoButton}
                                                onClick={() => {
                                                    if (window.confirm("Supprimer cette photo ?")) void remove(photo);
                                                }}
                                                aria-label="Supprimer"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {Array.from({ length: uploading }, (_, index) => (
                                    <div key={`up-${index}`} className={`${styles.photo} ${styles.uploading}`}>
                                        Envoi…
                                    </div>
                                ))}
                            </div>
                            <div className={styles.addRow}>
                                <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => cameraRef.current?.click()}>
                                    <Camera size={18} />
                                    Prendre
                                </button>
                                <button type="button" className={`${styles.button} ${styles.soft}`} onClick={() => galleryRef.current?.click()}>
                                    <ImagePlus size={18} />
                                    Galerie
                                </button>
                            </div>
                            <input
                                ref={cameraRef}
                                className={styles.hiddenInput}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={(event) => {
                                    void upload(event.target.files);
                                    event.target.value = "";
                                }}
                            />
                            <input
                                ref={galleryRef}
                                className={styles.hiddenInput}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(event) => {
                                    void upload(event.target.files);
                                    event.target.value = "";
                                }}
                            />
                        </section>

                        <section className={styles.card}>
                            <h2 className={styles.cardTitle}>Infos pratiques</h2>
                            <div className={styles.field}>
                                <label className={styles.label} htmlFor="category">
                                    Type de lieu
                                </label>
                                <select id="category" className={styles.select} value={asText(form.category)} onChange={(event) => set("category", event.target.value)}>
                                    {Object.entries(CATEGORIES).map(([key, label]) => (
                                        <option key={key} value={key}>
                                            {label.fr}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.grid2}>
                                <div className={styles.field}>
                                    <label className={styles.label} htmlFor="minimum_price">
                                        Prix min / pers. (FCFA)
                                    </label>
                                    <input id="minimum_price" className={styles.input} inputMode="numeric" value={asText(form.minimum_price)} onChange={(event) => set("minimum_price", event.target.value)} />
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label} htmlFor="maximum_price">
                                        Prix max / pers. (FCFA)
                                    </label>
                                    <input id="maximum_price" className={styles.input} inputMode="numeric" value={asText(form.maximum_price)} onChange={(event) => set("maximum_price", event.target.value)} />
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label} htmlFor="opening_time">
                                        Ouvre à
                                    </label>
                                    <input id="opening_time" type="time" className={styles.input} value={asText(form.opening_time).slice(0, 5)} onChange={(event) => set("opening_time", event.target.value)} />
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label} htmlFor="closing_time">
                                        Ferme à
                                    </label>
                                    <input id="closing_time" type="time" className={styles.input} value={asText(form.closing_time).slice(0, 5)} onChange={(event) => set("closing_time", event.target.value)} />
                                </div>
                            </div>
                            <div className={styles.field}>
                                <span className={styles.label}>Jours d&apos;ouverture</span>
                                <div className={styles.chips}>
                                    {DAYS.map(([day, label]) => {
                                        const on = form[`${day}_open`] !== false;
                                        return (
                                            <button
                                                key={day}
                                                type="button"
                                                className={`${styles.chip} ${on ? styles.chipOn : ""}`}
                                                aria-pressed={on}
                                                onClick={() => set(`${day}_open`, !on)}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className={styles.grid2}>
                                <div className={styles.field}>
                                    <label className={styles.label} htmlFor="phone">
                                        Téléphone
                                    </label>
                                    <input id="phone" type="tel" className={styles.input} value={asText(form.phone)} onChange={(event) => set("phone", event.target.value)} />
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label} htmlFor="whatsapp">
                                        WhatsApp
                                    </label>
                                    <input id="whatsapp" type="tel" className={styles.input} value={asText(form.whatsapp)} onChange={(event) => set("whatsapp", event.target.value)} />
                                </div>
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label} htmlFor="landmark">
                                    Repère (ex : derrière Total Bastos)
                                </label>
                                <input id="landmark" className={styles.input} value={asText(form.landmark)} onChange={(event) => set("landmark", event.target.value)} />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label} htmlFor="cuisine">
                                    Cuisine (ex : camerounaise, pizza)
                                </label>
                                <input id="cuisine" className={styles.input} value={asText(form.cuisine)} onChange={(event) => set("cuisine", event.target.value)} />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label} htmlFor="description">
                                    Description
                                </label>
                                <textarea id="description" className={styles.textarea} value={asText(form.description)} onChange={(event) => set("description", event.target.value)} />
                            </div>
                            <div className={styles.grid2}>
                                <div className={styles.field}>
                                    <label className={styles.label} htmlFor="website">
                                        Site web
                                    </label>
                                    <input id="website" className={styles.input} value={asText(form.website)} onChange={(event) => set("website", event.target.value)} />
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label} htmlFor="instagram">
                                        Instagram
                                    </label>
                                    <input id="instagram" className={styles.input} value={asText(form.instagram)} onChange={(event) => set("instagram", event.target.value)} />
                                </div>
                            </div>
                        </section>

                        <section className={styles.card}>
                            <h2 className={styles.cardTitle}>Ambiance</h2>
                            {(Object.keys(LIST_FIELDS) as (keyof typeof LIST_FIELDS)[]).map((key) => {
                                const values = (form[key] as string[]) ?? [];
                                return (
                                    <div key={key} className={styles.field}>
                                        <span className={styles.label}>{LIST_LABELS[key]}</span>
                                        <div className={styles.chips}>
                                            {Object.entries(LIST_FIELDS[key]).map(([value, label]) => {
                                                const on = values.includes(value);
                                                return (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        className={`${styles.chip} ${on ? styles.chipOn : ""}`}
                                                        aria-pressed={on}
                                                        onClick={() => set(key, on ? values.filter((item) => item !== value) : [...values, value])}
                                                    >
                                                        {label.fr}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                            <label className={styles.check}>
                                <input type="checkbox" checked={verifiedToday} onChange={(event) => setVerifiedToday(event.target.checked)} />
                                J&apos;ai vérifié ces infos sur place aujourd&apos;hui
                            </label>
                        </section>
                    </>
                )}
            </div>

            <div className={styles.saveBar}>
                <div className={styles.saveInner}>
                    <p className={`${styles.message} ${message?.error ? styles.error : ""}`} role="status">
                        {message?.text ?? (dirty ? "Modifications non enregistrées" : "")}
                    </p>
                    <button type="button" className={`${styles.button} ${styles.primary}`} disabled={!dirty || saving} onClick={() => void save()}>
                        {saving ? "Enregistrement…" : "Enregistrer"}
                    </button>
                </div>
            </div>
        </main>
    );
}

export default function TerrainPage() {
    return (
        <Suspense>
            <FieldKit />
        </Suspense>
    );
}
