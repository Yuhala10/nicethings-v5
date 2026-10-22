"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { City } from "@/lib/cities";
import { paths } from "@/lib/places/paths";
import { CATEGORIES, tagLabel } from "@/lib/tags";
import { PlaceThumb } from "../place/bits";
import { useLocale } from "../site/LocaleProvider";

type Found = { slug: string; name: string; neighborhood: string | null; city: string; cover: string | null; category: string };

// Nothing in this city: the place typed may be in another one (someone in
// Yaoundé typing "barombi" means the lake near Kumba). Asks the whole
// catalogue by name and shows what is elsewhere.
export default function Elsewhere({ text, city }: { text: string; city: City }) {
    const { locale, t } = useLocale();
    const words = text.trim();
    const [result, setResult] = useState<{ words: string; places: Found[] } | null>(null);

    useEffect(() => {
        if (words.length < 3) return;
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            fetch(`/api/places?q=${encodeURIComponent(words)}`, { signal: controller.signal })
                .then((response) => (response.ok ? response.json() : { places: [] }))
                .then((data: { places?: Found[] }) => setResult({ words, places: (data.places ?? []).filter((place) => place.city !== city.name).slice(0, 4) }))
                .catch(() => {});
        }, 350);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [words, city.name]);

    const places = result?.words === words ? result.places : [];
    if (!places.length) return null;
    return (
        <div className="mt-8 text-left">
            <p className="nt-eyebrow px-1">{t.search.elsewhere}</p>
            <ul className="mt-2 grid gap-1">
                {places.map((place) => (
                    <li key={place.slug}>
                        <Link href={paths.place(locale, place.slug)} prefetch={false} className="flex min-h-11 items-center gap-3 rounded-2xl p-2 transition hover:bg-surface-2 active:scale-[0.99]">
                            <PlaceThumb cover={place.cover} category={place.category} name={place.name} sizes="56px" className="h-14 w-14 shrink-0 rounded-[0.8rem]" iconSize={18} />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold text-text">{place.name}</span>
                                <span className="block truncate text-sm text-muted">{[tagLabel(CATEGORIES, place.category, locale), place.neighborhood, place.city].filter(Boolean).join(" · ")}</span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
