"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, Check, ImagePlus, MapPin, Plus, Search, Send, Sparkles, X } from "lucide-react";
import { CITIES } from "@/lib/cities";
import { compressImage } from "@/lib/compress-image";
import { fill } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";

// A guest's notebook, written by the guest (app/[lang]/invitation). First
// their guest's card (a photo of them, their account, one sentence), which
// becomes their page once the notebook is out. Then, for each place: find
// it on NiceThings, or add it if the site does not have it yet (a guest's
// privilege), then their own pictures and why they go there.
// Nothing is published from here: sending hands the notebook to the team,
// which reads it and brings it out under the guest's name. What is being
// written is kept on the phone, so closing the page loses nothing.

type Found = { slug: string; name: string; area: string };
type Fresh = { name: string; city: string; where: string };
type Entry = { id: string; place: Found | null; fresh: Fresh | null; photos: string[]; words: string };
type Draft = { name: string; link: string; title: string; entries: Entry[]; handle: string; intro: string; portrait: string };
type Card = { handle: string; link: string; intro: string; portrait: string };

const MAX_PLACES = 10;
const MAX_PHOTOS = 3;
const FIELD = "h-12 w-full rounded-[0.9rem] border border-line-strong bg-surface px-4 text-[1rem] outline-none transition focus:border-brand-500";
const LABEL = "text-[0.875rem] font-semibold";
const empty = (id: string): Entry => ({ id, place: null, fresh: null, photos: [], words: "" });

