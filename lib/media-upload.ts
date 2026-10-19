// Photos and videos sent from the phone straight to storage (never through
// the site's server, which could not carry a video): what a video is, and
// the upload itself with the one-time permission the server gave. Shared by
// the walls of places and by outings.

import { POST_BUCKET } from "./posts";

// What a video is: how long, how large, and one picture taken from it.
export async function readVideo(file: File) {
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
export function put(path: string, token: string, body: Blob, type: string, onProgress?: (share: number) => void) {
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

