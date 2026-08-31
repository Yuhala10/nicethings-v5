"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    CircleMarker,
    MapContainer,
    Marker,
    Polyline,
    TileLayer,
    useMap,
} from "react-leaflet";

import L from "leaflet";
import {
    Navigation,
} from "lucide-react";

type SpotMapProps = {
    latitude: number;
    longitude: number;
    spotName: string;
    userLatitude?: number | null;
    userLongitude?: number | null;
};

type RouteInfo = {
    distanceKm?: number | null;
    distanceMeters?: number | null;
    durationMinutes?: number | null;
    durationSeconds?: number | null;
};

function createPlaceIcon() {
    return L.divIcon({
        className:
            "nt-spot-map-marker-wrap",

        html: `
            <div class="nt-spot-map-marker">
                <div class="nt-spot-map-marker-dot"></div>
            </div>
        `,

        iconSize: [48, 48],
        iconAnchor: [24, 48],
        popupAnchor: [0, -43],
    });
}

function createUserIcon() {
    return L.divIcon({
        className:
            "nt-spot-map-user-wrap",

        html: `
            <div class="nt-spot-map-user">
                <div class="nt-spot-map-user-pulse"></div>
                <div class="nt-spot-map-user-dot"></div>
            </div>
        `,

        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
}

function MapViewport({
    latitude,
    longitude,
    userLatitude,
    userLongitude,
    hasRoute,
}: {
    latitude: number;
    longitude: number;
    userLatitude?: number | null;
    userLongitude?: number | null;
    hasRoute: boolean;
}) {
    const map = useMap();

    useEffect(() => {
        const hasUser =
            typeof userLatitude === "number" &&
            typeof userLongitude === "number";

        if (hasUser) {
            const bounds = L.latLngBounds(
                [
                    userLatitude as number,
                    userLongitude as number,
                ],
                [
                    latitude,
                    longitude,
                ]
            );

            map.fitBounds(bounds, {
                padding: [70, 70],
                maxZoom: 16,
                animate: true,
            });

            return;
        }

        map.setView(
            [latitude, longitude],
            hasRoute ? 15 : 16,
            {
                animate: true,
            }
        );
    }, [
        map,
        latitude,
        longitude,
        userLatitude,
        userLongitude,
        hasRoute,
    ]);

    return null;
}

function formatDistance(
    distanceMeters?: number | null,
    distanceKm?: number | null
) {
    if (
        typeof distanceMeters ===
        "number" &&
        Number.isFinite(
            distanceMeters
        )
    ) {
        if (distanceMeters < 1000) {
            return `${Math.round(
                distanceMeters
            )} m`;
        }

        return `${(
            distanceMeters / 1000
        ).toFixed(1)} km`;
    }

    if (
        typeof distanceKm === "number" &&
        Number.isFinite(distanceKm)
    ) {
        if (distanceKm < 1) {
            return `${Math.round(
                distanceKm * 1000
            )} m`;
        }

        return `${distanceKm.toFixed(
            1
        )} km`;
    }

    return null;
}

function formatDuration(
    durationMinutes?: number | null,
    durationSeconds?: number | null
) {
    if (
        typeof durationMinutes ===
        "number" &&
        Number.isFinite(
            durationMinutes
        )
    ) {
        const rounded =
            Math.max(
                1,
                Math.round(
                    durationMinutes
                )
            );

        if (rounded < 60) {
            return `${rounded} min`;
        }

        const hours =
            Math.floor(
                rounded / 60
            );

        const minutes =
            rounded % 60;

        return minutes
            ? `${hours}h ${minutes}m`
            : `${hours}h`;
    }

    if (
        typeof durationSeconds ===
        "number" &&
        Number.isFinite(
            durationSeconds
        )
    ) {
        const minutes =
            Math.max(
                1,
                Math.round(
                    durationSeconds / 60
                )
            );

        if (minutes < 60) {
            return `${minutes} min`;
        }

        const hours =
            Math.floor(
                minutes / 60
            );

        const remaining =
            minutes % 60;

        return remaining
            ? `${hours}h ${remaining}m`
            : `${hours}h`;
    }

    return null;
}

export default function SpotMap({
    latitude,
    longitude,
    spotName,
    userLatitude = null,
    userLongitude = null,
}: SpotMapProps) {
    const placeIcon =
        typeof window !== "undefined"
            ? createPlaceIcon()
            : undefined;

    const userIcon =
        typeof window !== "undefined"
            ? createUserIcon()
            : undefined;

    const hasUserLocation =
        typeof userLatitude === "number" &&
        typeof userLongitude === "number";

    const [
        routeCoordinates,
        setRouteCoordinates,
    ] = useState<
        [number, number][]
    >([]);

    const [
        routeInfo,
        setRouteInfo,
    ] = useState<RouteInfo | null>(
        null
    );

    const [
        routeLoading,
        setRouteLoading,
    ] = useState(false);

    const [
        routeError,
        setRouteError,
    ] = useState<string | null>(
        null
    );

    /*
     * -------------------------------------------------------
     * CALCULATE REAL ROAD ROUTE
     * -------------------------------------------------------
     *
     * Your existing API is:
     *
     * /api/route
     *
     * It returns GeoJSON:
     *
     * [longitude, latitude]
     *
     * Leaflet needs:
     *
     * [latitude, longitude]
     */

    useEffect(() => {
        let cancelled = false;

        async function calculateRoute() {
            if (
                !hasUserLocation
            ) {
                setRouteCoordinates(
                    []
                );

                setRouteInfo(null);

                setRouteError(null);

                setRouteLoading(
                    false
                );

                return;
            }

            setRouteLoading(true);
            setRouteError(null);
            setRouteCoordinates([]);
            setRouteInfo(null);

            try {
                const params =
                    new URLSearchParams({
                        fromLat:
                            String(
                                userLatitude
                            ),

                        fromLng:
                            String(
                                userLongitude
                            ),

                        toLat:
                            String(
                                latitude
                            ),

                        toLng:
                            String(
                                longitude
                            ),
                    });

                const response =
                    await fetch(
                        `/api/route?${params.toString()}`,
                        {
                            method:
                                "GET",

                            cache:
                                "no-store",
                        }
                    );

                const data =
                    (await response.json()) as {
                        success?: boolean;

                        geometry?: {
                            type?: string;

                            coordinates?: Array<
                                [
                                    number,
                                    number
                                ]
                            >;
                        };

                        distanceKm?:
                        number | null;

                        distanceMeters?:
                        number | null;

                        durationMinutes?:
                        number | null;

                        durationSeconds?:
                        number | null;

                        error?: string;
                    };

                if (
                    !response.ok ||
                    data.success !==
                    true ||
                    !data.geometry ||
                    !Array.isArray(
                        data.geometry
                            .coordinates
                    ) ||
                    data.geometry
                        .coordinates
                        .length < 2
                ) {
                    throw new Error(
                        data.error ||
                        "Unable to calculate the road route."
                    );
                }

                /*
                 * Convert GeoJSON coordinates:
                 *
                 * [lng, lat]
                 *
                 * into Leaflet:
                 *
                 * [lat, lng]
                 */
                const coordinates =
                    data.geometry.coordinates
                        .filter(
                            (
                                coordinate
                            ) =>
                                Array.isArray(
                                    coordinate
                                ) &&
                                coordinate.length >=
                                2 &&
                                Number.isFinite(
                                    Number(
                                        coordinate[0]
                                    )
                                ) &&
                                Number.isFinite(
                                    Number(
                                        coordinate[1]
                                    )
                                )
                        )
                        .map(
                            (
                                coordinate
                            ) =>
                                [
                                    Number(
                                        coordinate[1]
                                    ),
                                    Number(
                                        coordinate[0]
                                    ),
                                ] as [
                                    number,
                                    number
                                ]
                        );

                if (
                    cancelled ||
                    coordinates.length <
                    2
                ) {
                    return;
                }

                setRouteCoordinates(
                    coordinates
                );

                setRouteInfo({
                    distanceKm:
                        data.distanceKm ??
                        null,

                    distanceMeters:
                        data.distanceMeters ??
                        null,

                    durationMinutes:
                        data.durationMinutes ??
                        null,

                    durationSeconds:
                        data.durationSeconds ??
                        null,
                });
            } catch (error) {
                console.error(
                    "NiceThings road route error:",
                    error
                );

                if (
                    cancelled
                ) {
                    return;
                }

                setRouteCoordinates(
                    []
                );

                setRouteInfo(
                    null
                );

                setRouteError(
                    error instanceof
                        Error
                        ? error.message
                        : "Unable to calculate the road route."
                );
            } finally {
                if (
                    !cancelled
                ) {
                    setRouteLoading(
                        false
                    );
                }
            }
        }

        void calculateRoute();

        return () => {
            cancelled = true;
        };
    }, [
        latitude,
        longitude,
        userLatitude,
        userLongitude,
        hasUserLocation,
    ]);

    const routeReady =
        routeCoordinates.length >= 2;

    const distanceLabel =
        formatDistance(
            routeInfo?.distanceMeters,
            routeInfo?.distanceKm
        );

    const durationLabel =
        formatDuration(
            routeInfo?.durationMinutes,
            routeInfo?.durationSeconds
        );

    const routeSummary =
        [
            distanceLabel,
            durationLabel,
        ]
            .filter(Boolean)
            .join(" · ");

    const mapCenter = useMemo(
        () => [
            latitude,
            longitude,
        ] as [
                number,
                number
            ],
        [
            latitude,
            longitude,
        ]
    );

    return (
        <div className="nt-spot-map">
            <MapContainer
                center={mapCenter}
                zoom={16}
                minZoom={10}
                maxZoom={19}
                scrollWheelZoom
                zoomControl
                attributionControl
                className="nt-leaflet-map"
            >
                <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapViewport
                    latitude={
                        latitude
                    }
                    longitude={
                        longitude
                    }
                    userLatitude={
                        userLatitude
                    }
                    userLongitude={
                        userLongitude
                    }
                    hasRoute={
                        routeReady
                    }
                />

                {hasUserLocation &&
                    userIcon && (
                        <>
                            <CircleMarker
                                center={[
                                    userLatitude as number,
                                    userLongitude as number,
                                ]}
                                radius={20}
                                pathOptions={{
                                    color:
                                        "#f97316",

                                    fillColor:
                                        "#f97316",

                                    fillOpacity:
                                        0.08,

                                    weight: 1,

                                    opacity:
                                        0.28,
                                }}
                            />

                            <Marker
                                position={[
                                    userLatitude as number,
                                    userLongitude as number,
                                ]}
                                icon={
                                    userIcon
                                }
                            />
                        </>
                    )}

                /*
                * REAL ROAD ROUTE
                */
                {routeReady && (
                    <Polyline
                        positions={
                            routeCoordinates
                        }
                        pathOptions={{
                            color:
                                "#f97316",

                            weight:
                                7,

                            opacity:
                                0.94,

                            lineCap:
                                "round",

                            lineJoin:
                                "round",

                            className:
                                "nt-road-route",
                        }}
                    />
                )}

                {placeIcon && (
                    <Marker
                        position={[
                            latitude,
                            longitude,
                        ]}
                        icon={
                            placeIcon
                        }
                    />
                )}
            </MapContainer>

            {/* -------------------------------------------------
                TOP / BOTTOM MAP INFORMATION
               ------------------------------------------------- */}

            <div className="nt-spot-map-overlay">
                <div className="nt-spot-map-overlay-main">
                    <span>
                        {!hasUserLocation
                            ? "Place location"
                            : routeLoading
                                ? "Finding the best route"
                                : routeReady
                                    ? "Route to place"
                                    : "Place location"}
                    </span>

                    <strong>
                        {spotName}
                    </strong>

                    {routeReady &&
                        routeSummary && (
                            <div className="nt-spot-map-route-meta">
                                <Navigation
                                    size={12}
                                />

                                <span>
                                    {
                                        routeSummary
                                    }
                                </span>
                            </div>
                        )}
                </div>

                {hasUserLocation &&
                    routeLoading && (
                        <div className="nt-spot-map-route-loading">
                            <span className="nt-spot-map-route-loading-dot" />
                            Calculating
                        </div>
                    )}

                {hasUserLocation &&
                    !routeLoading &&
                    routeError && (
                        <div className="nt-spot-map-route-error">
                            Route unavailable
                        </div>
                    )}
            </div>
        </div>
    );
}