function PlaceEntry({ index, entry, code, alone, onChange, onRemove }: { index: number; entry: Entry; code: string; alone: boolean; onChange: (entry: Entry) => void; onRemove: () => void }) {
    const { t } = useLocale();
    const toast = useToast();
    const picker = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Found[] | null>(null);
    const [sending, setSending] = useState(0); // pictures on their way

    // Look the place up as the guest types, once they pause.
    useEffect(() => {
        if (entry.place || entry.fresh || query.trim().length < 2) return;
        let cancelled = false;
        const timer = window.setTimeout(() => {
            fetch(`/api/invitations?code=${encodeURIComponent(code)}&q=${encodeURIComponent(query.trim())}`)
                .then((response) => (response.ok ? response.json() : null))
                .then((data: { places?: Found[] } | null) => !cancelled && setResults(data?.places ?? []))
                .catch(() => !cancelled && setResults([]));
        }, 280);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [query, code, entry.place, entry.fresh]);

    const addPictures = async (files: FileList | null) => {
        const chosen = [...(files ?? [])].slice(0, MAX_PHOTOS - entry.photos.length);
        if (!chosen.length) return;
        setSending(chosen.length);
        const added: string[] = [];
        for (const file of chosen) {
            try {
                const form = new FormData();
                form.set("code", code);
                form.set("file", await compressImage(file, 1800, 0.85));
                const answer = await fetch("/api/invitations/photo", { method: "POST", body: form });
                const data = (await answer.json().catch(() => null)) as { ok?: boolean; url?: string; why?: string } | null;
                if (data?.ok && data.url) added.push(data.url);
                else toast(data?.why === "many" ? t.invitation.tooManyPictures : t.invitation.pictureFailed);
            } catch {
                toast(t.invitation.pictureFailed);
            }
            setSending((left) => Math.max(0, left - 1));
        }
        if (added.length) onChange({ ...entry, photos: [...entry.photos, ...added].slice(0, MAX_PHOTOS) });
        if (picker.current) picker.current.value = "";
    };

    const chosen = entry.place ?? (entry.fresh ? { name: entry.fresh.name, area: CITIES.find((city) => city.slug === entry.fresh!.city)?.name ?? "" } : null);

    return (
        <li className="rounded-[1.6rem] border border-line bg-bg p-5 md:p-7">
            <div className="flex items-start justify-between gap-4">
                <p className="nt-serif text-[2.25rem] leading-none text-brand-600">{index + 1}</p>
                {!alone && (
                    <button type="button" onClick={onRemove} aria-label={t.invitation.removePlace} className="nt-tap grid h-11 w-11 place-items-center rounded-full text-muted transition hover:bg-surface-2">
                        <X size={18} />
                    </button>
                )}
            </div>

            {entry.place ? (
                // A place the site already has.
                <div className="mt-3 flex items-center gap-3 rounded-[1.1rem] bg-surface-2 p-4">
                    <MapPin size={18} className="shrink-0 text-brand-600" />
                    <p className="min-w-0 flex-1">
                        <span className="block truncate text-[1.125rem] font-semibold">{entry.place.name}</span>
                        <span className="block truncate text-[0.875rem] text-muted">{entry.place.area}</span>
                    </p>
                    <button type="button" onClick={() => onChange({ ...entry, place: null })} className="nt-tap shrink-0 text-[0.875rem] font-semibold text-muted underline-offset-4 hover:underline">
                        {t.invitation.change}
                    </button>
                </div>
            ) : entry.fresh ? (
                // A place the guest brings to the site.
                <div className="mt-3 grid gap-3">
                    <p className="flex items-center gap-2 text-[0.875rem] font-semibold text-brand-600">
                        <Sparkles size={15} />
                        {t.invitation.newPlaceBadge}
                    </p>
                    <label className="grid gap-1.5">
                        <span className={LABEL}>{t.invitation.newPlaceName}</span>
                        <input value={entry.fresh.name} onChange={(event) => onChange({ ...entry, fresh: { ...entry.fresh!, name: event.target.value } })} maxLength={120} className={FIELD} />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
                        <label className="grid gap-1.5">
                            <span className={LABEL}>{t.invitation.newPlaceCity}</span>
                            <select value={entry.fresh.city} onChange={(event) => onChange({ ...entry, fresh: { ...entry.fresh!, city: event.target.value } })} className={FIELD}>
                                {CITIES.map((city) => (
                                    <option key={city.slug} value={city.slug}>
                                        {city.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="grid gap-1.5">
                            <span className={LABEL}>{t.invitation.newPlaceWhere}</span>
                            <input value={entry.fresh.where} onChange={(event) => onChange({ ...entry, fresh: { ...entry.fresh!, where: event.target.value } })} maxLength={200} placeholder={t.invitation.newPlaceWhereHint} className={FIELD} />
                        </label>
                    </div>
                    <button type="button" onClick={() => onChange({ ...entry, fresh: null })} className="nt-tap justify-self-start text-[0.875rem] font-semibold text-muted underline-offset-4 hover:underline">
                        {t.invitation.searchInstead}
                    </button>
                </div>
            ) : (
                // Looking for it.
                <div className="mt-3">
                    <label className="grid gap-1.5">
                        <span className={LABEL}>{t.invitation.whichPlace}</span>
                        <span className="relative block">
                            <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
                            <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={80} placeholder={t.invitation.searchHint} className={`${FIELD} pl-11`} />
                        </span>
                    </label>
                    {query.trim().length >= 2 && results !== null && (
                        <ul className="mt-2 overflow-hidden rounded-[1.1rem] border border-line">
                            {results.map((place) => (
                                <li key={place.slug} className="border-b border-line last:border-b-0">
                                    <button type="button" onClick={() => onChange({ ...entry, place })} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-surface-2">
                                        <MapPin size={16} className="shrink-0 text-muted" />
                                        <span className="min-w-0">
                                            <span className="block truncate text-[1rem] font-semibold">{place.name}</span>
                                            <span className="block truncate text-[0.875rem] text-muted">{place.area}</span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                            <li>
                                {/* The guest's privilege: a place the site does not have yet. */}
                                <button type="button" onClick={() => onChange({ ...entry, fresh: { name: query.trim().slice(0, 120), city: CITIES[0].slug, where: "" } })} className="flex min-h-14 w-full items-center gap-3 bg-surface-2 px-4 py-2 text-left transition hover:bg-surface-3">
                                    <Plus size={16} className="shrink-0 text-brand-600" />
                                    <span className="min-w-0">
                                        <span className="block truncate text-[1rem] font-semibold">{fill(t.invitation.addNew, { name: query.trim() })}</span>
                                        <span className="block text-[0.875rem] text-muted">{t.invitation.addNewHint}</span>
                                    </span>
                                </button>
                            </li>
                        </ul>
                    )}
                </div>
            )}

            {chosen && (
                <>
                    <div className="mt-5">
                        <p className={LABEL}>{t.invitation.pictures}</p>
                        <p className="mt-0.5 text-[0.875rem] text-muted">{t.invitation.picturesHint}</p>
                        <ul className="mt-3 flex flex-wrap gap-2.5">
                            {entry.photos.map((url) => (
                                <li key={url} className="relative h-24 w-24 overflow-hidden rounded-[0.9rem] bg-surface-2">
                                    <img src={url} alt="" className="h-full w-full object-cover" />
                                    <button type="button" onClick={() => onChange({ ...entry, photos: entry.photos.filter((item) => item !== url) })} aria-label={t.invitation.removePicture} className="absolute top-1 right-1 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white">
                                        <X size={15} />
                                    </button>
                                </li>
                            ))}
                            {Array.from({ length: sending }, (_, slot) => (
                                <li key={`sending-${slot}`} className="nt-skeleton h-24 w-24 rounded-[0.9rem]" aria-hidden />
                            ))}
                            {entry.photos.length + sending < MAX_PHOTOS && (
                                <li>
                                    <button type="button" onClick={() => picker.current?.click()} className="grid h-24 w-24 place-items-center rounded-[0.9rem] border border-dashed border-line-strong text-muted transition hover:border-brand-500 hover:text-brand-600" aria-label={t.invitation.addPicture}>
                                        <ImagePlus size={22} />
                                    </button>
                                </li>
                            )}
                        </ul>
                        <input ref={picker} type="file" accept="image/*" multiple hidden onChange={(event) => void addPictures(event.target.files)} />
                    </div>
                    <label className="mt-5 grid gap-1.5">
                        <span className={LABEL}>{fill(t.invitation.why, { name: chosen.name })}</span>
                        <textarea
                            value={entry.words}
                            onChange={(event) => onChange({ ...entry, words: event.target.value })}
                            maxLength={900}
                            rows={4}
                            placeholder={t.invitation.whyHint}
                            className="w-full rounded-[0.9rem] border border-line-strong bg-surface px-4 py-3 text-[1rem] leading-relaxed outline-none transition focus:border-brand-500"
                        />
                    </label>
                </>
            )}
        </li>
    );
}

// Their photo: one picture of them, sent through the invitation like the others.
function Portrait({ code, url, onChange }: { code: string; url: string; onChange: (url: string) => void }) {
    const { t } = useLocale();
    const toast = useToast();
    const picker = useRef<HTMLInputElement>(null);
    const [sending, setSending] = useState(false);
    const choose = async (files: FileList | null) => {
        const file = files?.[0];
        if (!file) return;
        setSending(true);
        try {
            const form = new FormData();
            form.set("code", code);
            form.set("file", await compressImage(file, 1600, 0.86));
            const answer = await fetch("/api/invitations/photo", { method: "POST", body: form });
            const data = (await answer.json().catch(() => null)) as { ok?: boolean; url?: string; why?: string } | null;
            if (data?.ok && data.url) onChange(data.url);
            else toast(data?.why === "many" ? t.invitation.tooManyPictures : t.invitation.pictureFailed);
        } catch {
            toast(t.invitation.pictureFailed);
        }
        setSending(false);
        if (picker.current) picker.current.value = "";
    };
    return (
        <div className="flex items-center gap-4">
            <button type="button" onClick={() => picker.current?.click()} className="relative h-28 w-[5.25rem] shrink-0 overflow-hidden rounded-t-[999px] rounded-b-[0.9rem] border border-[#d9bc8c] bg-surface p-1" aria-label={url ? t.invitation.portraitChange : t.invitation.portraitAdd}>
                <span className="relative block h-full w-full overflow-hidden rounded-t-[999px] rounded-b-[0.7rem] bg-surface-2">
                    {sending ? <span className="nt-skeleton absolute inset-0" aria-hidden /> : url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <Camera size={22} className="absolute inset-0 m-auto text-muted" />}
                </span>
            </button>
            <div className="min-w-0">
                <p className={LABEL}>{t.invitation.portrait}</p>
                <p className="mt-0.5 text-[0.875rem] leading-snug text-muted">{t.invitation.portraitHint}</p>
                <button type="button" onClick={() => picker.current?.click()} className="nt-tap mt-1 min-h-11 text-[0.875rem] font-semibold text-brand-600 underline-offset-4 hover:underline">
                    {url ? t.invitation.portraitChange : t.invitation.portraitAdd}
                </button>
            </div>
            <input ref={picker} type="file" accept="image/*" hidden onChange={(event) => void choose(event.target.files)} />
        </div>
    );
}

export default function NotebookComposer({ code, guest, card = null }: { code: string; guest: string; card?: Card | null }) {
    const { locale, t } = useLocale();
    const toast = useToast();
    const counter = useRef(1);
    const [draft, setDraft] = useState<Draft>({ name: guest, link: card?.link ?? "", title: "", entries: [empty("p1")], handle: card?.handle ?? "", intro: card?.intro ?? "", portrait: card?.portrait ?? "" });
    const [agree, setAgree] = useState(false);
    const [state, setState] = useState<"writing" | "sending" | "sent">("writing");
    const [restored, setRestored] = useState(false);
    // The notebook being written stays on this phone, under this invitation.
    const storageKey = `nt_carnet_${code.slice(-14)}`;

    useEffect(() => {
        try {
            const kept = JSON.parse(localStorage.getItem(storageKey) ?? "null") as Draft | null;
            if (kept && Array.isArray(kept.entries) && kept.entries.length) {
                counter.current = kept.entries.length + 1;
                setDraft({
                    name: kept.name || guest,
                    link: kept.link ?? card?.link ?? "",
                    title: kept.title ?? "",
                    entries: kept.entries.map((entry, index) => ({ ...empty(`p${index + 1}`), ...entry, id: `p${index + 1}` })),
                    handle: kept.handle ?? card?.handle ?? "",
                    intro: kept.intro ?? card?.intro ?? "",
                    portrait: kept.portrait ?? card?.portrait ?? "",
                });
            }
        } catch {
            // Nothing kept, or nothing readable: a blank notebook.
        }
        setRestored(true);
    }, [storageKey, guest]);

    useEffect(() => {
        if (!restored || state !== "writing") return;
        try {
            localStorage.setItem(storageKey, JSON.stringify(draft));
        } catch {
            // Not kept: the notebook still works, it just does not survive a closed page.
        }
    }, [draft, restored, state, storageKey]);

    const setEntry = (id: string, next: Entry) => setDraft((current) => ({ ...current, entries: current.entries.map((entry) => (entry.id === id ? next : entry)) }));
    const ready = (entry: Entry) => Boolean((entry.place || (entry.fresh && entry.fresh.name.trim().length >= 2)) && (entry.words.trim() || entry.photos.length));
    const filled = draft.entries.filter(ready);

    const send = async () => {
        if (state !== "writing") return;
        if (filled.length === 0) return toast(t.invitation.needPlace);
        if (!agree) return toast(t.invitation.needAgree);
        setState("sending");
        try {
            const answer = await fetch("/api/invitations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code,
                    name: draft.name,
                    link: draft.link.trim(),
                    handle: draft.handle.trim(),
                    intro: draft.intro,
                    portrait: draft.portrait || null,
                    title: draft.title,
                    agree: true,
                    places: filled.map((entry) => ({ slug: entry.place?.slug ?? null, fresh: entry.fresh, photos: entry.photos, words: entry.words })),
                }),
            });
            const data = (await answer.json().catch(() => null)) as { ok?: boolean; why?: string } | null;
            if (!data?.ok) {
                toast(data?.why === "many" ? t.invitation.tooManyNotebooks : data?.why === "invitation" ? t.invitation.expiredShort : t.invitation.sendFailed);
                setState("writing");
                return;
            }
            try {
                localStorage.removeItem(storageKey);
            } catch {
                // Nothing to clear.
            }
            setState("sent");
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch {
            toast(t.invitation.sendFailed);
            setState("writing");
        }
    };

    if (state === "sent") {
        return (
            <div className="mx-auto max-w-2xl rounded-[2rem] bg-contrast px-6 py-12 text-center text-on-contrast md:px-12 md:py-16">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/10">
                    <Check size={26} />
                </span>
                <p className="nt-serif mt-6 text-[2.75rem] leading-[1]">{fill(t.invitation.sentTitle, { name: draft.name })}</p>
                <p className="mx-auto mt-4 max-w-md text-[1.125rem] leading-relaxed opacity-80">{t.invitation.sentBody}</p>
                <Link href={paths.guests(locale)} className="nt-btn mt-8 border border-white/25 text-white hover:bg-white/10">
                    {t.guest.all}
                    <ArrowRight size={16} />
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl">
            <div className="grid gap-4 rounded-[1.6rem] border border-[#d9bc8c]/70 bg-surface-2 p-5 md:p-7">
                <div>
                    <p className="text-[0.75rem] font-bold tracking-[0.2em] text-[#a8824a] uppercase">{t.invitation.cardEyebrow}</p>
                    <p className="mt-1 text-[0.875rem] leading-relaxed text-muted">{t.invitation.cardLead}</p>
                </div>
                <Portrait code={code} url={draft.portrait} onChange={(portrait) => setDraft((current) => ({ ...current, portrait }))} />
                <label className="grid gap-1.5">
                    <span className={LABEL}>{t.invitation.yourName}</span>
                    <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength={60} autoComplete="name" className={FIELD} />
                </label>
                <label className="grid gap-1.5">
                    <span className={LABEL}>{t.invitation.yourHandle}</span>
                    <input value={draft.handle} onChange={(event) => setDraft({ ...draft, handle: event.target.value })} maxLength={120} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="@…" className={FIELD} />
                </label>
                <label className="grid gap-1.5">
                    <span className={LABEL}>{t.invitation.yourLink}</span>
                    <input value={draft.link} onChange={(event) => setDraft({ ...draft, link: event.target.value })} maxLength={200} inputMode="url" placeholder="https://www.tiktok.com/@…" className={FIELD} />
                </label>
                <label className="grid gap-1.5">
                    <span className={LABEL}>{t.invitation.yourIntro}</span>
                    <input value={draft.intro} onChange={(event) => setDraft({ ...draft, intro: event.target.value })} maxLength={160} placeholder={t.invitation.yourIntroHint} className={FIELD} />
                </label>
                <label className="grid gap-1.5">
                    <span className={LABEL}>{t.invitation.notebookTitle}</span>
                    <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={120} placeholder={t.invitation.notebookTitleHint} className={FIELD} />
                </label>
            </div>

            <ol className="mt-4 grid gap-4">
                {draft.entries.map((entry, index) => (
                    <PlaceEntry key={entry.id} index={index} entry={entry} code={code} alone={draft.entries.length === 1} onChange={(next) => setEntry(entry.id, next)} onRemove={() => setDraft((current) => ({ ...current, entries: current.entries.filter((item) => item.id !== entry.id) }))} />
                ))}
            </ol>
            {draft.entries.length < MAX_PLACES && (
                <button type="button" onClick={() => setDraft((current) => ({ ...current, entries: [...current.entries, empty(`p${++counter.current}`)] }))} className="nt-btn nt-btn-outline mt-4 w-full">
                    <Plus size={17} />
                    {t.invitation.addPlace}
                </button>
            )}

            <label className="mt-8 flex cursor-pointer items-start gap-3 rounded-[1.25rem] border border-line p-4">
                <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-brand-600)]" />
                <span className="text-[1rem] leading-relaxed text-text-2">{t.invitation.agree}</span>
            </label>
            <button type="button" onClick={() => void send()} disabled={state === "sending"} className="nt-btn nt-btn-primary mt-4 h-14 w-full text-[1.125rem] disabled:opacity-60">
                <Send size={18} />
                {state === "sending" ? t.invitation.sending : t.invitation.send}
            </button>
            <p className="mt-3 text-center text-[0.875rem] text-muted">{t.invitation.afterSend}</p>
        </div>
    );
}
