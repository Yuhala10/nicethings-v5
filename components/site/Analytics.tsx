"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { describePath } from "@/lib/analytics";

// Anonymous audience measurement: one tiny request per page seen. The id
// is random, stays in this browser and only tells a return visit from a
// first one. Respects the browser's "Do Not Track" setting.

const KEY = "nt_vid";
let memoryId: string | null = null; // when storage is blocked (private mode)
let lastPath: string | null = null;
let started = false; // the first page of this visit has been sent

function randomId() {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    // Older phones: build a v4 UUID by hand.
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function visitorId() {
    try {
        const saved = localStorage.getItem(KEY);
        if (saved) return saved;
        const id = randomId();
        localStorage.setItem(KEY, id);
        return id;
    } catch {
        return (memoryId ??= randomId());
    }
}

function externalReferrer() {
    try {
        const host = new URL(document.referrer).hostname;
        return host && host !== window.location.hostname ? host : null;
    } catch {
        return null;
    }
}

export default function Analytics() {
    const pathname = usePathname();

    useEffect(() => {
        if (pathname === lastPath || !describePath(pathname) || navigator.doNotTrack === "1") return;
        lastPath = pathname;
        const first = !started;
        started = true;

        const params = new URLSearchParams(window.location.search);
        fetch("/api/visits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                v: visitorId(),
                path: pathname,
                first,
                ...(first && {
                    tag: params.get("utm_source") ?? params.get("ref"),
                    ref: externalReferrer(),
                    app: window.matchMedia("(display-mode: standalone)").matches,
                }),
            }),
            keepalive: true,
        }).catch(() => {});
    }, [pathname]);

    return null;
}
