"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Navigation, Share2 } from "lucide-react";
import { fill } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import { useSaved } from "@/lib/hooks/useSaved";
import { sharePlace } from "@/lib/share";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";

// Share and save, as glass buttons over the place hero.
export function HeroActions({ slug, name }: { slug: string; name: string }) {
    const { locale, t } = useLocale();
    const toast = useToast();
    const { isSaved, toggle } = useSaved();
    const saved = isSaved(slug);
    const glass = "grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/25 text-white backdrop-blur-md transition active:scale-90";

    return (
        <div className="flex gap-2">
            <button
                type="button"
                className={glass}
                aria-label={t.spot.share}
                onClick={async () => {
                    const url = `${window.location.origin}${paths.place(locale, slug)}`;
                    const result = await sharePlace(name, url, fill(t.spot.shareText, { name }));
                    if (result === "copied") toast(t.common.copied);
                }}
            >
                <Share2 size={19} />
            </button>
            <button
                type="button"
                className={glass}
                aria-pressed={saved}
                aria-label={saved ? t.spot.saved : t.spot.save}
                onClick={() => toast(toggle(slug) ? t.spot.savedToast : t.spot.removedToast)}
            >
                <Heart size={19} className={saved ? "nt-pop fill-white" : ""} />
            </button>
        </div>
    );
}

// Once the hero scrolls away, a compact bar slides in with the name and
// the one action that matters.
export function StickyPlaceBar({ slug, name }: { slug: string; name: string }) {
    const { locale, t } = useLocale();
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const onScroll = () => setShown(window.scrollY > 300);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <AnimatePresence>
            {shown && (
                <motion.div
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    className="nt-glass fixed inset-x-0 top-0 z-40 border-b border-line pt-[env(safe-area-inset-top)] md:top-16"
                >
                    <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4 md:px-6">
                        <p className="min-w-0 flex-1 truncate font-display text-[1.02rem] font-extrabold">{name}</p>
                        <Link href={paths.directions(locale, slug)} className="nt-btn nt-btn-primary h-10 px-4 text-sm">
                            <Navigation size={16} />
                            {t.spot.directions}
                        </Link>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
