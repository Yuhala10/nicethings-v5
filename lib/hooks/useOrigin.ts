"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cityAt, type City } from "../cities";
import type { LatLng } from "../places/geo";
import { useGeo } from "./useGeo";

// Where the visitor is starting from in a given city: their live GPS
// position when they are in that city, otherwise the neighbourhood they
// picked (remembered per city).

export type Origin =
    | { kind: "gps"; position: LatLng; accuracy: number; heading: number | null }
    | { kind: "area"; name: string; position: LatLng };

export type LocateStatus = "idle" | "locating" | "denied" | "unavailable" | "outside";

type AreaPoint = { name: string; lat: number; lng: number };

export function useOrigin(city: City, areas: readonly AreaPoint[]) {
    const geo = useGeo();
    const key = `nt_area_${city.slug}`;
    const [areaName, setAreaName] = useState<string | null>(null);

    useEffect(() => {
        try {
            setAreaName(localStorage.getItem(key));
        } catch {}
    }, [key]);

    const gpsCity = geo.position ? cityAt(geo.position.lat, geo.position.lng) : null;
    const inCity = gpsCity?.slug === city.slug;

    const origin = useMemo<Origin | null>(() => {
        if (geo.position && inCity) {
            return {
                kind: "gps",
                position: { lat: geo.position.lat, lng: geo.position.lng },
                accuracy: geo.position.accuracy,
                heading: geo.position.heading,
            };
        }
        const area = areaName ? areas.find((item) => item.name === areaName) : null;
        return area ? { kind: "area", name: area.name, position: { lat: area.lat, lng: area.lng } } : null;
    }, [geo.position, inCity, areaName, areas]);

    const chooseArea = useCallback(
        (name: string | null) => {
            setAreaName(name);
            try {
                if (name) localStorage.setItem(key, name);
                else localStorage.removeItem(key);
            } catch {}
        },
        [key]
    );

    const status: LocateStatus =
        geo.status === "locating"
            ? "locating"
            : geo.status === "denied"
              ? "denied"
              : geo.status === "unavailable"
                ? "unavailable"
                : geo.position && !inCity
                  ? "outside"
                  : "idle";

    return { origin, status, locate: geo.start, chooseArea, gpsCity, geoActive: geo.status === "active" };
}
