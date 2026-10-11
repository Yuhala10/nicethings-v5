"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ImagePlus, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { compressImage } from "@/lib/compress-image";
import { fill } from "@/lib/i18n";
import { MAX_CAPTION, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, POST_BUCKET, POST_TYPES } from "@/lib/posts";
import { visitorId } from "../site/Analytics";
import { useLocale } from "../site/LocaleProvider";

// A visitor adds a photo or a short video to a place's wall. A photo is
// resized on the phone first; a video is checked for length and weight and
// a still picture is taken from it. The file then goes straight to storage
// (never through the site's server, which could not carry a video), and
// waits there for the team's approval.

type Picked = { file: File; kind: "photo" | "video"; preview: string; width: number; height: number; duration: number | null; poster: Blob | null };
type Trouble = "tooHeavy" | "tooLong" | "tooMany" | "unreadable" | "failed" | "closed";

// What a video is: how long, how large, and one picture taken from it.
async function readVideo(file: File) {
    const url = URL.createObjectURL(file);
    try {
        const video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.src = url;
        await new Promise<void>((resolve, reject) => {
            video.onloadedmetadata = () => resolve();
            video.onerror = () => reject(new Error("unreadable"));
            setTimeout(() => reject(new Error("unreadable")), 15000);
        });
        const { duration, videoWidth: width, videoHeight: height } = video;
        let poster: Blob | null = null;
        try {
            video.currentTime = Math.min(1, duration / 3);
            await new Promise<void>((resolve) => {
                video.onseeked = () => resolve();
                setTimeout(resolve, 2500);
            });
            const scale = Math.min(1, 720 / Math.max(width, height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
            poster = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
        } catch {}
        return { duration, width, height, poster };
    } finally {
        URL.revokeObjectURL(url);
    }
}

// Puts a file into storage with the one-time permission the server gave.
function put(path: string, token: string, body: Blob, type: string, onProgress?: (share: number) => void) {
    return new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("PUT", `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/upload/sign/${POST_BUCKET}/${path}?token=${encodeURIComponent(token)}`);
        request.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        request.setRequestHeader("content-type", type);
        request.setRequestHeader("cache-control", "max-age=31536000");
        request.setRequestHeader("x-upsert", "false");
        request.upload.onprogress = (event) => {
            if (event.lengthComputable) onProgress?.(event.loaded / event.total);
        };
        request.onload = () => (request.status >= 200 && request.status < 300 ? resolve() : reject(new Error(`storage ${request.status}`)));
        request.onerror = () => reject(new Error("network"));
        request.send(body);
    });
}

