import { getDictionary, isLocale } from "@/lib/i18n";
import { OG_SIZE, ogCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "NiceThings — Cameroun";

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const t = getDictionary(isLocale(lang) ? lang : "fr");
    return ogCard({ eyebrow: "Yaoundé · Douala · Kribi · +17", title: t.meta.tagline, footer: t.landing.statCities === "villes" ? "20 villes du Cameroun" : "20 cities in Cameroon" });
}
