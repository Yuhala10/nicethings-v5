"use client";

import { ImagePlus, Loader2, MapPin, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { compressImage } from "@/lib/compress-image";
import { fill } from "@/lib/i18n";
import { formatNumber } from "@/lib/i18n/format";
import { put, readVideo } from "@/lib/media-upload";
import { call, peekMe } from "@/lib/people/client";
import { COMPANIES, MAX_OUTING_BODY, MAX_OUTING_PHOTOS, MOODS } from "@/lib/people/rules";
import { MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, POST_TYPES } from "@/lib/posts";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";
import Sheet from "./Sheet";

// "Publier ma sortie", from anywhere (lib/people/client.ts, openOuting):
// where (a real place, searched by name), up to four photos or one short
// video, the mood, who with, what it cost, a few words. Photos are resized
// on the phone; files go straight to storage; the outing is online at once
// for a "Habitué" or more, or waits for the team for a newcomer.

type PlaceChoice = { slug: string; name: string; neighborhood: string | null; cover?: string | null };
type Picked = { file: File; kind: "photo" | "video"; preview: string; width: number; height: number; duration: number | null; poster: Blob | null };

export default function OutingComposer() {
    const { locale, t } = useLocale();
    const words = t.people.outing;
    const toast = useToast();
    const [open, setOpen] = useState(false);
    const [place, setPlace] = useState<PlaceChoice | null>(null);
    const [query, setQuery] = useState("");
    const [found, setFound] = useState<PlaceChoice[]>([]);
    const [media, setMedia] = useState<Picked[]>([]);
    const [mood, setMood] = useState<string | null>(null);
    const [company, setCompany] = useState<string | null>(null);
    const [price, setPrice] = useState("");
    const [body, setBody] = useState("");
    const [busy, setBusy] = useState<"preparing" | "sending" | null>(null);
    const [progress, setProgress] = useState(0);
    const [trouble, setTrouble] = useState<string | null>(null);
    const picker = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const onOpen = (event: Event) => {
            const detail = (event as CustomEvent<{ place?: PlaceChoice }>).detail ?? {};
            setPlace(detail.place ?? null);
            setQuery("");
            setFound([]);
            setMedia([]);
            setMood(null);
            setCompany(null);
            setPrice("");
            setBody("");
            setTrouble(null);
            setProgress(0);
            setOpen(true);
        };
        window.addEventListener("nt:outing", onOpen);
        return () => window.removeEventListener("nt:outing", onOpen);
    }, []);

    // The place, searched by name as it is typed; their city first.
    useEffect(() => {
        if (place || query.trim().length < 2) return;
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                const city = peekMe().me?.city ?? "";
                const answer = (await (await fetch(`/api/places?q=${encodeURIComponent(query)}&city=${city}`, { signal: controller.signal })).json()) as { places?: PlaceChoice[] };
                setFound(answer.places ?? []);
            } catch {}
        }, 250);
        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [query, place]);

    const choose = async (files: FileList | null) => {
        if (!files?.length) return;
        setTrouble(null);
        setBusy("preparing");
        try {
            const list = [...files];
            const video = list.find((file) => file.type.startsWith("video/"));
            if (video && (list.length > 1 || media.length)) throw new Error(words.tooMany);
            if (!video && media.some((item) => item.kind === "video")) throw new Error(words.tooMany);
            if (video) {
                if (!POST_TYPES[video.type]) throw new Error(t.wall.unreadable);
                if (video.size > MAX_VIDEO_BYTES) throw new Error(words.tooHeavy);
                const read = await readVideo(video);
                if (!Number.isFinite(read.duration) || read.duration > MAX_VIDEO_SECONDS + 1) throw new Error(words.tooLong);
                setMedia([{ file: video, kind: "video", preview: URL.createObjectURL(video), ...read }]);
            } else {
                const room = MAX_OUTING_PHOTOS - media.length;
                if (list.length > room) toast(words.tooMany);
                const photos: Picked[] = [];
                for (const file of list.slice(0, room)) {
                    const photo = await compressImage(file, 1600);
                    if (!POST_TYPES[photo.type]) continue;
                    const bitmap = await createImageBitmap(photo);
                    photos.push({ file: photo, kind: "photo", preview: URL.createObjectURL(photo), width: bitmap.width, height: bitmap.height, duration: null, poster: null });
                }
                setMedia((current) => [...current, ...photos]);
            }
        } catch (caught) {
            setTrouble((caught as Error).message || t.wall.unreadable);
        } finally {
            setBusy(null);
            if (picker.current) picker.current.value = "";
        }
    };

    const send = async () => {
        setTrouble(null);
        if (!place) return setTrouble(words.needPlace);
        if (!media.length) return setTrouble(words.needMedia);
        setBusy("sending");
        setProgress(0);
        const answer = await call<{ id: string; uploads: { media: { path: string; token: string }; poster: { path: string; token: string } | null }[] }>("/api/outings", "POST", {
            place: place.slug,
            mood,
            company,
            pricePaid: Number(price.replace(/\D/g, "")) || null,
            body,
            media: media.map((item) => ({ type: item.file.type, size: item.file.size, width: item.width, height: item.height, duration: item.duration, poster: Boolean(item.poster) })),
        });
        if (answer.ok === false) {
            setBusy(null);
            const reasons: Record<string, string> = { heavy: words.tooHeavy, long: words.tooLong, many: t.people.common.many, closed: t.people.common.closed, place: words.needPlace, media: words.tooMany };
            return setTrouble(reasons[answer.why] ?? t.people.common.failed);
        }
        try {
            const total = media.reduce((sum, item) => sum + item.file.size, 0) || 1;
            let done = 0;
            for (const [index, item] of media.entries()) {
                const slot = answer.uploads[index];
                if (slot.poster && item.poster) await put(slot.poster.path, slot.poster.token, item.poster, "image/jpeg");
                await put(slot.media.path, slot.media.token, item.file, item.file.type, (share) => setProgress((done + share * item.file.size) / total));
                done += item.file.size;
            }
            const confirmed = await call<{ status: string }>("/api/outings", "PATCH", { id: answer.id });
            if (confirmed.ok === false) throw new Error("failed");
            toast(confirmed.status === "PUBLISHED" ? words.online : words.waiting);
            window.dispatchEvent(new CustomEvent("nt:outing-posted", { detail: { id: answer.id, place: place.slug } }));
            setOpen(false);
        } catch {
            // The draft stays unseen; the files that arrived are cleaned with it.
            await call(`/api/outings?id=${answer.id}`, "DELETE");
            setTrouble(t.people.common.failed);
        } finally {
            setBusy(null);
        }
    };

    const chip = (selected: boolean) => `nt-chip h-9 text-[0.875rem] ${selected ? "" : ""}`;

    return (
        <Sheet open={open} onClose={() => busy !== "sending" && setOpen(false)} closeLabel={t.people.common.close} title={words.title} wide>
            <p className="text-[0.875rem] leading-relaxed text-text-2">{words.lead}</p>

            {/* Where */}
            <p className="mt-5 mb-2 text-[0.875rem] font-semibold">{words.place}</p>
            {place ? (
                <div className="flex items-center gap-3 rounded-[1rem] border border-line bg-surface p-3">
                    <MapPin size={18} className="shrink-0 text-brand-600" />
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[1rem] font-semibold">{place.name}</span>
                        {place.neighborhood && <span className="block truncate text-[0.75rem] text-muted">{place.neighborhood}</span>}
                    </span>
                    <button type="button" onClick={() => setPlace(null)} className="nt-tap text-[0.875rem] font-semibold text-brand-600">
                        {words.change}
                    </button>
                </div>
            ) : (
                <div>
                    <div className="flex h-12 items-center gap-2 rounded-[0.9rem] border-[1.5px] border-line-strong bg-surface px-3 focus-within:border-text-2">
                        <Search size={17} className="text-muted" />
                        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={words.placeSearch} className="min-w-0 flex-1 bg-transparent text-[1rem] outline-none" autoFocus />
                    </div>
                    {query.trim().length >= 2 && (
                        <ul className="mt-2 overflow-hidden rounded-[1rem] border border-line bg-surface divide-y divide-line">
                            {found.length === 0 ? (
                                <li className="px-4 py-3 text-[0.875rem] text-muted">{words.noPlace}</li>
                            ) : (
                                found.map((item) => (
                                    <li key={item.slug}>
                                        <button type="button" onClick={() => setPlace(item)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2">
                                            <MapPin size={15} className="shrink-0 text-muted" />
                                            <span className="min-w-0">
                                                <span className="block truncate text-[0.875rem] font-semibold">{item.name}</span>
                                                {item.neighborhood && <span className="block truncate text-[0.75rem] text-muted">{item.neighborhood}</span>}
                                            </span>
                                        </button>
                                    </li>
                                ))
                            )}
                        </ul>
                    )}
                </div>
            )}

            {/* Photos or a video */}
            <p className="mt-5 mb-1 text-[0.875rem] font-semibold">{words.media}</p>
            <p className="mb-2 text-[0.75rem] text-muted">{words.mediaHint}</p>
            <div className="grid grid-cols-4 gap-2">
                {media.map((item, index) => (
                    <div key={item.preview} className="relative aspect-square overflow-hidden rounded-[0.9rem] bg-surface-2">
                        {item.kind === "video" ? <video src={item.preview} muted loop autoPlay playsInline className="h-full w-full object-cover" /> : <img src={item.preview} alt="" className="h-full w-full object-cover" />}
                        <button type="button" onClick={() => setMedia((list) => list.filter((_, at) => at !== index))} aria-label={words.delete} className="absolute top-1 right-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white">
                            <X size={14} />
                        </button>
                    </div>
                ))}
                {media.length < MAX_OUTING_PHOTOS && !media.some((item) => item.kind === "video") && (
                    <button type="button" onClick={() => picker.current?.click()} disabled={busy !== null} className="grid aspect-square place-items-center rounded-[0.9rem] border-2 border-dashed border-line-strong text-muted transition hover:border-text-2 disabled:opacity-60">
                        {busy === "preparing" ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={22} />}
                    </button>
                )}
            </div>
            <input ref={picker} type="file" multiple accept="image/*,video/mp4,video/quicktime,video/webm" className="hidden" onChange={(event) => choose(event.target.files)} />

            {/* The vibe, who with, what it cost */}
            <p className="mt-5 mb-2 text-[0.875rem] font-semibold">{words.mood}</p>
            <div className="flex flex-wrap gap-2">
                {MOODS.map((key) => (
                    <button key={key} type="button" aria-pressed={mood === key} onClick={() => setMood(mood === key ? null : key)} className={chip(mood === key)}>
                        {words.moods[key]}
                    </button>
                ))}
            </div>
            <p className="mt-5 mb-2 text-[0.875rem] font-semibold">{words.with}</p>
            <div className="flex flex-wrap gap-2">
                {COMPANIES.map((key) => (
                    <button key={key} type="button" aria-pressed={company === key} onClick={() => setCompany(company === key ? null : key)} className={chip(company === key)}>
                        {t.people.companies[key]}
                    </button>
                ))}
            </div>
            <label htmlFor="outing-price" className="mt-5 mb-2 block text-[0.875rem] font-semibold">
                {words.paid}
            </label>
            <div className="flex items-center gap-2">
                <input
                    id="outing-price"
                    value={price}
                    inputMode="numeric"
                    onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, "").slice(0, 7);
                        setPrice(digits ? formatNumber(Number(digits), locale) : "");
                    }}
                    placeholder={t.people.reviews.paidPlaceholder}
                    className="nt-input max-w-[11rem]"
                />
                <span className="text-[0.875rem] font-semibold text-muted">{t.common.currency}</span>
            </div>
            <label htmlFor="outing-body" className="mt-5 mb-2 block text-[0.875rem] font-semibold">
                {words.body}
            </label>
            <textarea id="outing-body" value={body} onChange={(event) => setBody(event.target.value.slice(0, MAX_OUTING_BODY))} placeholder={words.bodyPlaceholder} rows={3} className="nt-input" />
            <p className="mt-3 text-[0.75rem] leading-relaxed text-muted">{words.consent}</p>

            {busy === "sending" && (
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                    <div className="nt-sunset h-full rounded-full transition-[width] duration-200" style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }} />
                </div>
            )}
            {trouble && (
                <p role="alert" className="mt-3 text-[0.875rem] font-semibold text-closed">
                    {trouble}
                </p>
            )}
            <button type="button" onClick={send} disabled={busy !== null} className="nt-btn nt-btn-primary sticky bottom-0 mt-5 w-full shadow-float disabled:opacity-60">
                {busy === "sending" ? fill(words.sending, { percent: Math.round(progress * 100) }) : words.send}
            </button>
        </Sheet>
    );
}
