"use client";

import { useCallback, useEffect, useState } from "react";
import type { LatLng } from "../places/geo";
import { YAOUNDE_BOUNDS } from "../places/geo";
import { YAOUNDE_NEIGHBORHOODS } from "../tags";

// Where the visitor is starting from: live GPS when allowed, otherwise the
// neighbourhood they picked. Remembered on the phone between visits.

export type Origin =
    | { kind: "gps"; position: LatLng; accuracy: number }
    | { kind: "area"; name: string; position: LatLng };

export type LocateStatus = "idle" | "locating" | "denied" | "unavailable" | "outside";

const KEY = "nt_origin_v1";
const GRANTED_KEY = "nt_geo_granted";

function inYaounde({ lat, lng }: LatLng) {
    const [[west, south], [east, north]] = YAOUNDE_BOUNDS;
    return lat >= south && lat <= north && lng >= west && lng <= east;
}

export function useOrigin() {
    const [origin, setOrigin] = useState<Origin | null>(null);
    const [status, setStatus] = useState<LocateStatus>("idle");

    const locate = useCallback(() => {
        if (!("geolocation" in navigator)) {
            setStatus("unavailable");
            return;
        }
        setStatus("locating");
        navigator.geolocation.getCurrentPosition(
            (result) => {
                const position = { lat: result.coords.latitude, lng: result.coords.longitude };
                try {
                    localStorage.setItem(GRANTED_KEY, "1");
                } catch {}
                // Someone opening the app from Douala or abroad still gets a
                // useful Yaoundé map rather than an empty one.
                if (!inYaounde(position)) {
                    setStatus("outside");
                    return;
                }
                setOrigin({ kind: "gps", position, accuracy: result.coords.accuracy });
                setStatus("idle");
            },
            (error) => setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable"),
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
        );
    }, []);

    const chooseArea = useCallback((name: string | null) => {
        if (!name) {
            setOrigin(null);
            try {
                localStorage.removeItem(KEY);
            } catch {}
            return;
        }
        const area = YAOUNDE_NEIGHBORHOODS.find((item) => item.name === name);
        if (!area) return;
        setOrigin({ kind: "area", name: area.name, position: { lat: area.lat, lng: area.lng } });
        setStatus("idle");
        try {
            localStorage.setItem(KEY, area.name);
        } catch {}
    }, []);

    // Restore: re-use GPS silently if the visitor allowed it before,
    // otherwise their last chosen neighbourhood.
    useEffect(() => {
        let granted = false;
        let area: string | null = null;
        try {
            granted = localStorage.getItem(GRANTED_KEY) === "1";
            area = localStorage.getItem(KEY);
        } catch {}

         
        if (area) chooseArea(area);
        if (granted) locate();
    }, [chooseArea, locate]);

    return { origin, status, locate, chooseArea };
}
