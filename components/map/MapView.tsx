"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { FilterSpecification, GeoJSONSource, Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import { MapPinOff } from "lucide-react";
import { CATEGORY_STYLE, categoryStyle } from "@/lib/places/display";
import type { LatLng } from "@/lib/places/geo";
import { useLocale } from "../site/LocaleProvider";

// The NiceThings map engine (MapLibre + OpenFreeMap vector tiles, free and
// keyless): category pins drawn with their icon, clusters, the visitor's
// puck with heading, start/destination markers, an animated route that
// greys out behind you, and a tilted follow camera for navigation.

export type MapPin = {
    id: string;
    lat: number;
    lng: number;
    category: string;
    open: boolean | null;
};

export type MapRoute = {
    coordinates: [number, number][]; // [lng, lat]
    progress?: number; // 0..1 already travelled
};

export type FollowCamera = { lat: number; lng: number; bearing: number | null };

type Props = {
    pins: MapPin[];
    selectedId?: string | null;
    onSelect?: (id: string | null) => void;
    user?: (LatLng & { heading?: number | null }) | null;
    start?: LatLng | null; // chosen start when it is not the GPS position
    destination?: LatLng | null;
    focus?: LatLng | null; // fly here when it changes
    route?: MapRoute | null;
    follow?: FollowCamera | null; // navigation camera
    center?: LatLng;
    zoom?: number;
    bounds?: [[number, number], [number, number]]; // [[west, south], [east, north]]
    padding?: { top: number; bottom: number; left: number; right: number };
    className?: string;
    interactive?: boolean;
};

const STYLE_LIGHT = "https://tiles.openfreemap.org/styles/liberty";
const STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";
const FONT = ["Noto Sans Bold"];
const BRAND = "#f97316";
const PIXEL_RATIO = 2;

function prefersDark() {
    const forced = document.documentElement.dataset.theme;
    if (forced) return forced === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Styles are cached for the session: the second map on a page (or the
// next page) appears instantly.
const styleCache = new Map<string, Promise<StyleSpecification>>();
function loadStyle(dark: boolean) {
    const url = dark ? STYLE_DARK : STYLE_LIGHT;
    if (!styleCache.has(url)) {
        styleCache.set(
            url,
            fetch(url)
                .then((response) => {
                    if (!response.ok) throw new Error(`style ${response.status}`);
                    return response.json() as Promise<StyleSpecification>;
                })
                .then((style) => {
                    // Quieter POI icons: our own pins are the stars of the map.
                    style.layers = style.layers.filter((layer) => !/^poi/.test(layer.id));
                    return style;
                })
                .catch((error) => {
                    styleCache.delete(url);
                    throw error;
                })
        );
    }
    return styleCache.get(url)!;
}

function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
    });
}

