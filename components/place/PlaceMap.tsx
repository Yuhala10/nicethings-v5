"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { MapPin } from "../map/MapView";

const MapView = dynamic(() => import("../map/MapView"), {
    ssr: false,
    loading: () => <div className="nt-skeleton absolute inset-0" aria-hidden />,
});

// A still map centred on one place, with its category pin. The map (its
// code and its tiles) is only fetched when the visitor scrolls near it:
// until then a modest phone has nothing to do but show the page.
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
    const holder = useRef<HTMLDivElement>(null);
    const [near, setNear] = useState(false);

    useEffect(() => {
        const node = holder.current;
        if (!node || typeof IntersectionObserver === "undefined") return;
        const watcher = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setNear(true);
                    watcher.disconnect();
                }
            },
            // No head start: the map sits just under the first screen, and a
            // margin would fetch it for everyone, scrolling or not.
            { rootMargin: "0px" }
        );
        watcher.observe(node);
        return () => watcher.disconnect();
    }, []);

    if (!near) return <div ref={holder} className={`nt-skeleton ${className}`} aria-hidden />;

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
