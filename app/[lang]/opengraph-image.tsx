import { getDictionary, isLocale } from "@/lib/i18n";
import { OG_SIZE, ogCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "NiceThings — Yaoundé";

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const t = getDictionary(isLocale(lang) ? lang : "fr");
    return ogCard({ eyebrow: "Yaoundé", title: t.meta.tagline, footer: "nicethings.site" });
}
