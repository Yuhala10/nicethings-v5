"use client";

import { useEffect } from "react";

// Sharing from NiceThings, so the conversation always shows the card.
//
// WhatsApp builds a link's card on the sender's phone, from the page, while
// they are still typing: someone who sends at once sends a bare link. So
// the card's picture itself is sent, as a photo, with the link as its
// caption: it is there however fast it is shared. The picture is fetched
// ahead (when the button is on screen, on a good connection; otherwise at
// the first touch), so the phone's share sheet opens at once.
//
// Without a picture ready (or on a computer), the link is shared as before
// and the card's picture is warmed on the nearest server for WhatsApp.

type Card = { file: File | null; ready: Promise<File | null> };
const cards = new Map<string, Card>();

export function prepareCard(image: string | null | undefined) {
    if (!image || typeof window === "undefined") return Promise.resolve(null);
    const known = cards.get(image);
    if (known) return known.ready;
    const card: Card = { file: null, ready: Promise.resolve(null) };
    card.ready = fetch(image, { priority: "low" })
        .then((response) => (response.ok ? response.blob() : null))
        .then((blob) => {
            if (!blob || !blob.type.startsWith("image/")) return null;
            const file = new File([blob], `nicethings.${blob.type === "image/png" ? "png" : "jpg"}`, { type: blob.type });
            card.file = file;
            return file;
        })
        .catch(() => null);
    cards.set(image, card);
    return card.ready;
}

// An iPhone or an iPad: the share sheet must open in answer to the tap
// itself, so it cannot wait for a picture still on its way.
export const apple = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && "ontouchend" in document);
const wait = (ms: number) => new Promise<null>((resolve) => window.setTimeout(() => resolve(null), ms));

// Gets the card ready while the button is on screen (good connections), and
// at the first touch of it otherwise: spread the result on the button.
export function useShareCard(image: string | null | undefined) {
    useEffect(() => {
        if (!image) return;
        const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
        if (connection?.saveData || (connection?.effectiveType && connection.effectiveType !== "4g")) return;
        const timer = window.setTimeout(() => prepareCard(image), 1200);
        return () => window.clearTimeout(timer);
    }, [image]);
    return { onPointerDown: () => void prepareCard(image), onFocus: () => void prepareCard(image) };
}

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

// `text` is a sentence sent with the link (none for a place: the card says it).
export async function sharePlace(title: string, url: string, text: string, preview?: string | null): Promise<ShareResult> {
    try {
        let file = preview ? (cards.get(preview)?.file ?? null) : null;
        if (!file && preview && !apple()) file = await Promise.race([prepareCard(preview), wait(2500)]);
        if (file && navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title, text: [text, url].filter(Boolean).join("\n") });
            return "shared";
        }
        if (preview) prepareCard(preview);
        if (navigator.share) {
            await navigator.share(text ? { title, text, url } : { title, url });
            return "shared";
        }
        await navigator.clipboard.writeText(url);
        return "copied";
    } catch (error) {
        return (error as Error | null)?.name === "AbortError" ? "cancelled" : "failed";
    }
}
