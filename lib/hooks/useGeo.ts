"use client";

import { useSyncExternalStore } from "react";

// One live GPS watcher shared by the whole app. Once the visitor allows
// location it stays on across pages (no repeated prompts), and every
// screen reads the same position, heading and speed.

export type GeoPosition = {
    lat: number;
    lng: number;
    accuracy: number;
    heading: number | null; // degrees from north, when moving
    speed: number | null; // m/s
    at: number;
};

export type GeoStatus = "idle" | "locating" | "active" | "denied" | "unavailable";

type State = { status: GeoStatus; position: GeoPosition | null };

const GRANTED_KEY = "nt_geo_granted";
let state: State = { status: "idle", position: null };
let watchId: number | null = null;
let autoChecked = false;
const listeners = new Set<() => void>();

function emit(next: Partial<State>) {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
}

export function startGeo() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        emit({ status: "unavailable" });
        return;
    }
    if (watchId !== null) return;
    if (!state.position) emit({ status: "locating" });

    watchId = navigator.geolocation.watchPosition(
        (result) => {
            try {
                localStorage.setItem(GRANTED_KEY, "1");
            } catch {}
            const { latitude, longitude, accuracy, heading, speed } = result.coords;
            emit({
                status: "active",
                position: {
                    lat: latitude,
                    lng: longitude,
                    accuracy,
                    heading: heading !== null && !Number.isNaN(heading) && (speed ?? 0) > 0.5 ? heading : state.position?.heading ?? null,
                    speed,
                    at: result.timestamp,
                },
            });
        },
        (error) => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            watchId = null;
            if (error.code === error.PERMISSION_DENIED) {
                try {
                    localStorage.removeItem(GRANTED_KEY);
                } catch {}
                emit({ status: "denied" });
            } else if (!state.position) {
                emit({ status: "unavailable" });
            }
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
}

// Resume silently for visitors who already said yes (no prompt shown).
async function autoStart() {
    if (autoChecked || typeof window === "undefined") return;
    autoChecked = true;
    let granted = false;
    try {
        granted = localStorage.getItem(GRANTED_KEY) === "1";
    } catch {}
    try {
        const permission = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
        if (permission?.state === "granted") granted = true;
        if (permission?.state === "denied") {
            emit({ status: "denied" });
            return;
        }
    } catch {}
    if (granted) startGeo();
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    void autoStart();
    return () => listeners.delete(listener);
}

const SERVER: State = { status: "idle", position: null };

export function useGeo() {
    const snapshot = useSyncExternalStore(subscribe, () => state, () => SERVER);
    return { ...snapshot, start: startGeo };
}
