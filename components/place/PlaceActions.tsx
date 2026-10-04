"use client";

import Link from "next/link";
import { Heart, MessageCircle, Navigation, Phone, Share2, type LucideIcon } from "lucide-react";
import { fill } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import { useSaved } from "@/lib/hooks/useSaved";
import { sharePlace } from "@/lib/share";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";

// The decisions people make on a place page, one tap each, as an even row:
// go (highlighted), call, message, share, keep. Buttons only exist when
// they can actually work.

function Action({ icon: Icon, label, primary = false, active = false }: { icon: LucideIcon; label: string; primary?: boolean; active?: boolean }) {
    return (
        <>
            <span
                className={`grid h-[3.4rem] w-full place-items-center rounded-[1rem] transition duration-200 group-active:scale-[0.96] ${
                    primary ? "bg-brand-600 text-white shadow-[var(--nt-glow)] group-hover:bg-brand-700" : "border border-line-strong bg-surface text-text group-hover:border-text-2"
                }`}
            >
                <Icon size={21} strokeWidth={primary ? 2.1 : 1.8} className={active ? "nt-pop fill-brand-500 text-brand-500" : ""} />
            </span>
            <span className={`mt-1.5 block truncate text-center text-[0.74rem] font-semibold ${primary ? "text-text" : "text-text-2"}`}>{label}</span>
        </>
    );
}

export default function PlaceActions({
    slug,
    name,
    phone,
    whatsapp,
    preview,
}: {
    slug: string;
    name: string;
    phone: string | null; // dialable, e.g. +237679823692
    whatsapp: string | null;
    preview: string; // link-preview image, warmed up when sharing
}) {
    const { locale, t } = useLocale();
    const toast = useToast();
    const { isSaved, toggle } = useSaved();
    const saved = isSaved(slug);
    const item = "group min-w-0 flex-1";

    return (
        <nav aria-label={t.spot.details} className="flex gap-2.5">
            <Link href={paths.directions(locale, slug)} className={item}>
                <Action icon={Navigation} label={t.spot.directions} primary />
            </Link>
            {phone && (
                <a href={`tel:${phone}`} className={item}>
                    <Action icon={Phone} label={t.spot.call} />
                </a>
            )}
            {whatsapp && (
                <a
                    href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(fill(t.spot.shareText, { name }))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={item}
                >
                    <Action icon={MessageCircle} label={t.spot.whatsapp} />
                </a>
            )}
            <button
                type="button"
                className={item}
                onClick={async () => {
                    const url = `${window.location.origin}${paths.place(locale, slug)}`;
                    const result = await sharePlace(name, url, fill(t.spot.shareText, { name }), preview);
                    if (result === "copied") toast(t.common.copied);
                }}
            >
                <Action icon={Share2} label={t.spot.share} />
            </button>
            <button type="button" className={item} aria-pressed={saved} onClick={() => toast(toggle(slug) ? t.spot.savedToast : t.spot.removedToast)}>
                <Action icon={Heart} label={saved ? t.spot.saved : t.spot.save} active={saved} />
            </button>
        </nav>
    );
}
