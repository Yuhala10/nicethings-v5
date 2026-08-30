"use client";

import {
    MapContainer,
    Marker,
    Popup,
    TileLayer,
    Circle,
    Polyline,
    useMap,
} from "react-leaflet";

import L from "leaflet";

import {
    MapPin,
    Navigation,
    LocateFixed,
    Maximize2,
} from "lucide-react";

import Link from "next/link";

import {
    useEffect,
    useMemo,
} from "react";

type MapSpot = {
    id: string;
    name: string;
    slug?: string | null;
    latitude: number;
    longitude: number;
    category?: string | null;
    rating?: number | null;
    review_count?: number | null;
    distanceKm?: number | null;
};

type NearbyMapProps = {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    radiusKm?: number;
    spots: MapSpot[];
    selectedSpotId?: string | null;
    onSelectSpot?: (
        spot: MapSpot
    ) => void;
};

function createUserIcon() {
    return L.divIcon({
        className:
            "nt-map-user-icon-wrapper",

        html: `
            <div class="nt-map-user-icon">
                <div class="nt-map-user-pulse"></div>
                <div class="nt-map-user-pulse nt-map-user-pulse-delay"></div>
                <div class="nt-map-user-dot"></div>
            </div>
        `,

        iconSize: [36, 36],
        iconAnchor: [18, 18],
    });
}

function createSpotIcon(
    selected = false
) {
    return L.divIcon({
        className: [
            "nt-map-spot-icon-wrapper",
            selected
                ? "selected"
                : "",
        ]
            .filter(Boolean)
            .join(" "),

        html: `
            <div class="nt-map-spot-icon">
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M20 10.5C20 15.5 12 21 12 21C12 21 4 15.5 4 10.5C4 6.36 7.58 3 12 3C16.42 3 20 6.36 20 10.5Z"
                        fill="currentColor"
                    />

                    <circle
                        cx="12"
                        cy="10.5"
                        r="2.8"
                        fill="white"
                    />
                </svg>
            </div>
        `,

        iconSize: selected
            ? [46, 46]
            : [38, 38],

        iconAnchor: selected
            ? [23, 46]
            : [19, 38],

        popupAnchor: [
            0,
            selected
                ? -43
                : -35,
        ],
    });
}

