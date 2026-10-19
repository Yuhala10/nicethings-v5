"use client";

import { Camera, ImagePlus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BACKDROPS, FAMILIES, FAMILY_NAMES, SKIN_SWATCHES, avatarCode, avatarUrl, parseAvatar, randomSeed, type Family } from "@/lib/people/avatars";
import type { Locale } from "@/lib/i18n";
import type { PeopleWords } from "@/lib/i18n/people";

// Choosing a face: a drawn avatar (a style, a skin tone, a background, and
// as many new faces as one wants), or one's own photo, framed with a finger
// and zoom. Nothing is sent from here: the choice goes back to the form.

export type FaceChoice = { kind: "avatar"; code: string } | { kind: "photo"; blob: Blob; url: string } | { kind: "kept"; url: string };

const BATCH = 12;
const FRAME = 260;
const OUT = 480;

type Seed = { family: Family; seed: string };

function freshSeeds(family: Family | "all", from = 0): Seed[] {
    return Array.from({ length: BATCH }, (_, index) => ({ family: family === "all" ? FAMILIES[(from + index) % FAMILIES.length] : family, seed: randomSeed() }));
}

export function faceUrl(choice: FaceChoice) {
    return choice.kind === "avatar" ? avatarUrl(choice.code) : choice.url;
}

// ---------------------------------------------------------------- photo

