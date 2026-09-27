"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import type { LatLng } from "@/lib/places/geo";
import { YAOUNDE_BOUNDS, YAOUNDE_CENTER } from "@/lib/places/geo";

// Vector map (MapLibre + OpenFreeMap tiles, free and keyless) with:
// clustered place pins, price labels, a selected-pin highlight, the
// visitor's position and an animated route line. MapLibre is loaded
// lazily so it never blocks the first paint.

export type MapPin = {
    id: string;
    lat: number;
    lng: number;
    label: string; // short price ("3k") or emoji
    open: boolean | null;
};

export type MapRoute = {
    coordinates: [number, number][]; // [lng, lat]
};

type Props = {
    pins: MapPin[];
    selectedId?: string | null;
    onSelect?: (id: string | null) => void;
    user?: LatLng | null;
    focus?: LatLng | null; // fly here when it changes
    route?: MapRoute | null;
    padding?: { top: number; bottom: number; left: number; right: number };
    className?: string;
    interactive?: boolean;
};

const STYLE_LIGHT = "https://tiles.openfreemap.org/styles/positron";
const STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";
const FONT = ["Noto Sans Bold"];

function prefersDark() {
    const forced = document.documentElement.dataset.theme;
    if (forced) return forced === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Warm the neutral Positron style towards the NiceThings paper tone.
async function loadStyle(dark: boolean): Promise<StyleSpecification> {
    const style: StyleSpecification = await (await fetch(dark ? STYLE_DARK : STYLE_LIGHT)).json();
    if (!dark) {
        for (const layer of style.layers) {
            if (layer.id === "background" && layer.type === "background") {
                layer.paint = { ...layer.paint, "background-color": "#f4f1ec" };
            }
            if (layer.id === "water" && layer.type === "fill") {
                layer.paint = { ...layer.paint, "fill-color": "#cfe0e6" };
            }
            if (layer.id === "park" && layer.type === "fill") {
                layer.paint = { ...layer.paint, "fill-color": "#dfe9d3" };
            }
        }
    }
    return style;
}

function pinsToGeoJSON(pins: MapPin[]): FeatureCollection {
    return {
        type: "FeatureCollection",
        features: pins.map((pin) => ({
            type: "Feature",
            id: pin.id,
            properties: { id: pin.id, label: pin.label, open: pin.open === null ? -1 : pin.open ? 1 : 0 },
            geometry: { type: "Point", coordinates: [pin.lng, pin.lat] },
        })),
    };
}

function addLayers(map: MapLibreMap, dark: boolean) {
    const ink = dark ? "#f5f5f4" : "#111111";
    const paper = dark ? "#171717" : "#ffffff";

    map.addSource("places", {
        type: "geojson",
        data: pinsToGeoJSON([]),
        cluster: true,
        clusterRadius: 42,
        clusterMaxZoom: 14,
    });
    map.addSource("user", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addSource("route", {
        type: "geojson",
        lineMetrics: true,
        data: { type: "FeatureCollection", features: [] },
    });

    // Route: soft casing + brand line whose gradient is animated to "draw" it.
    map.addLayer({
        id: "route-casing",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": dark ? "#7c2d12" : "#fed7aa", "line-width": 11, "line-opacity": 0.9 },
    });
    map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#f97316", "line-width": 5.5 },
    });

    map.addLayer({
        id: "clusters",
        type: "circle",
        source: "places",
        filter: ["has", "point_count"],
        paint: {
            "circle-color": ink,
            "circle-radius": ["step", ["get", "point_count"], 17, 10, 21, 50, 26],
            "circle-stroke-width": 3,
            "circle-stroke-color": paper,
        },
    });
    map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "places",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": FONT, "text-size": 13 },
        paint: { "text-color": paper },
    });

    map.addLayer({
        id: "pin-selected-halo",
        type: "circle",
        source: "places",
        filter: ["==", ["get", "id"], ""],
        paint: { "circle-color": "#f97316", "circle-opacity": 0.22, "circle-radius": 26 },
    });
    map.addLayer({
        id: "pins",
        type: "circle",
        source: "places",
        filter: ["!", ["has", "point_count"]],
        paint: {
            "circle-color": ["match", ["get", "open"], 1, "#f97316", 0, dark ? "#57534e" : "#a8a29e", "#f97316"],
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 7, 15, 15],
            "circle-stroke-width": 2.5,
            "circle-stroke-color": paper,
        },
    });
    map.addLayer({
        id: "pin-labels",
        type: "symbol",
        source: "places",
        filter: ["!", ["has", "point_count"]],
        minzoom: 13.2,
        layout: {
            "text-field": ["get", "label"],
            "text-font": FONT,
            "text-size": 11,
            "text-allow-overlap": true,
        },
        paint: { "text-color": "#ffffff" },
    });

    map.addLayer({
        id: "user-halo",
        type: "circle",
        source: "user",
        paint: { "circle-color": "#2563eb", "circle-opacity": 0.18, "circle-radius": 22 },
    });
    map.addLayer({
        id: "user-dot",
        type: "circle",
        source: "user",
        paint: {
            "circle-color": "#2563eb",
            "circle-radius": 7.5,
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff",
        },
    });
}