export default function NearbyMap({
    latitude,
    longitude,
    accuracy,
    radiusKm = 10,
    spots,
    selectedSpotId,
    onSelectSpot,
}: NearbyMapProps) {
    const userIcon =
        typeof window !==
            "undefined"
            ? createUserIcon()
            : undefined;

    const validSpots =
        useMemo(
            () =>
                spots.filter(
                    (spot) =>
                        Number.isFinite(
                            spot.latitude
                        ) &&
                        Number.isFinite(
                            spot.longitude
                        )
                ),
            [spots]
        );

    const radiusMeters =
        radiusKm * 1000;

    /*
     * The orange boundary is intentionally
     * a second visual layer over the softer
     * discovery circle.
     */
    const radiusBoundary =
        useMemo(
            () => [
                [latitude, longitude],
                [
                    latitude +
                    radiusKm /
                    111,
                    longitude,
                ],
            ] as [
                number,
                number
            ][],
            [
                latitude,
                longitude,
                radiusKm,
            ]
        );

    return (
        <div className="nt-nearby-map">

            <MapContainer
                center={[
                    latitude,
                    longitude,
                ]}
                zoom={14}
                minZoom={10}
                maxZoom={19}
                scrollWheelZoom
                zoomControl={false}
                attributionControl
                className="nt-leaflet-map"
            >

                <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapController
                    latitude={
                        latitude
                    }
                    longitude={
                        longitude
                    }
                    selectedSpotId={
                        selectedSpotId
                    }
                    spots={
                        validSpots
                    }
                />

                {/* USER POSITION */}

                {userIcon && (
                    <Marker
                        position={[
                            latitude,
                            longitude,
                        ]}
                        icon={
                            userIcon
                        }
                        zIndexOffset={
                            2000
                        }
                    >
                        <Popup>
                            <div className="nt-map-popup-user">

                                <div className="nt-map-popup-user-icon">
                                    <LocateFixed
                                        size={
                                            15
                                        }
                                    />
                                </div>

                                <strong>
                                    You're here
                                </strong>

                                <span>
                                    NiceThings is using
                                    your current location
                                    to find places around
                                    you.
                                </span>

                                {typeof accuracy ===
                                    "number" && (
                                        <small>
                                            GPS accuracy:
                                            {" "}
                                            {Math.round(
                                                accuracy
                                            )}
                                            m
                                        </small>
                                    )}

                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* SOFT DISCOVERY AREA */}

                <Circle
                    center={[
                        latitude,
                        longitude,
                    ]}
                    radius={
                        radiusMeters
                    }
                    pathOptions={{
                        className:
                            "nt-map-radius",
                        weight: 2,
                        fillOpacity:
                            0.035,
                    }}
                />

                {/* THICK ORANGE DISCOVERY LINE */}

                <Circle
                    center={[
                        latitude,
                        longitude,
                    ]}
                    radius={
                        radiusMeters
                    }
                    pathOptions={{
                        className:
                            "nt-map-radius-orange",
                        weight: 5,
                        fillOpacity:
                            0,
                        opacity: 0.95,
                    }}
                />

                {/* USER → DISCOVERY EDGE VISUAL */}

                <Polyline
                    positions={
                        radiusBoundary
                    }
                    pathOptions={{
                        className:
                            "nt-map-discovery-line",
                        weight: 3,
                        opacity: 0.7,
                        dashArray:
                            "7 9",
                    }}
                />

                {/* PLACES */}

                {validSpots.map(
                    (
                        spot
                    ) => {
                        const selected =
                            spot.id ===
                            selectedSpotId;

                        return (
                            <Marker
                                key={
                                    spot.id
                                }
                                position={[
                                    spot.latitude,
                                    spot.longitude,
                                ]}
                                icon={createSpotIcon(
                                    selected
                                )}
                                zIndexOffset={
                                    selected
                                        ? 1500
                                        : 700
                                }
                                eventHandlers={{
                                    click: () =>
                                        onSelectSpot?.(
                                            spot
                                        ),
                                }}
                            >
                                <Popup>

                                    <div className="nt-map-popup">

                                        <div className="nt-map-popup-category">
                                            {formatCategory(
                                                spot.category
                                            )}
                                        </div>

                                        <strong>
                                            {
                                                spot.name
                                            }
                                        </strong>

                                        {typeof spot.rating ===
                                            "number" && (
                                                <span className="nt-map-popup-rating">
                                                    ★{" "}
                                                    {spot.rating.toFixed(
                                                        1
                                                    )}

                                                    {typeof spot.review_count ===
                                                        "number" && (
                                                            <small>
                                                                {" "}
                                                                (
                                                                {
                                                                    spot.review_count
                                                                }
                                                                )
                                                            </small>
                                                        )}
                                                </span>
                                            )}

                                        {typeof spot.distanceKm ===
                                            "number" && (
                                                <span className="nt-map-popup-distance">
                                                    <Navigation
                                                        size={
                                                            11
                                                        }
                                                    />

                                                    {formatDistance(
                                                        spot.distanceKm
                                                    )}

                                                    {" "}
                                                    away
                                                </span>
                                            )}

                                        <div className="nt-map-popup-actions">

                                            <Link
                                                href={`/spots/${encodeURIComponent(
                                                    spot.slug ??
                                                    spot.id
                                                )}`}
                                                className="nt-map-popup-link"
                                            >
                                                View place
                                            </Link>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openDirections(
                                                        spot
                                                    )
                                                }
                                                className="nt-map-popup-directions"
                                            >
                                                <Navigation
                                                    size={
                                                        13
                                                    }
                                                />

                                                Directions
                                            </button>

                                        </div>

                                    </div>

                                </Popup>
                            </Marker>
                        );
                    }
                )}

            </MapContainer>

            {/* TOP MAP STATUS */}

            <div className="nt-map-overlay-badge">

                <MapPin
                    size={14}
                />

                <span>
                    {validSpots.length}{" "}
                    {validSpots.length ===
                        1
                        ? "place"
                        : "places"}{" "}
                    nearby
                </span>

            </div>

            {/* RADIUS BADGE */}

            <div className="nt-map-radius-badge">

                <span />

                Within{" "}
                <strong>
                    {radiusKm} km
                </strong>

            </div>

            {/* MAP CONTROL HINT */}

            <div className="nt-map-attribution-note">

                <Maximize2
                    size={12}
                />

                <span>
                    Move the map to explore
                </span>

            </div>

        </div>
    );
}
function MapController({
    latitude,
    longitude,
    selectedSpotId,
    spots,
}: {
    latitude: number;
    longitude: number;
    selectedSpotId?: string | null;
    spots: MapSpot[];
}) {
    const map =
        useMap();

    useEffect(() => {
        if (
            !selectedSpotId
        ) {
            return;
        }

        const selected =
            spots.find(
                (
                    spot
                ) =>
                    spot.id ===
                    selectedSpotId
            );

        if (!selected) {
            return;
        }

        map.flyTo(
            [
                selected.latitude,
                selected.longitude,
            ],
            Math.max(
                map.getZoom(),
                16
            ),
            {
                duration: 0.75,
                easeLinearity:
                    0.25,
            }
        );
    }, [
        selectedSpotId,
        spots,
        map,
    ]);

    useEffect(() => {
        if (
            selectedSpotId
        ) {
            return;
        }

        map.panTo(
            [
                latitude,
                longitude,
            ],
            {
                animate: true,
                duration: 0.55,
            }
        );
    }, [
        latitude,
        longitude,
        selectedSpotId,
        map,
    ]);

    return null;
}

function openDirections(
    spot: MapSpot
) {
    const url =
        "https://www.google.com/maps/dir/?api=1" +
        `&destination=${encodeURIComponent(
            `${spot.latitude},${spot.longitude}`
        )}`;

    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );
}

function formatDistance(
    distance: number
) {
    if (
        distance < 1
    ) {
        return `${Math.round(
            distance * 1000
        )} m`;
    }

    if (
        distance < 10
    ) {
        return `${distance.toFixed(
            1
        )} km`;
    }

    return `${Math.round(
        distance
    )} km`;
}

function formatCategory(
    value?: string | null
) {
    if (!value) {
        return "Place";
    }

    return value
        .replaceAll(
            "_",
            " "
        )
        .replace(
            /\b\w/g,
            (
                letter
            ) =>
                letter.toUpperCase()
        );
}