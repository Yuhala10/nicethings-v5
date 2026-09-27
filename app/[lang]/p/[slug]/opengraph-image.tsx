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
    const place = await getPlace(slug).catch(() => null);
    if (!place) return ogCard({ eyebrow: "Yaoundé", title: getDictionary(lang).meta.tagline, footer: "nicethings.site" });

    return ogCard({
        eyebrow: tagLabel(CATEGORIES, place.category, lang),
        title: place.name,
        footer: [place.neighborhood, "Yaoundé"].filter(Boolean).join(" · "),
        tone: categoryStyle(place.category).tone,
    });
}
