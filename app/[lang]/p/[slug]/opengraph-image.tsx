import { DEFAULT_CITY, cityBySlug } from "@/lib/cities";
import { getDictionary, isLocale } from "@/lib/i18n";
import { categoryStyle } from "@/lib/places/display";
import { getPlace } from "@/lib/places/server";
import { OG_SIZE, ogCard } from "@/lib/og";
import { CATEGORIES, tagLabel } from "@/lib/tags";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "NiceThings";

export default async function Image({ params }: { params: Promise<{ lang: string; slug: string }> }) {
    const { lang: raw, slug } = await params;
    const lang = isLocale(raw) ? raw : "fr";
    const t = getDictionary(lang);
    const place = await getPlace(slug).catch(() => null);
    if (!place) return ogCard({ eyebrow: "Cameroun", title: t.meta.tagline, footer: "nicethings.site" });

    const city = (cityBySlug(place.city) ?? DEFAULT_CITY).name;
    return ogCard({
        eyebrow: tagLabel(CATEGORIES, place.category, lang),
        tag: place.verified ? t.trust.verifiedTitle : undefined,
        title: place.name,
        footer: [place.neighborhood, city].filter(Boolean).join(" · "),
        tone: categoryStyle(place.category).tone,
    });
}
