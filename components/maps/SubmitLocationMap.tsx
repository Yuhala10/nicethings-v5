"use client";

import {
    CircleMarker,
    MapContainer,
    Marker,
    TileLayer,
    useMap,
} from "react-leaflet";

import L from "leaflet";

import {
    LocateFixed,
    MapPin,
} from "lucide-react";

import { useEffect } from "react";

export type SubmitMapLocation = {
    latitude: number;
    longitude: number;
    accuracy: number | null;
};

function createSubmitMapIcon() {
    return L.divIcon({
        className:
            "nt-submit-map-marker-wrap",

        html: `
            <div class="nt-submit-map-marker">
                <div class="nt-submit-map-marker-pulse"></div>

                <div class="nt-submit-map-marker-core">
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
                            r="3"
                            fill="white"
                        />
                    </svg>
                </div>
            </div>
        `,

        iconSize: [48, 48],
        iconAnchor: [24, 48],
    });
}

function SubmitMapViewport({
    latitude,
    longitude,
}: {
    latitude: number;
    longitude: number;
}) {
    const map = useMap();

    useEffect(() => {
        map.setView(
            [latitude, longitude],
            16,
            {
                animate: true,
            }
        );
    }, [
        map,
        latitude,
        longitude,
    ]);

    return null;
}

export default function SubmitLocationMap({
    location,
}: {
    location: SubmitMapLocation | null;
}) {
    if (!location) {
        return (
            <div className="nt-submit-map-empty">
                <div className="nt-submit-map-empty-icon">
                    <MapPin size={22} />
                </div>

                <div>
                    <strong>
                        Your map location will appear here
                    </strong>

                    <span>
                        Use your current location above
                        and NiceThings will place the
                        pin here.
                    </span>
                </div>
            </div>
        );
    }

    const placeIcon =
        createSubmitMapIcon();

    return (
        <div className="nt-submit-map-frame">
            <MapContainer
                center={[
                    location.latitude,
                    location.longitude,
                ]}
                zoom={16}
                minZoom={10}
                maxZoom={19}
                scrollWheelZoom
                zoomControl
                attributionControl
                className="nt-submit-map"
            >
                <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <SubmitMapViewport
                    latitude={
                        location.latitude
                    }
                    longitude={
                        location.longitude
                    }
                />

                <CircleMarker
                    center={[
                        location.latitude,
                        location.longitude,
                    ]}
                    radius={22}
                    pathOptions={{
                        color: "#f97316",
                        fillColor:
                            "#f97316",
                        fillOpacity: 0.08,
                        weight: 1,
                        opacity: 0.22,
                    }}
                />

                <Marker
                    position={[
                        location.latitude,
                        location.longitude,
                    ]}
                    icon={placeIcon}
                />
            </MapContainer>

            <div className="nt-submit-map-overlay">
                <div className="nt-submit-map-status">
                    <span className="nt-submit-map-status-dot" />

                    <div>
                        <strong>
                            Location captured
                        </strong>

                        <span>
                            This position will
                            be attached to your
                            submission.
                        </span>
                    </div>
                </div>

                <div className="nt-submit-map-accuracy">
                    <LocateFixed
                        size={14}
                    />

                    {location.accuracy !==
                        null
                        ? `±${Math.max(
                            1,
                            Math.round(
                                location.accuracy
                            )
                        )} m`
                        : "GPS position"}
                </div>
            </div>
        </div>
    );
}