export default function AddPost({ slug }: { slug: string }) {
    const { t } = useLocale();
    const input = useRef<HTMLInputElement>(null);
    const [picked, setPicked] = useState<Picked | null>(null);
    const [caption, setCaption] = useState("");
    const [state, setState] = useState<"idle" | "preparing" | "sending" | "done">("idle");
    const [progress, setProgress] = useState(0);
    const [trouble, setTrouble] = useState<Trouble | null>(null);

    useEffect(() => () => {
        if (picked) URL.revokeObjectURL(picked.preview);
    }, [picked]);

    const reset = () => {
        setPicked(null);
        setCaption("");
        setProgress(0);
        setState("idle");
        if (input.current) input.current.value = "";
    };

    const choose = async (file: File | undefined) => {
        if (!file) return;
        setTrouble(null);
        setState("preparing");
        try {
            if (file.type.startsWith("video/")) {
                if (!POST_TYPES[file.type]) throw new Error("unreadable");
                if (file.size > MAX_VIDEO_BYTES) throw new Error("tooHeavy");
                const video = await readVideo(file);
                if (!Number.isFinite(video.duration) || video.duration > MAX_VIDEO_SECONDS + 1) throw new Error("tooLong");
                setPicked({ file, kind: "video", preview: URL.createObjectURL(file), ...video });
            } else {
                const photo = await compressImage(file, 1600);
                if (!POST_TYPES[photo.type]) throw new Error("unreadable");
                const bitmap = await createImageBitmap(photo);
                setPicked({ file: photo, kind: "photo", preview: URL.createObjectURL(photo), width: bitmap.width, height: bitmap.height, duration: null, poster: null });
            }
            setState("idle");
        } catch (caught) {
            const why = (caught as Error).message;
            setTrouble(why === "tooHeavy" || why === "tooLong" ? why : "unreadable");
            reset();
        }
    };

    const send = async () => {
        if (!picked) return;
        setTrouble(null);
        setState("sending");
        setProgress(0);
        try {
            const asked = await fetch("/api/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    slug,
                    v: visitorId(),
                    type: picked.file.type,
                    size: picked.file.size,
                    width: picked.width,
                    height: picked.height,
                    duration: picked.duration,
                    caption: caption.trim() || null,
                    poster: Boolean(picked.poster),
                }),
            });
            const answer = (await asked.json().catch(() => ({}))) as { ok?: boolean; why?: string; id?: string; media?: { path: string; token: string }; poster?: { path: string; token: string } | null };
            if (!asked.ok || !answer.ok || !answer.media || !answer.id) {
                const reasons: Record<string, Trouble> = { heavy: "tooHeavy", long: "tooLong", many: "tooMany", closed: "closed" };
                throw new Error(reasons[answer.why ?? ""] ?? "failed");
            }
            if (answer.poster && picked.poster) await put(answer.poster.path, answer.poster.token, picked.poster, "image/jpeg");
            await put(answer.media.path, answer.media.token, picked.file, picked.file.type, setProgress);
            const confirmed = await fetch("/api/posts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: answer.id, v: visitorId() }) });
            if (!confirmed.ok) throw new Error("failed");
            setPicked(null);
            setCaption("");
            setState("done");
        } catch (caught) {
            const why = (caught as Error).message as Trouble;
            setTrouble(["tooHeavy", "tooLong", "tooMany", "closed"].includes(why) ? why : "failed");
            setState("idle");
        }
    };

    const troubleText = trouble
        ? trouble === "tooHeavy"
            ? fill(t.wall.tooHeavy, { max: Math.round(MAX_VIDEO_BYTES / 1024 / 1024) })
            : trouble === "tooLong"
              ? fill(t.wall.tooLong, { max: MAX_VIDEO_SECONDS })
              : t.wall[trouble]
        : null;

    return (
        <div className="mt-5">
            <input ref={input} type="file" accept="image/*,video/mp4,video/quicktime,video/webm" className="sr-only" tabIndex={-1} aria-hidden onChange={(event) => choose(event.target.files?.[0])} />

            {!picked && state !== "done" && (
                <button type="button" onClick={() => input.current?.click()} disabled={state === "preparing"} className="nt-btn nt-btn-outline w-full sm:w-auto">
                    {state === "preparing" ? <Loader2 size={17} className="animate-spin" /> : <ImagePlus size={17} />}
                    {state === "preparing" ? t.wall.preparing : t.wall.add}
                </button>
            )}

            <AnimatePresence initial={false}>
                {picked && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="overflow-hidden rounded-[1.25rem] border border-line bg-surface p-4">
                        <div className="flex gap-4">
                            <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-[0.9rem] bg-surface-2">
                                {picked.kind === "video" ? (
                                    <video src={picked.preview} muted loop autoPlay playsInline className="h-full w-full object-cover" />
                                ) : (
                                    <img src={picked.preview} alt="" className="h-full w-full object-cover" />
                                )}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col gap-3">
                                <label className="sr-only" htmlFor={`post-caption-${slug}`}>
                                    {t.wall.caption}
                                </label>
                                <textarea
                                    id={`post-caption-${slug}`}
                                    value={caption}
                                    onChange={(event) => setCaption(event.target.value.slice(0, MAX_CAPTION))}
                                    placeholder={t.wall.caption}
                                    rows={3}
                                    disabled={state === "sending"}
                                    className="w-full resize-none rounded-[0.9rem] border border-line-strong bg-surface px-3 py-2.5 text-[1rem] text-text outline-none focus:border-text-2"
                                />
                                <p className="text-[0.75rem] leading-relaxed text-muted">{t.wall.consent}</p>
                            </div>
                        </div>
                        {state === "sending" && (
                            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                                <div className="h-full rounded-full bg-brand-600 transition-[width] duration-200" style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }} />
                            </div>
                        )}
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button type="button" onClick={send} disabled={state === "sending"} className="nt-btn nt-btn-primary h-11 flex-1 text-sm">
                                {state === "sending" ? fill(t.wall.sending, { percent: Math.round(progress * 100) }) : t.wall.send}
                            </button>
                            <button type="button" onClick={reset} disabled={state === "sending"} className="nt-btn nt-btn-outline h-11 px-4 text-sm" aria-label={t.wall.cancel}>
                                <X size={16} />
                                {t.wall.cancel}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {state === "done" && (
                <p className="flex items-start gap-2 rounded-[1rem] bg-surface-2 px-4 py-3 text-[0.875rem] font-semibold">
                    <Check size={16} className="mt-0.5 shrink-0 text-open" />
                    <span>
                        {t.wall.done}{" "}
                        <button type="button" onClick={reset} className="underline underline-offset-4">
                            {t.wall.another}
                        </button>
                    </span>
                </p>
            )}
            {troubleText && (
                <p role="alert" className="mt-3 text-[0.875rem] font-semibold text-closed">
                    {troubleText}
                </p>
            )}
        </div>
    );
}
