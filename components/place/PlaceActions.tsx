"use client";

import Link from "next/link";
import { Heart, MessageCircle, Navigation, Phone, Share2 } from "lucide-react";
import { fill } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import { sharePlace } from "../explore/SelectedCard";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";
import { useSaved } from "@/lib/hooks/useSaved";

// The decisions people make on a place page, one tap each: go, call,
// message, share, keep. Buttons only exist when they can actually work.
export default function PlaceActions({
    slug,
    name,
    phone,
    whatsapp,
}: {
    slug: string;
    name: string;
    phone: string | null; // dialable, e.g. +237679823692
    whatsapp: string | null;
}) {
    const { locale, t } = useLocale();
    const toast = useToast();
    const { isSaved, toggle } = useSaved();
    const saved = isSaved(slug);

    const secondary = "nt-btn nt-btn-soft h-12 flex-1 flex-col gap-0.5 px-2 text-[0.72rem] md:flex-row md:gap-2 md:text-sm";

    return (
        <div className="flex flex-col gap-2.5">
            <Link href={paths.directions(locale, slug)} className="nt-btn nt-btn-primary h-13 w-full text-base">
                <Navigation size={19} />
                {t.spot.directions}
            </Link>
            <div className="flex gap-2">
                {phone && (
                    <a href={`tel:${phone}`} className={secondary}>
                        <Phone size={18} />
                        {t.spot.call}
                    </a>
                )}
                {whatsapp && (
                    <a
                        href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(fill(t.spot.shareText, { name }))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={secondary}
                    >
                        <MessageCircle size={18} />
                        {t.spot.whatsapp}
                    </a>
                )}
                <button
                    type="button"
                    className={secondary}
                    onClick={async () => {
                        const url = `${window.location.origin}${paths.place(locale, slug)}`;
                        const result = await sharePlace(name, url, fill(t.spot.shareText, { name }));
                        if (result === "copied") toast(t.common.copied);
                    }}
                >
                    <Share2 size={18} />
                    {t.spot.share}
                </button>
                <button
                    type="button"
                    className={secondary}
                    aria-pressed={saved}
                    onClick={() => toast(toggle(slug) ? t.spot.savedToast : t.spot.removedToast)}
                >
                    <Heart size={18} className={saved ? "nt-pop fill-brand-500 text-brand-500" : ""} />
                    {saved ? t.spot.saved : t.spot.save}
                </button>
            </div>
        </div>
    );
}
