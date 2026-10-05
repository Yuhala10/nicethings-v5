"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { HUMAN_KEY, TEAM_KEY, VISITOR_KEY, describePath, type HumanSign } from "@/lib/analytics";

// Anonymous audience measurement: one tiny request per page seen by a real
// person. Nothing is sent until someone touches the screen, clicks, types
// or moves the mouse, so a page that is only loaded (crawlers, link
// previews, automated browsers) is never counted. The id is random, stays
// in this browser and only tells a return visit from a first one. Respects
// the browser's "Do Not Track" setting; the team's own devices are skipped.

type Visit = { path: string; first: boolean; tag?: string | null; ref?: string | null; app?: boolean };

let memoryId: string | null = null; // when storage is blocked (private mode)
let lastPath: string | null = null;
let started = false; // the first page of this visit has been noted
let human: HumanSign | null = null; // how we know a person is there
let waiting: Visit | null = null; // the page held back until we know

function stored(key: string) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

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
        const saved = localStorage.getItem(VISITOR_KEY);
        if (saved) return saved;
        const id = randomId();
        localStorage.setItem(VISITOR_KEY, id);
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

// Not counted at all: "Do Not Track", a browser driven by a program, and
// the devices of the team (flagged by the console).
function counted() {
    return navigator.doNotTrack !== "1" && !navigator.webdriver && stored(TEAM_KEY) === null;
}

function send(visit: Visit, sign: HumanSign) {
    fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ v: visitorId(), h: sign, ...visit }),
        keepalive: true,
    }).catch(() => {});
}

export default function Analytics() {
    const pathname = usePathname();

    // Waits for the first sign of a person, then releases the page held back.
    // A browser where a person was already seen is trusted from the start.
    useEffect(() => {
        if (human) return;
        const release = (sign: HumanSign) => {
            human = sign;
            stop();
            if (sign !== "known") {
                try {
                    localStorage.setItem(HUMAN_KEY, "1");
                } catch {}
            }
            if (waiting && counted()) send(waiting, sign);
            waiting = null;
        };

        // A mouse that really travels: a page shifting under a still cursor
        // also fires one "move".
        let origin: [number, number] | null = null;
        const onMove = (event: PointerEvent) => {
            if (!event.isTrusted) return;
            if (!origin) origin = [event.clientX, event.clientY];
            else if (Math.hypot(event.clientX - origin[0], event.clientY - origin[1]) > 12) release("move");
        };
        const onPointer = (event: PointerEvent) => event.isTrusted && release(event.pointerType === "touch" ? "touch" : "pointer");
        const onTouch = (event: TouchEvent) => event.isTrusted && release("touch");
        const onKey = (event: KeyboardEvent) => event.isTrusted && release("key");
        const onWheel = (event: WheelEvent) => event.isTrusted && release("wheel");

        const options = { capture: true, passive: true } as const;
        function stop() {
            window.removeEventListener("pointermove", onMove, options);
            window.removeEventListener("pointerdown", onPointer, options);
            window.removeEventListener("touchstart", onTouch, options);
            window.removeEventListener("keydown", onKey, options);
            window.removeEventListener("wheel", onWheel, options);
        }

        if (stored(HUMAN_KEY) === "1") {
            release("known");
            return;
        }
        window.addEventListener("pointermove", onMove, options);
        window.addEventListener("pointerdown", onPointer, options);
        window.addEventListener("touchstart", onTouch, options);
        window.addEventListener("keydown", onKey, options);
        window.addEventListener("wheel", onWheel, options);
        return stop;
    }, []);

    useEffect(() => {
        if (pathname === lastPath || !describePath(pathname) || !counted()) return;
        lastPath = pathname;
        const first = !started;
        started = true;

        // Where the visit came from is read now: it belongs to the arrival,
        // even when the page is only sent at the first touch.
        const params = new URLSearchParams(window.location.search);
        const arrival = waiting?.first ? waiting : null;
        const visit: Visit = arrival
            ? { ...arrival, path: pathname }
            : {
                  path: pathname,
                  first,
                  ...(first && {
                      tag: params.get("utm_source") ?? params.get("ref"),
                      ref: externalReferrer(),
                      app: window.matchMedia("(display-mode: standalone)").matches,
                  }),
              };

        if (human) send(visit, human);
        else waiting = visit;
    }, [pathname]);

    return null;
}
