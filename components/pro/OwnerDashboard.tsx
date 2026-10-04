"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Eye, ImagePlus, LocateFixed, Navigation, Plus, Star, Trash2, Users } from "lucide-react";
import { compressImage } from "@/lib/compress-image";
import { formatRelativeDays } from "@/lib/i18n/format";
import { paths } from "@/lib/places/paths";
import { DAY_KEYS, type DayKey } from "@/lib/places/types";
import { AMENITIES, CATEGORIES, GOOD_FOR, VIBES } from "@/lib/tags";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";
import GoogleButton from "./GoogleButton";
import { proCall } from "./useOwner";

type MenuItem = { name: string; description: string | null; price: number | string; popular: boolean; available: boolean };
type Data = {
    role: string;
    place: Record<string, unknown> & { id: string; slug: string; name: string; category: string; verified: boolean };
    photos: { id: string; image_url: string; sort_order: number }[];
    menu: MenuItem[];
    history: { field: string; label: string; status: string; created_at: string }[];
    stats: { views: number; visitors: number; directions: number };
};
type Tab = "info" | "hours" | "menu" | "photos" | "vibe" | "fix";

const value = (data: Record<string, unknown>, key: string) => (data[key] === null || data[key] === undefined ? "" : String(data[key]));

// The owner's control room: their numbers, then one tab per kind of info.
// Every save goes live at once and is kept in the history.
export default function OwnerDashboard({ slug }: { slug: string }) {
    const { locale, t } = useLocale();
    const toast = useToast();
    const [data, setData] = useState<Data | null>(null);
    const [state, setState] = useState<"loading" | "signedOut" | "denied" | "ready">("loading");
    const [tab, setTab] = useState<Tab>("info");
    const [draft, setDraft] = useState<Record<string, unknown>>({});
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [busy, setBusy] = useState(false);
    const [fix, setFix] = useState({ name: "", category: "", address: "", note: "", lat: null as number | null, lng: null as number | null });
    const photoInput = useRef<HTMLInputElement>(null);

    const load = async () => {
        const response = await fetch(`/api/pro/places/${slug}`, { cache: "no-store" });
        if (response.status === 401) return setState("signedOut");
        if (!response.ok) return setState("denied");
        const body = (await response.json()) as Data;
        setData(body);
        setDraft(body.place);
        setMenu(body.menu);
        setState("ready");
    };

    useEffect(() => {
        void load();
    }, [slug]);

    const save = async (fields: string[]) => {
        setBusy(true);
        try {
            await proCall(`places/${slug}`, { method: "PATCH", body: JSON.stringify(Object.fromEntries(fields.map((field) => [field, draft[field] === "" ? null : draft[field]]))) });
            toast(t.owner.saved);
            await load();
        } catch (error) {
            toast((error as Error).message);
        } finally {
            setBusy(false);
        }
    };

    if (state === "loading") return <div className="mx-auto max-w-3xl px-4 pt-8 md:px-6"><div className="nt-skeleton h-72 rounded-3xl" /></div>;
    if (state === "signedOut") {
        return (
            <div className="mx-auto max-w-md px-4 pt-10 md:px-6">
                <GoogleButton next={paths.manage(locale, slug)} />
            </div>
        );
    }
    if (state === "denied" || !data) {
        return (
            <div className="mx-auto max-w-md px-4 pt-10 text-center md:px-6">
                <p className="font-semibold">{t.owner.notOwner}</p>
                <Link href={paths.pro(locale)} className="nt-btn nt-btn-soft mt-4">
                    {t.pro.title}
                </Link>
            </div>
        );
    }

    const input = (field: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
        <label className="grid gap-1.5">
            <span className="text-sm font-semibold">{label}</span>
            <input value={value(draft, field)} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })} className="nt-input" {...props} />
        </label>
    );
    const saveButton = (fields: string[]) => (
        <button type="button" disabled={busy} onClick={() => save(fields)} className="nt-btn nt-btn-primary h-12 w-full sm:w-auto">
            {busy ? t.owner.saving : t.owner.save}
        </button>
    );
    const toggleTag = (field: string, key: string) => {
        const list = (draft[field] as string[] | null) ?? [];
        setDraft({ ...draft, [field]: list.includes(key) ? list.filter((item) => item !== key) : [...list, key] });
    };

    const tabs: [Tab, string][] = [
        ["info", t.owner.tabs.info],
        ["hours", t.owner.tabs.hours],
        ["menu", t.owner.tabs.menu],
        ["photos", t.owner.tabs.photos],
        ["vibe", t.owner.tabs.vibe],
        ["fix", t.owner.tabs.fix],
    ];

    return (
        <div className="mx-auto max-w-3xl px-4 pt-6 pb-12 md:px-6 md:pt-10">
            <header className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                    <p className="nt-eyebrow">{t.pro.title}</p>
                    <h1 className="flex items-center gap-2 font-display text-[1.7rem] leading-tight font-extrabold md:text-3xl">
                        <span className="truncate">{data.place.name}</span>
                        <BadgeCheck size={24} className="shrink-0 text-open" />
                    </h1>
                </div>
                <Link href={paths.place(locale, slug)} className="nt-btn nt-btn-soft h-11 px-4 text-sm">
                    <Eye size={16} />
                    {t.owner.viewPage}
                </Link>
            </header>

            <section className="mt-6 rounded-[1.8rem] bg-ink p-5 text-white">
                <p className="text-xs font-bold tracking-wider text-white/60 uppercase">{t.owner.stats}</p>
                <dl className="mt-3 grid grid-cols-3 gap-3">
                    {(
                        [
                            [Eye, data.stats.views, t.owner.views],
                            [Users, data.stats.visitors, t.owner.visitors],
                            [Navigation, data.stats.directions, t.owner.directions],
                        ] as const
                    ).map(([Icon, count, label]) => (
                        <div key={label} className="rounded-2xl bg-white/[0.07] p-3">
                            <Icon size={18} className="text-brand-400" />
                            <dd className="mt-2 font-display text-3xl font-extrabold">{count.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB")}</dd>
                            <dt className="text-xs font-semibold text-white/60">{label}</dt>
                        </div>
                    ))}
                </dl>
            </section>

            <nav className="nt-scroll-x -mx-4 mt-6 flex gap-2 px-4 md:mx-0 md:px-0" aria-label="Sections">
                {tabs.map(([key, label]) => (
                    <button key={key} type="button" className="nt-chip" aria-pressed={tab === key} onClick={() => setTab(key)}>
                        {label}
                    </button>
                ))}
            </nav>

            <div className="mt-5 grid gap-4 rounded-[1.8rem] border border-line bg-surface p-5 shadow-card">
                {tab === "info" && (
                    <>
                        <label className="grid gap-1.5">
                            <span className="text-sm font-semibold">{t.owner.description}</span>
                            <textarea value={value(draft, "description")} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={5} maxLength={1500} placeholder={t.owner.descriptionHint} className="nt-input" />
                        </label>
                        {data.place.category === "Restaurant" && input("cuisine", t.owner.cuisine)}
                        <div className="grid gap-4 sm:grid-cols-2">
                            {input("phone", t.owner.phone, { type: "tel", inputMode: "tel" })}
                            {input("whatsapp", t.owner.whatsapp, { type: "tel", inputMode: "tel" })}
                            {input("website", t.owner.website, { inputMode: "url", placeholder: "https://…" })}
                            {input("instagram", t.owner.instagram, { placeholder: "@…" })}
                        </div>
                        {saveButton(["description", "cuisine", "phone", "whatsapp", "website", "instagram"])}
                    </>
                )}

                {tab === "hours" && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            {input("opening_time", t.owner.opens, { type: "time" })}
                            {input("closing_time", t.owner.closes, { type: "time" })}
                        </div>
                        <fieldset>
                            <legend className="mb-2 text-sm font-semibold">{t.owner.openDays}</legend>
                            <div className="flex flex-wrap gap-2">
                                {DAY_KEYS.map((day: DayKey) => {
                                    const key = `${day}_open`;
                                    const on = draft[key] !== false;
                                    return (
                                        <button key={day} type="button" aria-pressed={on} onClick={() => setDraft({ ...draft, [key]: !on })} className="nt-chip">
                                            {t.days[day]}
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>
                        {saveButton(["opening_time", "closing_time", ...DAY_KEYS.map((day) => `${day}_open`)])}
                    </>
                )}

                {tab === "menu" && (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {input("minimum_price", t.owner.priceMin, { inputMode: "numeric" })}
                            {input("maximum_price", t.owner.priceMax, { inputMode: "numeric" })}
                        </div>
                        {saveButton(["minimum_price", "maximum_price"])}
                        <hr className="border-line" />
                        <div>
                            <p className="font-display text-lg font-extrabold">{t.owner.menu}</p>
                            <p className="text-sm text-muted">{t.owner.menuHint}</p>
                        </div>
                        <ul className="grid gap-3">
                            {menu.map((item, index) => (
                                <li key={index} className="grid gap-2 rounded-2xl bg-surface-2 p-3">
                                    <div className="flex gap-2">
                                        <input value={item.name} onChange={(event) => setMenu(menu.map((row, at) => (at === index ? { ...row, name: event.target.value } : row)))} placeholder={t.owner.itemName} className="nt-input h-11 flex-1" />
                                        <input
                                            value={String(item.price)}
                                            onChange={(event) => setMenu(menu.map((row, at) => (at === index ? { ...row, price: event.target.value.replace(/[^\d]/g, "") } : row)))}
                                            inputMode="numeric"
                                            placeholder={t.owner.itemPrice}
                                            className="nt-input h-11 w-28"
                                        />
                                        <button type="button" onClick={() => setMenu(menu.filter((_, at) => at !== index))} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted hover:text-closed" aria-label={t.owner.deletePhoto}>
                                            <Trash2 size={17} />
                                        </button>
                                    </div>
                                    <input
                                        value={item.description ?? ""}
                                        onChange={(event) => setMenu(menu.map((row, at) => (at === index ? { ...row, description: event.target.value } : row)))}
                                        placeholder={t.owner.itemDescription}
                                        className="nt-input h-10 text-sm"
                                    />
                                    <div className="flex gap-4 text-sm font-semibold">
                                        <label className="flex items-center gap-1.5">
                                            <input type="checkbox" checked={item.popular} onChange={(event) => setMenu(menu.map((row, at) => (at === index ? { ...row, popular: event.target.checked } : row)))} />
                                            <Star size={14} className="text-brand-500" />
                                            {t.owner.popular}
                                        </label>
                                        <label className="flex items-center gap-1.5">
                                            <input type="checkbox" checked={item.available} onChange={(event) => setMenu(menu.map((row, at) => (at === index ? { ...row, available: event.target.checked } : row)))} />
                                            {t.owner.available}
                                        </label>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => setMenu([...menu, { name: "", description: null, price: "", popular: false, available: true }])} className="nt-btn nt-btn-soft h-11 text-sm">
                                <Plus size={16} />
                                {t.owner.addItem}
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={async () => {
                                    setBusy(true);
                                    try {
                                        await proCall(`places/${slug}/menu`, { method: "PUT", body: JSON.stringify({ items: menu }) });
                                        toast(t.owner.saved);
                                        await load();
                                    } catch (error) {
                                        toast((error as Error).message);
                                    } finally {
                                        setBusy(false);
                                    }
                                }}
                                className="nt-btn nt-btn-primary h-11 text-sm"
                            >
                                {t.owner.saveMenu}
                            </button>
                        </div>
                    </>
                )}

                {tab === "photos" && (
                    <>
                        <p className="text-sm text-muted">{t.owner.photosHint}</p>
                        <ul className="nt-masonry columns-2 sm:columns-3">
                            {data.photos.map((photo, index) => (
                                <li key={photo.id} className="group relative overflow-hidden rounded-2xl">
                                    <img src={photo.image_url} alt="" className="w-full" />
                                    {index === 0 && <span className="nt-sunset absolute top-2 left-2 rounded-full px-2.5 py-1 text-xs font-bold text-white">{t.owner.cover}</span>}
                                    <div className="absolute inset-x-2 bottom-2 flex gap-1.5">
                                        {index > 0 && (
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    await proCall(`places/${slug}/photos`, { method: "PATCH", body: JSON.stringify({ order: [photo.id, ...data.photos.filter((item) => item.id !== photo.id).map((item) => item.id)] }) });
                                                    await load();
                                                }}
                                                className="flex-1 rounded-full bg-white/90 px-2 py-1.5 text-xs font-bold text-ink backdrop-blur"
                                            >
                                                {t.owner.makeCover}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!window.confirm(`${t.owner.deletePhoto} ?`)) return;
                                                await proCall(`places/${slug}/photos?id=${photo.id}`, { method: "DELETE" });
                                                await load();
                                            }}
                                            className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-closed backdrop-blur"
                                            aria-label={t.owner.deletePhoto}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <input
                            ref={photoInput}
                            type="file"
                            accept="image/*"
                            multiple
                            hidden
                            onChange={async (event) => {
                                const files = [...(event.target.files ?? [])];
                                event.target.value = "";
                                setBusy(true);
                                try {
                                    for (const file of files) {
                                        const body = new FormData();
                                        body.set("file", await compressImage(file));
                                        await proCall(`places/${slug}/photos`, { method: "POST", body });
                                    }
                                    toast(t.owner.saved);
                                } catch (error) {
                                    toast((error as Error).message);
                                } finally {
                                    setBusy(false);
                                    await load();
                                }
                            }}
                        />
                        <button type="button" disabled={busy} onClick={() => photoInput.current?.click()} className="nt-btn nt-btn-primary h-12">
                            <ImagePlus size={18} />
                            {busy ? t.owner.saving : t.owner.addPhoto}
                        </button>
                    </>
                )}

                {tab === "vibe" && (
                    <>
                        {(
                            [
                                ["vibes", t.owner.vibes, VIBES],
                                ["good_for", t.owner.goodFor, GOOD_FOR],
                                ["amenities", t.owner.amenities, AMENITIES],
                            ] as const
                        ).map(([field, label, vocabulary]) => (
                            <fieldset key={field}>
                                <legend className="mb-2 text-sm font-semibold">{label}</legend>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(vocabulary).map(([key, tag]) => (
                                        <button key={key} type="button" className="nt-chip" aria-pressed={((draft[field] as string[] | null) ?? []).includes(key)} onClick={() => toggleTag(field, key)}>
                                            {tag[locale]}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>
                        ))}
                        {saveButton(["vibes", "good_for", "amenities"])}
                    </>
                )}

                {tab === "fix" && (
                    <form
                        className="grid gap-4"
                        onSubmit={async (event) => {
                            event.preventDefault();
                            setBusy(true);
                            try {
                                await proCall(`places/${slug}`, { method: "POST", body: JSON.stringify(fix) });
                                toast(t.owner.fixSent);
                                setFix({ name: "", category: "", address: "", note: "", lat: null, lng: null });
                            } catch (error) {
                                toast((error as Error).message);
                            } finally {
                                setBusy(false);
                            }
                        }}
                    >
                        <div>
                            <p className="font-display text-lg font-extrabold">{t.owner.fixTitle}</p>
                            <p className="text-sm text-muted">{t.owner.fixBody}</p>
                        </div>
                        <label className="grid gap-1.5">
                            <span className="text-sm font-semibold">{t.owner.fixName}</span>
                            <input value={fix.name} onChange={(event) => setFix({ ...fix, name: event.target.value })} placeholder={data.place.name} className="nt-input" />
                        </label>
                        <label className="grid gap-1.5">
                            <span className="text-sm font-semibold">{t.owner.fixCategory}</span>
                            <select value={fix.category} onChange={(event) => setFix({ ...fix, category: event.target.value })} className="nt-input">
                                <option value="">—</option>
                                {Object.entries(CATEGORIES).map(([key, label]) => (
                                    <option key={key} value={key}>
                                        {label[locale]}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="grid gap-1.5">
                            <span className="text-sm font-semibold">{t.owner.fixAddress}</span>
                            <input value={fix.address} onChange={(event) => setFix({ ...fix, address: event.target.value })} className="nt-input" />
                        </label>
                        <button
                            type="button"
                            onClick={() =>
                                navigator.geolocation?.getCurrentPosition(
                                    (position) => setFix({ ...fix, lat: position.coords.latitude, lng: position.coords.longitude }),
                                    () => toast(t.submit.denied),
                                    { enableHighAccuracy: true, timeout: 15000 }
                                )
                            }
                            className={`nt-btn h-11 text-sm ${fix.lat ? "bg-open/15 text-open" : "nt-btn-soft"}`}
                        >
                            <LocateFixed size={16} />
                            {fix.lat ? t.submit.pinned : t.owner.fixHere}
                        </button>
                        <label className="grid gap-1.5">
                            <span className="text-sm font-semibold">{t.owner.fixNote}</span>
                            <textarea value={fix.note} onChange={(event) => setFix({ ...fix, note: event.target.value })} rows={3} className="nt-input" />
                        </label>
                        <button type="submit" disabled={busy} className="nt-btn nt-btn-primary h-12">
                            {t.owner.fixSend}
                        </button>
                    </form>
                )}
            </div>

            {data.history.length > 0 && (
                <section className="mt-8">
                    <h2 className="nt-section-title mb-3">{t.owner.history}</h2>
                    <ul className="grid gap-1.5 text-sm">
                        {data.history.map((change, index) => (
                            <li key={index} className="flex justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2">
                                <span className="font-semibold">{change.label}</span>
                                <span className="text-muted">{formatRelativeDays(change.created_at, locale)}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
