"use client";

import { apple } from "@/lib/share";
import { playTrack, type Playing, type Sound } from "@/lib/soundtracks";

// Downloads of an outing, marked NiceThings the way TikTok marks its videos.
// A photo comes framed: the place, the pin, the author's @name and the
// site's address. A video (the outing's own, or its photos rolling with
// their music) carries the mark, top left then bottom right, and ends on
// NiceThings' card with a short chime: the pin, the name, @name, the place.
// It is all made on the phone: nothing leaves it until it is shared.

export type Story = { handle: string; place: string; detail: string };
export type Keepsake = { file: File; url: string; kind: "photo" | "video" };
export type Making = { video: string } | { photos: string[]; sound: Sound | null };

const ORANGE = "#f97316";
const SITE = "nicethings.site";
const W = 720;
const H = 1280;
const SLIDE = 3.4; // seconds for each photo
const END = 2.8; // the closing card

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const easeOut = (value: number) => 1 - (1 - value) ** 3;
const backOut = (value: number) => 1 + 2.2 * (value - 1) ** 3 + 1.2 * (value - 1) ** 2;
const aborted = () => new DOMException("Aborted", "AbortError");

// The site's own typeface (DM Sans), or the phone's if the canvas refuses it.
function setFont(ctx: CanvasRenderingContext2D, weight: number, size: number) {
    const family = getComputedStyle(document.body).fontFamily || "sans-serif";
    ctx.font = `${weight} ${size}px ${family}`;
    if (!ctx.font.includes(`${size}px`)) ctx.font = `${weight} ${size}px sans-serif`;
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
    if (ctx.measureText(text).width <= max) return text;
    let short = text;
    while (short.length > 1 && ctx.measureText(`${short}…`).width > max) short = short.slice(0, -1);
    return `${short.trimEnd()}…`;
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, width, height, height / 2);
    else ctx.rect(x, y, width, height);
    ctx.fill();
}

// The NiceThings pin (public/brand/mark.svg, 64 × 64): its point at the bottom.
function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 64, size / 64);
    ctx.fillStyle = ORANGE;
    ctx.fill(new Path2D("M32 54.5S14 38.3 14 25.5a18 18 0 0 1 36 0C50 38.3 32 54.5 32 54.5z"));
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(32, 25.5, 11.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ORANGE;
    ctx.fillRect(30.9, 16.5, 2.2, 17.5);
    ctx.fill(new Path2D("M25 18.6h10.2l3.1 2.6-3.1 2.6H25a.9.9 0 0 1-.9-.9v-3.4a.9.9 0 0 1 .9-.9zM39 25.8H28.8l-3.1 2.6 3.1 2.6H39a.9.9 0 0 0 .9-.9v-3.4a.9.9 0 0 0-.9-.9z"));
    ctx.restore();
}

// A picture fills (cover) or fits (contain) a box, zoomed and moved a little.
function lay(ctx: CanvasRenderingContext2D, source: CanvasImageSource, sw: number, sh: number, width: number, height: number, mode: "cover" | "contain", zoom = 1, panX = 0, panY = 0) {
    const scale = (mode === "cover" ? Math.max(width / sw, height / sh) : Math.min(width / sw, height / sh)) * zoom;
    const dw = sw * scale;
    const dh = sh * scale;
    ctx.drawImage(source, (width - dw) / 2 + panX * width, (height - dh) / 2 + panY * height, dw, dh);
}

async function fetchBlob(src: string, signal?: AbortSignal, onShare?: (share: number) => void) {
    const response = await fetch(src, { signal });
    if (!response.ok || !response.body) throw new Error("fetch");
    const total = Number(response.headers.get("content-length")) || 0;
    if (!onShare || !total) return response.blob();
    const reader = response.body.getReader();
    const parts: Uint8Array[] = [];
    let got = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
        got += value.length;
        onShare(Math.min(1, got / total));
    }
    return new Blob(parts as BlobPart[], { type: response.headers.get("content-type") ?? "" });
}

