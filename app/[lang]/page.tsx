import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Landing from "@/components/landing/Landing";
import { parseDiscoveryText } from "@/lib/concierge/parse";
import { CITIES } from "@/lib/cities";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { formatPriceShort } from "@/lib/i18n/format";
import { areasOf } from "@/lib/places/areas";
import { knownFacts } from "@/lib/places/display";
import { paths } from "@/lib/places/paths";
import { getAllPlaces } from "@/lib/places/server";
import type { PlaceSummary } from "@/lib/places/types";
import { AMENITIES, CATEGORIES, GOOD_FOR, VIBES, tagLabel } from "@/lib/tags";

export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    const t = getDictionary(lang);
    return {
        title: { absolute: t.meta.defaultTitle },
        description: t.meta.defaultDescription,
        alternates: { canonical: paths.home(lang), languages: { fr: "/fr", en: "/en", "x-default": "/fr" } },
    };
}

// Cameroon projected onto a 0..1000 grid (same scale on both axes).
const WEST = 8.4;
const NORTH = 13.1;
const SPAN = 11.5;
const project = (lat: number, lng: number) => [Math.round(((lng - WEST) / SPAN) * 1000), Math.round(((NORTH - lat) / SPAN) * 1000)];

function constellation(places: PlaceSummary[]) {
    const seen = new Set<string>();
    const points: number[] = [];
    for (const place of places) {
        const [x, y] = project(place.lat, place.lng);
        const key = `${x >> 1},${y >> 1}`; // ~0.02° cells: one dot each
        if (seen.has(key)) continue;
        seen.add(key);
        points.push(x, y);
    }
    return points;
}

function demoChips(phrase: string, locale: Locale, areas: { name: string }[]) {
    const t = getDictionary(locale);
    const parsed = parseDiscoveryText(phrase, new Date("2026-09-26T15:00:00+01:00"), areas);
    return [
        ...(parsed.categories ?? []).map((value) => tagLabel(CATEGORIES, value, locale)),
        ...(parsed.neighborhood ? [parsed.neighborhood] : []),
        ...(parsed.budgetMax ? [`≤ ${formatPriceShort(parsed.budgetMax, locale)} FCFA`] : []),
        ...(parsed.when ? [parsed.when.label === "now" ? t.filters.openNow : t.days[parsed.when.day]] : []),
        ...(parsed.groupSize ? [`${parsed.groupSize} pers.`] : []),
        ...(parsed.vibes ?? []).map((value) => tagLabel(VIBES, value, locale)),
        ...(parsed.goodFor ?? []).map((value) => tagLabel(GOOD_FOR, value, locale)),
        ...(parsed.amenities ?? []).map((value) => tagLabel(AMENITIES, value, locale)),
    ];
}

export default async function HomePage({ params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    const t = getDictionary(lang);
    const places = await getAllPlaces();

    const cityCounts: Record<string, number> = {};
    let areaCount = 0;
    for (const city of CITIES) {
        const inCity = places.filter((place) => place.city === city.slug);
        cityCounts[city.slug] = inCity.length;
        areaCount += areasOf(inCity, 2).length;
    }

    const labels = CITIES.filter((city) => (cityCounts[city.slug] ?? 0) >= 60).map((city) => {
        const [x, y] = project(city.lat, city.lng);
        return { name: city.name, x, y, count: cityCounts[city.slug] };
    });

    // Standout places across the country: the richest listings, a few per city.
    const perCity = new Map<string, number>();
    const picks = [...places]
        .sort((a, b) => Number(b.verified) - Number(a.verified) || knownFacts(b) - knownFacts(a))
        .filter((place) => {
            const count = perCity.get(place.city) ?? 0;
            if (count >= 3) return false;
            perCity.set(place.city, count + 1);
            return true;
        })
        .slice(0, 12);

    const yaoundeAreas = areasOf(places.filter((place) => place.city === "yaounde"));
    const demos = t.landing.demoPhrases.map((phrase) => ({ phrase, chips: demoChips(phrase, lang, yaoundeAreas) }));

    return (
        <Landing
            locale={lang}
            points={constellation(places)}
            labels={labels}
            cityCounts={cityCounts}
            areaCount={areaCount}
            picks={picks}
            demos={demos}
        />
    );
}
