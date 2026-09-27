"use client";

import {
    LocateFixed,
} from "lucide-react";

import {
    useMap,
} from "react-leaflet";

type MapCenterButtonProps = {
    latitude: number;
    longitude: number;
};

export default function MapCenterButton({
    latitude,
    longitude,
}: MapCenterButtonProps) {
    const map =
        useMap();

    return (
        <button
            type="button"
            className="nt-map-center-button"
            onClick={() =>
                map.flyTo(
                    [
                        latitude,
                        longitude,
                    ],
                    14,
                    {
                        duration: 0.65,
                    }
                )
            }
            aria-label="Center map on my location"
            title="Center on my location"
        >
            <LocateFixed size={17} />
        </button>
    );
}