// From the phone's memory, so the canvas may be read back (no other origin).
const imageOf = (blob: Blob) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("image"));
        image.src = URL.createObjectURL(blob);
    });

// ——— The photo ——————————————————————————————————————————————————————————

export async function photoKeepsake(src: string, story: Story): Promise<Keepsake> {
    const image = await imageOf(await fetchBlob(src));
    const width = 1080;
    const height = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    lay(ctx, image, image.naturalWidth, image.naturalHeight, width, height, "cover");
    URL.revokeObjectURL(image.src);

    const shade = ctx.createLinearGradient(0, height * 0.52, 0, height);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(0.5, "rgba(0,0,0,0.42)");
    shade.addColorStop(1, "rgba(0,0,0,0.84)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, height * 0.52, width, height * 0.48);

    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 12;
    setFont(ctx, 800, 62);
    ctx.fillText(fit(ctx, story.place, width - 128), 64, height - 236);
    if (story.detail) {
        setFont(ctx, 500, 34);
        ctx.fillStyle = "rgba(255,255,255,0.84)";
        ctx.fillText(fit(ctx, story.detail, width - 128), 64, height - 184);
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(64, height - 148, width - 128, 2);

    // The signature: the pin, NiceThings, @name … nicethings.site
    drawMark(ctx, 64 - (14 / 64) * 70, height - 122, 70);
    setFont(ctx, 800, 38);
    ctx.fillStyle = "#fff";
    ctx.fillText("NiceThings", 128, height - 70);
    const after = 128 + ctx.measureText("NiceThings").width + 16;
    setFont(ctx, 600, 32);
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillText(fit(ctx, `@${story.handle}`, width - after - 330), after, height - 70);
    setFont(ctx, 600, 30);
    ctx.textAlign = "right";
    ctx.fillText(SITE, width - 64, height - 70);
    ctx.textAlign = "left";

    const strip = ctx.createLinearGradient(0, 0, width, 0);
    strip.addColorStop(0, "#ec8a3f");
    strip.addColorStop(0.55, "#d9572b");
    strip.addColorStop(1, "#c2416a");
    ctx.fillStyle = strip;
    ctx.fillRect(0, height - 12, width, 12);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob) throw new Error("photo");
    const file = new File([blob], `nicethings-${story.handle}.jpg`, { type: "image/jpeg" });
    return { file, url: URL.createObjectURL(file), kind: "photo" };
}

// ——— The video ——————————————————————————————————————————————————————————

const TYPES = ["video/mp4;codecs=avc1.42E01F,mp4a.40.2", "video/mp4;codecs=avc1,mp4a", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
const recordType = () => {
    if (typeof MediaRecorder === "undefined") return null;
    return (
        TYPES.find((type) => {
            try {
                return MediaRecorder.isTypeSupported(type);
            } catch {
                return false;
            }
        }) ?? null
    );
};
export const canMakeVideo = () => typeof document !== "undefined" && recordType() !== null && typeof document.createElement("canvas").captureStream === "function";

// The mark in a corner, the way TikTok signs its videos.
function watermark(ctx: CanvasRenderingContext2D, handle: string, corner: "top" | "bottom", alpha: number) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 1;
    setFont(ctx, 600, 22);
    const at = fit(ctx, `@${handle}`, 300);
    const atWidth = ctx.measureText(at).width;
    setFont(ctx, 800, 30);
    const nameWidth = ctx.measureText("NiceThings").width;
    const mark = 50;
    const textX = (36 / 64) * mark + 8;
    const block = textX + Math.max(nameWidth, atWidth);
    const x = corner === "top" ? 32 : W - 32 - block;
    const y = corner === "top" ? 72 : H - 200;
    drawMark(ctx, x - (14 / 64) * mark, y, mark);
    ctx.fillStyle = "#fff";
    ctx.fillText("NiceThings", x + textX, y + 26);
    setFont(ctx, 600, 22);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(at, x + textX, y + 52);
    ctx.restore();
}

// Where it is, at the bottom left.
function placeTag(ctx: CanvasRenderingContext2D, place: string) {
    ctx.save();
    setFont(ctx, 700, 26);
    const label = fit(ctx, place, W * 0.6);
    const width = ctx.measureText(label).width + 62;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    pill(ctx, 30, H - 122, width, 54);
    drawMark(ctx, 30 + 12 - (14 / 64) * 32, H - 113, 32);
    ctx.fillStyle = "#fff";
    ctx.fillText(label, 30 + 48, H - 86);
    ctx.restore();
}

// The closing card.
function endCard(ctx: CanvasRenderingContext2D, story: Story, elapsed: number) {
    ctx.save();
    ctx.fillStyle = "#120c0a";
    ctx.fillRect(0, 0, W, H);
    const middle = H * 0.4;
    const glow = ctx.createRadialGradient(W / 2, middle, 10, W / 2, middle, 330 + 170 * easeOut(clamp(elapsed / 1.4)));
    glow.addColorStop(0, "rgba(249,115,22,0.55)");
    glow.addColorStop(0.5, "rgba(217,87,43,0.18)");
    glow.addColorStop(1, "rgba(18,12,10,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    const size = 190 * backOut(clamp(elapsed / 0.6));
    if (size > 2) drawMark(ctx, W / 2 - size / 2, middle - size * 0.5, size);

    ctx.textAlign = "center";
    const rise = (from: number) => {
        const shown = easeOut(clamp((elapsed - from) / 0.45));
        ctx.globalAlpha = shown;
        return (1 - shown) * 24;
    };
    let lift = rise(0.3);
    setFont(ctx, 800, 68);
    ctx.fillStyle = "#fff";
    ctx.fillText("NiceThings", W / 2, middle + 168 + lift);
    lift = rise(0.55);
    setFont(ctx, 700, 38);
    ctx.fillStyle = ORANGE;
    ctx.fillText(fit(ctx, `@${story.handle}`, W - 120), W / 2, middle + 230 + lift);
    lift = rise(0.8);
    setFont(ctx, 500, 28);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.fillText(fit(ctx, story.place, W - 140), W / 2, middle + 284 + lift);

    lift = rise(1);
    setFont(ctx, 700, 30);
    ctx.fillStyle = "#fff";
    ctx.fillText(SITE, W / 2, H - 132 + lift);
    const bar = ctx.createLinearGradient(W / 2 - 70, 0, W / 2 + 70, 0);
    bar.addColorStop(0, "#ec8a3f");
    bar.addColorStop(1, "#c2416a");
    ctx.fillStyle = bar;
    ctx.fillRect(W / 2 - 70, H - 110 + lift, 140, 5);
    ctx.restore();
}

// Two bright notes when the card comes.
function chime(audio: AudioContext, into: AudioNode) {
    const at = audio.currentTime + 0.05;
    for (const [hz, delay] of [
        [1318.5, 0],
        [1975.5, 0.14],
    ]) {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = "sine";
        osc.frequency.value = hz;
        gain.gain.setValueAtTime(0.0001, at + delay);
        gain.gain.exponentialRampToValueAtTime(0.22, at + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + delay + 1.2);
        osc.connect(gain).connect(into);
        osc.start(at + delay);
        osc.stop(at + delay + 1.3);
    }
}

// `audio` is made and started in answer to the tap (iPhones ask that);
// `onShare` gets how far along it is, from 0 to 1. It takes as long as the
// video lasts: the phone plays it once while it films the canvas.
export async function videoKeepsake(making: Making, story: Story, audio: AudioContext | null, onShare: (share: number) => void, signal: AbortSignal): Promise<Keepsake> {
    const type = recordType();
    const canvas = document.createElement("canvas");
    if (!type || typeof canvas.captureStream !== "function") throw new Error("unsupported");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    // A picture shrunk to a few dots and blown up again: a soft, blurred
    // backdrop for whatever does not fill the frame (cheap on any phone).
    const tiny = document.createElement("canvas");
    tiny.width = 18;
    tiny.height = 32;
    const tinyCtx = tiny.getContext("2d")!;
    const into = audio?.createMediaStreamDestination() ?? null;

    let video: HTMLVideoElement | null = null;
    let voice: AudioBuffer | null = null;
    const photos: HTMLImageElement[] = [];
    let length: number;
    const before = "video" in making ? 0.25 : 0.12;
    const backing = "video" in making ? null : making.sound;

    try {
        if ("video" in making) {
            const blob = await fetchBlob(making.video, signal, (share) => onShare(share * before));
            // Its sound, taken apart from the picture, so the picture can play muted.
            if (audio) voice = await audio.decodeAudioData(await blob.arrayBuffer()).catch(() => null);
            video = document.createElement("video");
            video.playsInline = true;
            video.muted = Boolean(voice) || !audio;
            video.preload = "auto";
            Object.assign(video.style, { position: "fixed", left: "0", top: "0", width: "2px", height: "2px", opacity: "0", pointerEvents: "none" });
            const ready = new Promise<void>((resolve, reject) => {
                video!.onloadeddata = () => resolve();
                video!.onerror = () => reject(new Error("video"));
            });
            video.src = URL.createObjectURL(blob);
            document.body.append(video);
            await ready;
            if (!voice && audio && into) audio.createMediaElementSource(video).connect(into);
            length = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 45;
        } else {
            for (const [index, src] of making.photos.entries()) photos.push(await imageOf(await fetchBlob(src, signal, (share) => onShare(((index + share) / making.photos.length) * before))));
            length = Math.max(6, photos.length * SLIDE);
        }
        if (signal.aborted) throw aborted();

        const backdrop = (source: CanvasImageSource, sw: number, sh: number) => {
            tinyCtx.clearRect(0, 0, tiny.width, tiny.height);
            lay(tinyCtx, source, sw, sh, tiny.width, tiny.height, "cover");
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(tiny, 0, 0, W, H);
            ctx.fillStyle = "rgba(0,0,0,0.38)";
            ctx.fillRect(0, 0, W, H);
        };
        // Close to the frame's own shape: it fills it; otherwise it fits in it.
        const modeOf = (sw: number, sh: number) => (Math.abs(sw / sh - W / H) < 0.06 ? "cover" : "contain");
        const slide = (index: number, progress: number, alpha: number) => {
            const image = photos[index];
            const sw = image.naturalWidth;
            const sh = image.naturalHeight;
            ctx.globalAlpha = alpha;
            backdrop(image, sw, sh);
            if (sw > sh * 1.05) {
                // Wider than tall: shown big (two thirds of the height, not a
                // strip lost in the middle), the camera travelling across it
                // so nothing is cut off.
                const scale = ((H * 0.66) / sh) * (1 + 0.04 * progress);
                const dw = sw * scale;
                const dh = sh * scale;
                const along = 0.5 - Math.cos(Math.PI * (index % 2 ? 1 - progress : progress)) / 2;
                ctx.drawImage(image, -(dw - W) * along, (H - dh) / 2, dw, dh);
            } else {
                // Ken Burns: each photo slowly comes closer, drifting one way or the other.
                const drift = (index % 2 ? 1 : -1) * 0.018 * progress;
                lay(ctx, image, sw, sh, W, H, modeOf(sw, sh), 1 + 0.09 * progress, drift, -drift / 2);
            }
            ctx.globalAlpha = 1;
        };

        const tracks = [...canvas.captureStream(30).getVideoTracks(), ...(into?.stream.getAudioTracks() ?? [])];
        // Light, for WhatsApp and for data: photos that roll need little
        // (about 3 MB for four), a filmed video a little more (about 1 MB
        // for every 4 seconds).
        const recorder = new MediaRecorder(new MediaStream(tracks), { mimeType: type, videoBitsPerSecond: video ? 2_000_000 : 1_200_000, audioBitsPerSecond: 96_000 });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (event) => {
            if (event.data.size) chunks.push(event.data);
        };
        const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

        let music: Playing | null = null;
        let sound: AudioBufferSourceNode | null = null;
        let startedAt = 0;
        let endedAt = 0;
        let frame = 0;
        let finish!: () => void;
        let fail!: (error: unknown) => void;
        const drawn = new Promise<void>((resolve, reject) => {
            finish = resolve;
            fail = reject;
        });

        const draw = () => {
            if (signal.aborted) return fail(aborted());
            const now = performance.now();
            const time = video ? video.currentTime : (now - startedAt) / 1000;
            if (!endedAt && (video ? video.ended || time >= length - 0.04 : time >= length)) {
                endedAt = now;
                music?.stop();
                if (audio && into) chime(audio, into);
            }
            if (endedAt) {
                const elapsed = (now - endedAt) / 1000;
                endCard(ctx, story, elapsed);
                onShare(before + (1 - before) * clamp((length + elapsed) / (length + END)));
                if (elapsed >= END) return finish();
            } else {
                if (video) {
                    backdrop(video, video.videoWidth, video.videoHeight);
                    lay(ctx, video, video.videoWidth, video.videoHeight, W, H, modeOf(video.videoWidth, video.videoHeight));
                } else {
                    const each = length / photos.length;
                    const index = Math.min(photos.length - 1, Math.floor(time / each));
                    const local = time - index * each;
                    slide(index, local / each, 1);
                    const fade = 0.55;
                    if (index < photos.length - 1 && local > each - fade) slide(index + 1, 0, (local - (each - fade)) / fade);
                }
                placeTag(ctx, story.place);
                // Half way, the mark crosses to the other corner.
                const half = length / 2;
                watermark(ctx, story.handle, "top", 1 - clamp((time - half + 0.3) / 0.3));
                watermark(ctx, story.handle, "bottom", clamp((time - half) / 0.3));
                onShare(before + (1 - before) * clamp(time / (length + END)));
            }
            frame = requestAnimationFrame(draw);
        };

        try {
            recorder.start(1000);
            if (video) {
                await video.play();
                if (voice && audio && into) {
                    sound = audio.createBufferSource();
                    sound.buffer = voice;
                    sound.connect(into);
                    sound.start(audio.currentTime, video.currentTime);
                }
            } else {
                startedAt = performance.now();
                if (backing && audio && into) music = playTrack(backing, 0.7, { ctx: audio, node: into });
            }
            frame = requestAnimationFrame(draw);
            await drawn;
        } finally {
            cancelAnimationFrame(frame);
            music?.stop();
            try {
                sound?.stop();
            } catch {}
            if (recorder.state !== "inactive") recorder.stop();
        }
        await stopped;
        const mime = type.split(";")[0];
        const file = new File([new Blob(chunks, { type: mime })], `nicethings-${story.handle}.${mime === "video/mp4" ? "mp4" : "webm"}`, { type: mime });
        return { file, url: URL.createObjectURL(file), kind: "video" };
    } finally {
        if (video) {
            video.pause();
            URL.revokeObjectURL(video.src);
            video.remove();
        }
        for (const image of photos) URL.revokeObjectURL(image.src);
    }
}

// ——— Keeping it ——————————————————————————————————————————————————————————

export type Kept = "saved" | "cancelled" | "failed";

// Into the phone: through the share sheet on an iPhone ("Enregistrer la
// vidéo" puts it in Photos), as a download elsewhere.
export async function saveKeepsake(item: Keepsake): Promise<Kept> {
    try {
        if (apple() && navigator.canShare?.({ files: [item.file] })) {
            await navigator.share({ files: [item.file] });
            return "saved";
        }
        const link = document.createElement("a");
        link.href = item.url;
        link.download = item.file.name;
        document.body.append(link);
        link.click();
        link.remove();
        return "saved";
    } catch (error) {
        return (error as Error | null)?.name === "AbortError" ? "cancelled" : "failed";
    }
}

// Straight to WhatsApp, TikTok, a status…, with a line and the link.
export async function sendKeepsake(item: Keepsake, text: string): Promise<Kept> {
    try {
        if (navigator.canShare?.({ files: [item.file] })) {
            await navigator.share({ files: [item.file], text });
            return "saved";
        }
    } catch (error) {
        return (error as Error | null)?.name === "AbortError" ? "cancelled" : "failed";
    }
    return saveKeepsake(item);
}
