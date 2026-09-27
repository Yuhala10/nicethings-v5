"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "../map/MapView";

const MapView = dynamic(() => import("../map/MapView"), {
    ssr: false,
    loading: () => <div className="nt-skeleton absolute inset-0" aria-hidden />,
});

// A still map centred on one place. Loaded after the page, so the text
// (what people and Google read first) never waits for map tiles.
export default function PlaceMap({
    id,
    lat,
    lng,
    className = "",
}: {
    id: string;
    lat: number;
    lng: number;
    className?: string;
}) {
    const pins: MapPin[] = [{ id, lat, lng, label: "", open: null }];
    return (
        <MapView
            className={className}
            pins={pins}
            selectedId={id}
            interactive={false}
            padding={{ top: 20, bottom: 20, left: 20, right: 20 }}
        />
    );
}
