"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Compass } from "lucide-react";
import { DEFAULT_CITY, cityAt, cityBySlug } from "@/lib/cities";
import { paths } from "@/lib/places/paths";
import { useLocale } from "../site/LocaleProvider";

// /carte and /recherche: open the map or search in the visitor's city — the one they were last in,
// or where their GPS says they are, otherwise Yaoundé.
export default function MapEntry({ target = "map" }: { target?: "map" | "search" }) {
    const router = useRouter();
    const search = useSearchParams();
    const { locale, t } = useLocale();

    useEffect(() => {
        // The query string travels along (?q= typed words, ?i= a mood chip).
        const rest = search.toString();
        const go = (slug: string) =>
            router.replace(`${target === "search" ? paths.search(locale, slug) : paths.explore(locale, slug)}${rest ? `?${rest}` : ""}`);
        let saved: string | null = null;
        try {
            saved = localStorage.getItem("nt_city");
        } catch {}
        if (cityBySlug(saved)) return go(saved!);

        let granted = false;
        try {
            granted = localStorage.getItem("nt_geo_granted") === "1";
        } catch {}
        if (granted && "geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (result) => go(cityAt(result.coords.latitude, result.coords.longitude)?.slug ?? DEFAULT_CITY.slug),
                () => go(DEFAULT_CITY.slug),
                { timeout: 5000, maximumAge: 600000 }
            );
            return;
        }
        go(DEFAULT_CITY.slug);
    }, [locale, router, search, target]);

    return (
        <div className="fixed inset-0 grid place-items-center bg-bg">
            <div className="flex flex-col items-center gap-3 text-muted">
                <Compass size={34} className="animate-spin text-brand-500 [animation-duration:2.4s]" />
                <p className="text-sm font-semibold">{t.common.loading}</p>
            </div>
        </div>
    );
}