function svgData(svg: string) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// A round pin in the category tone with its white line icon.
async function drawPin(tone: string, iconSvg: string, size: number) {
    const canvas = document.createElement("canvas");
    const px = size * PIXEL_RATIO;
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext("2d")!;
    const r = px / 2;
    ctx.shadowColor = "rgba(0,0,0,0.28)";
    ctx.shadowBlur = px * 0.12;
    ctx.shadowOffsetY = px * 0.04;
    ctx.beginPath();
    ctx.arc(r, r, r * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.shadowColor = "transparent";
    const gradient = ctx.createLinearGradient(0, 0, px, px);
    gradient.addColorStop(0, tone);
    gradient.addColorStop(1, shade(tone, -0.25));
    ctx.beginPath();
    ctx.arc(r, r, r * 0.68, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    const icon = await loadImage(svgData(iconSvg));
    const iconSize = px * 0.62 * 0.62;
    ctx.drawImage(icon, r - iconSize / 2, r - iconSize / 2, iconSize, iconSize);
    return ctx.getImageData(0, 0, px, px);
}

function shade(hex: string, amount: number) {
    const value = parseInt(hex.slice(1), 16);
    const channel = (shift: number) => {
        const c = (value >> shift) & 255;
        return Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount);
    };
    return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, "0")}`;
}

// Navigation puck: blue dot with a heading cone.
function drawPuck(withHeading: boolean) {
    const px = 44 * PIXEL_RATIO;
    const canvas = document.createElement("canvas");
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext("2d")!;
    const c = px / 2;
    if (withHeading) {
        const cone = ctx.createLinearGradient(c, c, c, 0);
        cone.addColorStop(0, "rgba(37,99,235,0.45)");
        cone.addColorStop(1, "rgba(37,99,235,0)");
        ctx.beginPath();
        ctx.moveTo(c, c);
        ctx.arc(c, c, c, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55);
        ctx.closePath();
        ctx.fillStyle = cone;
        ctx.fill();
    }
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(c, c, px * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.beginPath();
    ctx.arc(c, c, px * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = "#2563eb";
    ctx.fill();
    return ctx.getImageData(0, 0, px, px);
}

// Destination: a teardrop in the brand colour.
function drawFlag() {
    const w = 40 * PIXEL_RATIO;
    const h = 52 * PIXEL_RATIO;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    const r = w * 0.4;
    const cx = w / 2;
    const cy = r + w * 0.08;
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.85, Math.PI * 0.15);
    ctx.lineTo(cx, h - 4);
    ctx.closePath();
    ctx.fillStyle = BRAND;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    return ctx.getImageData(0, 0, w, h);
}

async function addImages(map: MapLibreMap) {
    const images: [string, ImageData][] = await Promise.all(
        Object.entries(CATEGORY_STYLE).flatMap(([category, style]) => {
            const svg = renderToStaticMarkup(createElement(style.icon, { size: 24, color: "#ffffff", strokeWidth: 2.4 }));
            return [
                drawPin(style.tone, svg, 34).then((image) => [`pin-${category}`, image] as [string, ImageData]),
                drawPin("#8f8a84", svg, 34).then((image) => [`pin-closed-${category}`, image] as [string, ImageData]),
            ];
        })
    );
    for (const [name, image] of images) {
        if (!map.hasImage(name)) map.addImage(name, image, { pixelRatio: PIXEL_RATIO });
    }
    if (!map.hasImage("puck")) map.addImage("puck", drawPuck(false), { pixelRatio: PIXEL_RATIO });
    if (!map.hasImage("puck-heading")) map.addImage("puck-heading", drawPuck(true), { pixelRatio: PIXEL_RATIO });
    if (!map.hasImage("flag")) map.addImage("flag", drawFlag(), { pixelRatio: PIXEL_RATIO });
}

function pinsToGeoJSON(pins: MapPin[]): FeatureCollection {
    return {
        type: "FeatureCollection",
        features: pins.map((pin) => ({
            type: "Feature",
            id: pin.id,
            properties: {
                id: pin.id,
                icon: `${pin.open === false ? "pin-closed-" : "pin-"}${CATEGORY_STYLE[pin.category] ? pin.category : "Other"}`,
                tone: categoryStyle(pin.category).tone,
            },
            geometry: { type: "Point", coordinates: [pin.lng, pin.lat] },
        })),
    };
}

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };
const point = (p: LatLng, properties: Record<string, unknown> = {}): FeatureCollection => ({
    type: "FeatureCollection",
    features: [{ type: "Feature", properties, geometry: { type: "Point", coordinates: [p.lng, p.lat] } }],
});

function addLayers(map: MapLibreMap, dark: boolean) {
    const paper = dark ? "#151412" : "#ffffff";

    map.addSource("places", { type: "geojson", data: EMPTY, cluster: true, clusterRadius: 46, clusterMaxZoom: 14 });
    map.addSource("route", { type: "geojson", lineMetrics: true, data: EMPTY });
    map.addSource("markers", { type: "geojson", data: EMPTY });
    map.addSource("user", { type: "geojson", data: EMPTY });

    map.addLayer({
        id: "route-casing",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": dark ? "#7c2d12" : "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 11, 7, 17, 16] },
    });
    map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": BRAND, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 4, 17, 10] },
    });

    // Clusters: a soft halo and a solid core, sized by how many places.
    map.addLayer({
        id: "cluster-halo",
        type: "circle",
        source: "places",
        filter: ["has", "point_count"],
        paint: {
            "circle-color": BRAND,
            "circle-opacity": 0.22,
            "circle-radius": ["step", ["get", "point_count"], 24, 10, 29, 50, 35, 150, 42],
        },
    });
    map.addLayer({
        id: "clusters",
        type: "circle",
        source: "places",
        filter: ["has", "point_count"],
        paint: {
            "circle-color": dark ? "#f97316" : "#1c1917",
            "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 50, 25, 150, 30],
            "circle-stroke-width": 2.5,
            "circle-stroke-color": paper,
        },
    });
    map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "places",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": FONT, "text-size": 13, "text-allow-overlap": true },
        paint: { "text-color": "#ffffff" },
    });

    map.addLayer({
        id: "pin-selected-halo",
        type: "circle",
        source: "places",
        filter: ["==", ["get", "id"], ""],
        paint: { "circle-color": ["get", "tone"], "circle-opacity": 0.25, "circle-radius": 30, "circle-blur": 0.2 },
    });
    map.addLayer({
        id: "pins",
        type: "symbol",
        source: "places",
        filter: ["!", ["has", "point_count"]],
        layout: {
            "icon-image": ["get", "icon"],
            "icon-size": ["interpolate", ["linear"], ["zoom"], 11, 0.7, 15, 1],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
        },
    });
    map.addLayer({
        id: "pin-selected",
        type: "symbol",
        source: "places",
        filter: ["==", ["get", "id"], ""],
        layout: { "icon-image": ["get", "icon"], "icon-size": 1.45, "icon-allow-overlap": true, "icon-ignore-placement": true },
    });

    map.addLayer({
        id: "start-marker",
        type: "circle",
        source: "markers",
        filter: ["==", ["get", "kind"], "start"],
        paint: { "circle-radius": 8, "circle-color": paper, "circle-stroke-width": 5, "circle-stroke-color": "#1c1917" },
    });
    map.addLayer({
        id: "destination-marker",
        type: "symbol",
        source: "markers",
        filter: ["==", ["get", "kind"], "destination"],
        layout: { "icon-image": "flag", "icon-anchor": "bottom", "icon-allow-overlap": true, "icon-ignore-placement": true },
    });

    map.addLayer({
        id: "user-accuracy",
        type: "circle",
        source: "user",
        paint: { "circle-color": "#2563eb", "circle-opacity": 0.12, "circle-radius": 26 },
    });
    map.addLayer({
        id: "user-puck",
        type: "symbol",
        source: "user",
        layout: {
            "icon-image": ["case", ["==", ["get", "heading"], -1], "puck", "puck-heading"],
            "icon-rotate": ["get", "heading"],
            "icon-rotation-alignment": "map",
            "icon-pitch-alignment": "map",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
        },
    });
}

export default function MapView({
    pins,
    selectedId = null,
    onSelect,
    user = null,
    start = null,
    destination = null,
    focus = null,
    route = null,
    follow = null,
    center = { lat: 3.8667, lng: 11.5167 },
    zoom = 12.4,
    bounds,
    padding = { top: 80, bottom: 80, left: 40, right: 40 },
    className = "",
    interactive = true,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);
    const { t } = useLocale();
    const onSelectRef = useRef(onSelect);
    const paddingRef = useRef(padding);
    const initial = useRef({ center, zoom, bounds });

    useEffect(() => {
        onSelectRef.current = onSelect;
        paddingRef.current = padding;
    });

    // Create the map once.
    useEffect(() => {
        let cancelled = false;
        let map: MapLibreMap | null = null;

        (async () => {
            let loaded: [typeof import("maplibre-gl"), StyleSpecification];
            try {
                loaded = await Promise.all([import("maplibre-gl"), loadStyle(prefersDark())]);
            } catch {
                // Offline or tiles unreachable: the list around the map still works.
                if (!cancelled) setFailed(true);
                return;
            }
            if (cancelled || !containerRef.current) return;
            const [maplibregl, style] = loaded;
            const dark = prefersDark();
            const { center: c, zoom: z, bounds: b } = initial.current;

            map = new maplibregl.Map({
                container: containerRef.current,
                style,
                center: [c.lng, c.lat],
                zoom: z,
                minZoom: 5,
                maxZoom: 19,
                maxBounds: b
                    ? [
                          [b[0][0] - 0.3, b[0][1] - 0.3],
                          [b[1][0] + 0.3, b[1][1] + 0.3],
                      ]
                    : undefined,
                // Credits sit top-left, clear of sheets and bars (OSM requires them visible).
                attributionControl: false,
                interactive,
                pitchWithRotate: false,
                fadeDuration: 180,
            });
            map.addControl(new maplibregl.AttributionControl({ compact: true }), "top-left");
            map.touchZoomRotate.disableRotation();
            map.dragRotate.disable();

            const onStyle = async () => {
                if (!map || mapRef.current) return;
                await addImages(map);
                if (cancelled || !map) return;
                addLayers(map, dark);
                mapRef.current = map;
                setReady(true);
            };
            if (map.isStyleLoaded()) onStyle();
            else map.once("style.load", onStyle);

            map.on("click", "clusters", async (event) => {
                const feature = event.features?.[0];
                if (!feature || !map) return;
                const source = map.getSource("places") as GeoJSONSource;
                const expansion = await source.getClusterExpansionZoom(feature.properties.cluster_id);
                map.easeTo({
                    center: (feature.geometry as Point).coordinates as [number, number],
                    zoom: expansion + 0.4,
                    duration: 520,
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

    useEffect(() => {
        if (!ready || !mapRef.current) return;
        (mapRef.current.getSource("places") as GeoJSONSource).setData(pinsToGeoJSON(pins));
    }, [pins, ready]);

    // Selected pin: bigger, haloed, and gently brought into view.
    useEffect(() => {
        const map = mapRef.current;
        if (!ready || !map) return;
        const filter = ["==", ["get", "id"], selectedId ?? ""] as FilterSpecification;
        map.setFilter("pin-selected-halo", filter);
        map.setFilter("pin-selected", filter);
        const pin = selectedId ? pins.find((item) => item.id === selectedId) : null;
        if (pin) {
            map.easeTo({ center: [pin.lng, pin.lat], zoom: Math.max(map.getZoom(), 15.2), padding: paddingRef.current, duration: 650 });
        }
    }, [selectedId, pins, ready]);

    useEffect(() => {
        const map = mapRef.current;
        if (!ready || !map) return;
        (map.getSource("user") as GeoJSONSource).setData(
            user ? point(user, { heading: typeof user.heading === "number" ? user.heading : -1 }) : EMPTY
        );
    }, [user, ready]);

    useEffect(() => {
        const map = mapRef.current;
        if (!ready || !map) return;
        const features = [
            ...(start ? point(start, { kind: "start" }).features : []),
            ...(destination ? point(destination, { kind: "destination" }).features : []),
        ];
        (map.getSource("markers") as GeoJSONSource).setData({ type: "FeatureCollection", features });
    }, [start, destination, ready]);

    useEffect(() => {
        const map = mapRef.current;
        if (!ready || !map || !focus || follow) return;
        map.flyTo({ center: [focus.lng, focus.lat], zoom: 14.2, padding: paddingRef.current, duration: 1100, essential: true });
    }, [focus, follow, ready]);

    // Route geometry: fit the whole trip once, then draw it in.
    const routeKey = route ? `${route.coordinates.length}:${route.coordinates[0]?.join(",")}:${route.coordinates.at(-1)?.join(",")}` : "";
    useEffect(() => {
        const map = mapRef.current;
        if (!ready || !map) return;
        const source = map.getSource("route") as GeoJSONSource;
        if (!route || route.coordinates.length < 2) {
            source.setData(EMPTY);
            return;
        }
        source.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route.coordinates } });
        if (!follow) {
            const lngs = route.coordinates.map((p) => p[0]);
            const lats = route.coordinates.map((p) => p[1]);
            map.fitBounds(
                [
                    [Math.min(...lngs), Math.min(...lats)],
                    [Math.max(...lngs), Math.max(...lats)],
                ],
                { padding: paddingRef.current, duration: 900, maxZoom: 16.5 }
            );
        }
        let frame = 0;
        const started = performance.now();
        const animate = (time: number) => {
            const progress = Math.min(1, (time - started) / 1200);
            const eased = 1 - Math.pow(1 - progress, 3);
            map.setPaintProperty("route-line", "line-gradient", [
                "step",
                ["line-progress"],
                BRAND,
                Math.max(0.0001, eased),
                "rgba(249, 115, 22, 0)",
            ]);
            if (progress < 1) frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, [routeKey, ready]);

    // While navigating: the part already driven turns grey.
    const progress = route?.progress ?? 0;
    useEffect(() => {
        const map = mapRef.current;
        if (!ready || !map || !route || progress <= 0) return;
        map.setPaintProperty("route-line", "line-gradient", [
            "step",
            ["line-progress"],
            "#a8a29e",
            Math.min(0.9999, Math.max(0.0001, progress)),
            BRAND,
        ]);
    }, [progress, ready]);

    // Navigation camera: close, tilted, facing the direction of travel.
    useEffect(() => {
        const map = mapRef.current;
        if (!ready || !map) return;
        if (follow) {
            map.easeTo({
                center: [follow.lng, follow.lat],
                zoom: 17.2,
                pitch: 55,
                bearing: follow.bearing ?? map.getBearing(),
                padding: paddingRef.current,
                duration: 900,
                easing: (x) => x,
            });
        } else if (map.getPitch() > 0) {
            map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
        }
    }, [follow, ready]);

    return (
        <div className={className || "relative"}>
            <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
            {!ready && !failed && <div className="nt-skeleton absolute inset-0" aria-hidden />}
            {failed && (
                <div className="absolute inset-0 grid place-items-center bg-surface-2 p-8 text-center">
                    <div className="max-w-xs text-sm text-muted">
                        <MapPinOff size={28} className="mx-auto mb-3" />
                        {t.errors.mapFailed}
                    </div>
                </div>
            )}
        </div>
    );
}
