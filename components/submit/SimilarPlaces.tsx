"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CopyCheck, SearchCheck } from "lucide-react";
import { paths } from "@/lib/places/paths";
import { PlaceThumb } from "../place/bits";
import { useLocale } from "../site/LocaleProvider";

type Match = { slug: string; name: string; category: string; neighborhood: string | null; cover: string | null; distance: number | null; duplicate: boolean };

// While the visitor types a name: the places NiceThings already has that
// look like it. A certain match blocks the form (no duplicates), a likely
// one is suggested. Branches of the same chain stay possible: pinning the
// position shows it's somewhere else.
export default function SimilarPlaces({
    name,
    city,
    neighborhood,
    pin,
    onDuplicate,
}: {
    name: string;
    city: string;
    neighborhood: string;
    pin: { lat: number; lng: number } | null;
    onDuplicate: (blocked: boolean) => void;
}) {
    const { locale, t } = useLocale();
    const [matches, setMatches] = useState<Match[]>([]);

    useEffect(() => {
        const query = name.trim();
        if (query.length < 3) {
            setMatches([]);
            onDuplicate(false);
            return;
        }
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            const params = new URLSearchParams({ name: query, city, area: neighborhood });
            if (pin) {
                params.set("lat", pin.lat.toFixed(5));
                params.set("lng", pin.lng.toFixed(5));
            }
            fetch(`/api/places/similar?${params}`, { signal: controller.signal })
                .then((response) => response.json())
                .then((data: { matches: Match[] }) => {
                    setMatches(data.matches);
                    onDuplicate(data.matches.some((match) => match.duplicate));
                })
                .catch(() => {});
        }, 450);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [name, city, neighborhood, pin?.lat, pin?.lng]);

    if (!matches.length) return null;
    const duplicate = matches.find((match) => match.duplicate);
    const shown = duplicate ? [duplicate] : matches.slice(0, 3);

    return (
        <div className={`mt-3 rounded-[1.4rem] border p-4 ${duplicate ? "border-brand-500/50 bg-brand-500/[0.07]" : "border-line bg-surface-2"}`} role={duplicate ? "alert" : "status"}>
            <p className="flex items-center gap-2 font-display font-extrabold">
                {duplicate ? <CopyCheck size={19} className="text-brand-600" /> : <SearchCheck size={19} className="text-text-2" />}
                {duplicate ? t.submit.duplicateTitle : t.submit.maybeTitle}
            </p>
            {duplicate && <p className="mt-1 text-sm text-text-2">{t.submit.duplicateBody}</p>}
            <ul className="mt-3 grid gap-2">
                {shown.map((match) => (
                    <li key={match.slug}>
                        <Link href={paths.place(locale, match.slug)} target="_blank" className="flex items-center gap-3 rounded-2xl bg-surface p-2 pr-3 shadow-card transition hover:shadow-float">
                            <PlaceThumb cover={match.cover} category={match.category} name={match.name} sizes="48px" className="h-12 w-12 shrink-0 rounded-xl" iconSize={18} />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-bold">{match.name}</span>
                                <span className="block truncate text-xs text-muted">
                                    {[match.neighborhood, match.distance !== null ? `${match.distance < 1000 ? `${match.distance} m` : `${(match.distance / 1000).toFixed(1)} km`}` : null]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </span>
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-brand-600">
                                {t.submit.seePlace}
                                <ArrowUpRight size={15} />
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
            {duplicate && !pin && <p className="mt-3 text-xs text-muted">{t.submit.otherBranch}</p>}
        </div>
    );
}