export default function MapView({
    pins,
    selectedId = null,
    onSelect,
    user = null,
    focus = null,
    route = null,
    padding = { top: 80, bottom: 80, left: 40, right: 40 },
    className = "",
    interactive = true,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const [ready, setReady] = useState(false);
    const onSelectRef = useRef(onSelect);
    const paddingRef = useRef(padding);

    useEffect(() => {
        onSelectRef.current = onSelect;
        paddingRef.current = padding;
    });

    // Create the map once.
    useEffect(() => {
        let cancelled = false;
        let map: MapLibreMap | null = null;

        (async () => {
            const [{ default: maplibregl }, style] = await Promise.all([
                import("maplibre-gl"),
                loadStyle(prefersDark()),
            ]);
            if (cancelled || !containerRef.current) return;

            const dark = prefersDark();
            map = new maplibregl.Map({
                container: containerRef.current,
                style,
                center: [YAOUNDE_CENTER.lng, YAOUNDE_CENTER.lat],
                zoom: 12.4,
                minZoom: 10,
                maxZoom: 18.5,
                maxBounds: [
                    [YAOUNDE_BOUNDS[0][0] - 0.25, YAOUNDE_BOUNDS[0][1] - 0.25],
                    [YAOUNDE_BOUNDS[1][0] + 0.25, YAOUNDE_BOUNDS[1][1] + 0.25],
                ],
                attributionControl: { compact: true },
                interactive,
                dragRotate: false,
                pitchWithRotate: false,
                fadeDuration: 150,
            });
            map.touchZoomRotate.disableRotation();

            map.on("load", () => {
                if (!map) return;
                addLayers(map, dark);
                mapRef.current = map;
                setReady(true);
            });

            map.on("click", "clusters", async (event) => {
                const feature = event.features?.[0];
                if (!feature || !map) return;
                const source = map.getSource("places") as GeoJSONSource;
                const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);
                map.easeTo({
                    center: (feature.geometry as Point).coordinates as [number, number],
                    zoom: zoom + 0.3,
                    duration: 450,
                });
            });

            map.on("click", "pins", (event) => {
                const id = event.features?.[0]?.properties?.id;
                if (id) {
                    if (navigator.vibrate) navigator.vibrate(8);
                    onSelectRef.current?.(id);
                }
            });

            map.on("click", (event) => {
                const hits = map?.queryRenderedFeatures(event.point, { layers: ["pins", "clusters"] });
                if (!hits?.length) onSelectRef.current?.(null);
            });

            for (const layer of ["pins", "clusters"]) {
                map.on("mouseenter", layer, () => map && (map.getCanvas().style.cursor = "pointer"));
                map.on("mouseleave", layer, () => map && (map.getCanvas().style.cursor = ""));
            }
        })();

        return () => {
            cancelled = true;
            map?.remove();
            mapRef.current = null;
        };
    }, [interactive]);

    // Pins.
    useEffect(() => {
        if (!ready || !mapRef.current) return;
        (mapRef.current.getSource("places") as GeoJSONSource).setData(pinsToGeoJSON(pins));
    }, [pins, ready]);

    // Selected pin highlight + gentle fly-to.
    useEffect(() => {
        const map = mapRef.current;
        if (!ready || !map) return;
        map.setFilter("pin-selected-halo", ["==", ["get", "id"], selectedId ?? ""]);
        const pin = selectedId ? pins.find((item) => item.id === selectedId) : null;
        if (pin) {
            map.easeTo({
                center: [pin.lng, pin.lat],
                zoom: Math.max(map.getZoom(), 15),
                padding: paddingRef.current,
                duration: 600,
            });
        }
    }, [selectedId, pins, ready]);

    // Visitor position.
    useEffect(() => {
        const map = mapRef.current;
        if (!ready || !map) return;
        (map.getSource("user") as GeoJSONSource).setData({
            type: "FeatureCollection",
            features: user
                ? [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [user.lng, user.lat] } }]
                : [],
        });
    }, [user, ready]);

    // Fly to a focus point (new origin / neighbourhood).
    useEffect(() => {
        const map = mapRef.current;
        if (!ready || !map || !focus) return;
        map.flyTo({ center: [focus.lng, focus.lat], zoom: 14.2, padding: paddingRef.current, duration: 900 });
    }, [focus, ready]);

    // Route: fit the whole trip, then draw the line progressively.
    useEffect(() => {
        const map = mapRef.current;
        if (!ready || !map) return;
        const source = map.getSource("route") as GeoJSONSource;

        if (!route || route.coordinates.length < 2) {
            source.setData({ type: "FeatureCollection", features: [] });
            return;
        }

        source.setData({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: route.coordinates },
        });

        const lngs = route.coordinates.map((point) => point[0]);
        const lats = route.coordinates.map((point) => point[1]);
        map.fitBounds(
            [
                [Math.min(...lngs), Math.min(...lats)],
                [Math.max(...lngs), Math.max(...lats)],
            ],
            { padding: paddingRef.current, duration: 800, maxZoom: 16.5 }
        );

        let frame = 0;
        const start = performance.now();
        const duration = 1100;
        const animate = (time: number) => {
            const progress = Math.min(1, (time - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            map.setPaintProperty("route-line", "line-gradient", [
                "step",
                ["line-progress"],
                "#f97316",
                Math.max(0.0001, eased),
                "rgba(249, 115, 22, 0)",
            ]);
            if (progress < 1) frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, [route, ready]);

    return (
        <div className={`relative ${className}`}>
            <div ref={containerRef} className="absolute inset-0" />
            {!ready && <div className="nt-skeleton absolute inset-0" aria-hidden />}
        </div>
    );
}
