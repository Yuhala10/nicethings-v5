"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "../map/MapView";

const MapView = dynamic(() => import("../map/MapView"), {
    ssr: false,
    loading: () => <div className="nt-skeleton absolute inset-0" aria-hidden />,
});

// A still map centred on one place, with its category pin. Loaded after
// the page, so the text never waits for map tiles.
export default function PlaceMap({
    id,
    lat,
    lng,
    category,
    className = "",
}: {
    id: string;
    lat: number;
    lng: number;
    category: string;
    className?: string;
}) {
    const pins: MapPin[] = [{ id, lat, lng, category, open: null }];
    return (
        <MapView
            className={className}
            pins={pins}
            selectedId={id}
            center={{ lat, lng }}
            zoom={15.5}
            interactive={false}
            padding={{ top: 20, bottom: 60, left: 20, right: 20 }}
        />
    );
}
