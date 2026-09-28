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

// Fired when the visitor asks for location but the browser has blocked it.
export const LOCATION_HELP_EVENT = "nt:location-help";
let state: State = { status: "idle", position: null };
let watchId: number | null = null;
let autoChecked = false;
const listeners = new Set<() => void>();

function emit(next: Partial<State>) {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
}

function accept(result: GeolocationPosition) {
    try {
        localStorage.setItem(GRANTED_KEY, "1");
    } catch {}
    const { latitude, longitude, accuracy, heading, speed } = result.coords;
    // Keep the more precise fix when a rough one arrives late.
    if (state.position && accuracy > state.position.accuracy * 3 && result.timestamp - state.position.at < 30000) return;
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
}

function refuse(error: GeolocationPositionError, userInitiated: boolean) {
    if (error.code === error.PERMISSION_DENIED) {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        watchId = null;
        try {
            localStorage.removeItem(GRANTED_KEY);
        } catch {}
        emit({ status: "denied" });
        if (userInitiated) window.dispatchEvent(new Event(LOCATION_HELP_EVENT));
    } else if (!state.position) {
        // Timeout / no signal: keep watching, but say so.
        emit({ status: "unavailable" });
    }
}

export function startGeo(userInitiated = true) {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        emit({ status: "unavailable" });
        return;
    }
    // Already tracking: a tap just re-announces the current position.
    if (watchId !== null) {
        if (state.position) emit({ status: "active", position: { ...state.position } });
        return;
    }
    if (!state.position) emit({ status: "locating" });

    // 1. A fast, rough fix (Wi-Fi / cell towers) so the map reacts at once.
    navigator.geolocation.getCurrentPosition(accept, (error) => refuse(error, userInitiated), {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000,
    });
    // 2. Precise GPS tracking that refines it and follows the visitor.
    watchId = navigator.geolocation.watchPosition(accept, (error) => refuse(error, userInitiated), {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 30000,
    });
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
    if (granted) startGeo(false);
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    void autoStart();
    return () => listeners.delete(listener);
}

const SERVER: State = { status: "idle", position: null };

export function useGeo() {
    const snapshot = useSyncExternalStore(subscribe, () => state, () => SERVER);
    return { ...snapshot, start: () => startGeo(true) };
}
