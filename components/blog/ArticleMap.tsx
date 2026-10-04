"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPinned } from "lucide-react";
import { fill } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import type { PlaceSummary } from "@/lib/places/types";
import { CATEGORIES, tagLabel } from "@/lib/tags";
import type { MapPin } from "../map/MapView";
import { useLocale } from "../site/LocaleProvider";

const MapView = dynamic(() => import("../map/MapView"), {
    ssr: false,
    loading: () => <div className="nt-skeleton absolute inset-0" aria-hidden />,
});

// Every place of the article on one map, numbered like in the text: tap a
// pin or a name to find it in the other.
export default function ArticleMap({ places }: { places: PlaceSummary[] }) {
    const { locale, t } = useLocale();
    const [selected, setSelected] = useState<string | null>(null);

    const pins: MapPin[] = useMemo(() => places.map((place) => ({ id: place.slug, lat: place.lat, lng: place.lng, category: place.category, open: null })), [places]);
    const bounds = useMemo((): [[number, number], [number, number]] => {
        const lats = places.map((place) => place.lat);
        const lngs = places.map((place) => place.lng);
        const pad = 0.004;
        return [
            [Math.min(...lngs) - pad, Math.min(...lats) - pad],
            [Math.max(...lngs) + pad, Math.max(...lats) + pad],
        ];
    }, [places]);

    return (
        <section aria-labelledby="article-map" className="my-12 overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-card">
            <div className="flex items-center gap-3 px-5 pt-5">
                <span className="nt-sunset grid h-10 w-10 place-items-center rounded-2xl text-white">
                    <MapPinned size={20} />
                </span>
                <div>
                    <h2 id="article-map" className="nt-serif text-[1.6rem]">
                        {t.blog.mapTitle}
                    </h2>
                    <p className="text-sm text-muted">{fill(t.blog.mapHint, { count: places.length })}</p>
                </div>
            </div>
            <div className="relative mt-4 h-72 md:h-80">
                <MapView
                    className="absolute inset-0"
                    pins={pins}
                    bounds={bounds}
                    selectedId={selected}
                    onSelect={(id) => {
                        setSelected(id);
                        if (id) document.getElementById(`carte-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
                    }}
                    padding={{ top: 40, bottom: 40, left: 40, right: 40 }}
                />
            </div>
            <ol className="divide-y divide-line">
                {places.map((place, index) => (
                    <li
                        key={place.slug}
                        id={`carte-${place.slug}`}
                        className={`flex items-center gap-3 px-5 py-3 transition ${selected === place.slug ? "bg-brand-50 dark:bg-brand-700/15" : ""}`}
                    >
                        <button type="button" onClick={() => setSelected(place.slug)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                            <span className="nt-sunset grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-xs font-extrabold text-white">{index + 1}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-bold">{place.name}</span>
                                <span className="block truncate text-xs text-muted">
                                    {[tagLabel(CATEGORIES, place.category, locale), place.neighborhood].filter(Boolean).join(" · ")}
                                </span>
                            </span>
                        </button>
                        <Link href={paths.place(locale, place.slug)} className="shrink-0 text-sm font-bold text-brand-600">
                            {t.blog.openPlace}
                        </Link>
                    </li>
                ))}
            </ol>
        </section>
    );
}