function PhotoFramer({ file, words, onDone, onCancel }: { file: File; words: PeopleWords; onDone: (blob: Blob) => void; onCancel: () => void }) {
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [broken, setBroken] = useState(false);
    const drag = useRef<{ x: number; y: number; from: { x: number; y: number } } | null>(null);

    useEffect(() => {
        const url = URL.createObjectURL(file);
        const picture = new Image();
        picture.onload = () => setImage(picture);
        picture.onerror = () => setBroken(true);
        picture.src = url;
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const base = image ? Math.max(FRAME / image.naturalWidth, FRAME / image.naturalHeight) : 1;
    const width = image ? image.naturalWidth * base * zoom : FRAME;
    const height = image ? image.naturalHeight * base * zoom : FRAME;
    const clamp = useCallback(
        (point: { x: number; y: number }) => ({
            x: Math.max(-(width - FRAME) / 2, Math.min((width - FRAME) / 2, point.x)),
            y: Math.max(-(height - FRAME) / 2, Math.min((height - FRAME) / 2, point.y)),
        }),
        [width, height]
    );
    const shown = clamp(offset);

    const finish = () => {
        if (!image) return;
        const canvas = document.createElement("canvas");
        canvas.width = OUT;
        canvas.height = OUT;
        const context = canvas.getContext("2d");
        if (!context) return;
        const scale = OUT / FRAME;
        context.drawImage(image, (FRAME / 2 + shown.x - width / 2) * scale, (FRAME / 2 + shown.y - height / 2) * scale, width * scale, height * scale);
        canvas.toBlob((blob) => blob && onDone(blob), "image/jpeg", 0.88);
    };

    if (broken) {
        return (
            <div className="py-6 text-center">
                <p className="text-[0.875rem] font-semibold text-closed">{words.face.unreadable}</p>
                <button type="button" onClick={onCancel} className="nt-btn nt-btn-soft mt-4">
                    {words.common.back}
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center">
            <div
                className="relative touch-none overflow-hidden rounded-[1.25rem] bg-surface-2 select-none"
                style={{ width: FRAME, height: FRAME, cursor: "grab" }}
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    drag.current = { x: event.clientX, y: event.clientY, from: shown };
                }}
                onPointerMove={(event) => {
                    if (!drag.current) return;
                    setOffset(clamp({ x: drag.current.from.x + event.clientX - drag.current.x, y: drag.current.from.y + event.clientY - drag.current.y }));
                }}
                onPointerUp={() => (drag.current = null)}
                onPointerCancel={() => (drag.current = null)}
            >
                {image && (
                    <img
                        src={image.src}
                        alt=""
                        draggable={false}
                        className="pointer-events-none absolute max-w-none"
                        style={{ width, height, left: FRAME / 2 - width / 2 + shown.x, top: FRAME / 2 - height / 2 + shown.y }}
                    />
                )}
                {/* The circle the face will be seen in; outside it, shade. */}
                <span className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at center, transparent 49.5%, rgba(0,0,0,0.5) 50%)" }} aria-hidden />
            </div>
            <p className="mt-2 text-[0.75rem] text-muted">{words.face.drag}</p>
            <label className="mt-3 flex w-full max-w-[16.25rem] items-center gap-3 text-[0.75rem] font-semibold text-muted">
                {words.face.zoom}
                <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="flex-1 accent-brand-500" />
            </label>
            <div className="mt-4 flex w-full gap-2">
                <button type="button" onClick={onCancel} className="nt-btn nt-btn-soft flex-1">
                    {words.common.back}
                </button>
                <button type="button" onClick={finish} disabled={!image} className="nt-btn nt-btn-primary flex-[2] disabled:opacity-60">
                    {words.face.use}
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------- picker

export default function AvatarPicker({ value, onChange, words, locale }: { value: FaceChoice; onChange: (choice: FaceChoice) => void; words: PeopleWords; locale: Locale }) {
    const current = value.kind === "avatar" ? parseAvatar(value.code) : null;
    const [tab, setTab] = useState<"avatar" | "photo">(value.kind === "avatar" ? "avatar" : "photo");
    const [family, setFamily] = useState<Family | "all">("all");
    const [skin, setSkin] = useState(current?.skin ?? 0);
    const [backdrop, setBackdrop] = useState(current?.backdrop ?? 0);
    const [seeds, setSeeds] = useState<Seed[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const picker = useRef<HTMLInputElement>(null);

    // The first faces are drawn in the browser only (they are random).
    useEffect(() => {
        const frame = requestAnimationFrame(() => setSeeds(freshSeeds("all")));
        return () => cancelAnimationFrame(frame);
    }, []);

    const codeOf = (seed: Seed) => avatarCode({ family: seed.family, seed: seed.seed, skin, backdrop });
    // A new skin tone or background applies to the face already chosen.
    const restyle = (next: { skin?: number; backdrop?: number }) => {
        if (next.skin !== undefined) setSkin(next.skin);
        if (next.backdrop !== undefined) setBackdrop(next.backdrop);
        if (current) onChange({ kind: "avatar", code: avatarCode({ ...current, skin: next.skin ?? skin, backdrop: next.backdrop ?? backdrop }) });
    };

    return (
        <div>
            <div className="flex flex-col items-center">
                <span className="nt-face h-28 w-28 shadow-card">
                    { }
                    <img src={faceUrl(value)} alt="" width={112} height={112} />
                </span>
                <div className="mt-4 grid w-full grid-cols-2 rounded-full bg-surface-2 p-1 text-[0.875rem] font-semibold">
                    {(["avatar", "photo"] as const).map((key) => (
                        <button key={key} type="button" onClick={() => setTab(key)} aria-pressed={tab === key} className={`h-10 rounded-full transition ${tab === key ? "bg-surface text-text shadow-card" : "text-muted"}`}>
                            {key === "avatar" ? words.face.title : words.face.photo}
                        </button>
                    ))}
                </div>
            </div>

            {tab === "avatar" ? (
                <div className="mt-5">
                    <p className="nt-eyebrow mb-2">{words.face.family}</p>
                    <div className="nt-scroll-x -mx-5 gap-2 px-5">
                        {(["all", ...FAMILIES] as const).map((key) => (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={family === key}
                                onClick={() => {
                                    setFamily(key);
                                    setSeeds(freshSeeds(key));
                                }}
                                className="nt-chip h-9 shrink-0 text-[0.875rem]"
                            >
                                {key === "all" ? (locale === "fr" ? "Tous" : "All") : FAMILY_NAMES[key][locale]}
                            </button>
                        ))}
                    </div>

                    <p className="nt-eyebrow mt-4 mb-2">{words.face.skin}</p>
                    <div className="flex gap-2.5">
                        {SKIN_SWATCHES.map((swatch, index) => (
                            <button
                                key={swatch}
                                type="button"
                                onClick={() => restyle({ skin: index })}
                                aria-pressed={skin === index}
                                aria-label={`${words.face.skin} ${index + 1}`}
                                className={`h-10 w-10 rounded-full transition ${skin === index ? "ring-2 ring-text ring-offset-2 ring-offset-bg" : ""}`}
                                style={{ background: `#${swatch}` }}
                            />
                        ))}
                    </div>

                    <p className="nt-eyebrow mt-4 mb-2">{words.face.background}</p>
                    <div className="nt-scroll-x -mx-5 gap-2.5 px-5 pb-1">
                        {BACKDROPS.map((item, index) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => restyle({ backdrop: index })}
                                aria-pressed={backdrop === index}
                                title={item.name[locale]}
                                aria-label={item.name[locale]}
                                className={`h-10 w-10 shrink-0 rounded-full border border-line transition ${backdrop === index ? "ring-2 ring-text ring-offset-2 ring-offset-bg" : ""}`}
                                style={{ background: item.swatch }}
                            />
                        ))}
                    </div>
                    <p className="mt-1 text-[0.75rem] text-muted">{BACKDROPS[backdrop].name[locale]}</p>

                    <ul className="mt-4 grid grid-cols-4 gap-2.5">
                        {seeds.map((seed) => {
                            const code = codeOf(seed);
                            const chosen = value.kind === "avatar" && value.code === code;
                            return (
                                <li key={seed.seed}>
                                    <button
                                        type="button"
                                        onClick={() => onChange({ kind: "avatar", code })}
                                        aria-pressed={chosen}
                                        className={`block aspect-square w-full overflow-hidden rounded-full bg-surface-2 transition active:scale-95 ${chosen ? "ring-[3px] ring-brand-500 ring-offset-2 ring-offset-bg" : ""}`}
                                    >
                                        { }
                                        <img src={avatarUrl(code)} alt="" loading="lazy" decoding="async" className="h-full w-full" />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    <button type="button" onClick={() => setSeeds((list) => [...list, ...freshSeeds(family, list.length)])} className="nt-btn nt-btn-soft mt-4 w-full">
                        <RefreshCw size={16} />
                        {words.face.more}
                    </button>
                    <p className="mt-4 text-[0.75rem] leading-relaxed text-muted">{words.face.credits}</p>
                </div>
            ) : file ? (
                <div className="mt-5">
                    <PhotoFramer
                        file={file}
                        words={words}
                        onCancel={() => setFile(null)}
                        onDone={(blob) => {
                            onChange({ kind: "photo", blob, url: URL.createObjectURL(blob) });
                            setFile(null);
                        }}
                    />
                </div>
            ) : (
                <div className="mt-5">
                    <button type="button" onClick={() => picker.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-[1.25rem] border-2 border-dashed border-line-strong px-5 py-8 text-center transition hover:border-text-2">
                        {value.kind === "avatar" ? <ImagePlus size={28} className="text-brand-600" /> : <Camera size={28} className="text-brand-600" />}
                        <span className="text-[1rem] font-semibold">{words.face.pick}</span>
                        <span className="text-[0.75rem] leading-relaxed text-muted">{words.face.photoHint}</span>
                    </button>
                    <input
                        ref={picker}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                            const chosen = event.target.files?.[0];
                            if (chosen) setFile(chosen);
                            event.target.value = "";
                        }}
                    />
                </div>
            )}
        </div>
    );
}
