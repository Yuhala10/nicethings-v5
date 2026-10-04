"use client";

import { Link2, MessageCircle, Share2 } from "lucide-react";
import { fill } from "@/lib/i18n";
import { sharePlace } from "@/lib/share";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";

// WhatsApp first (that's where outings get decided), then the phone's own
// share sheet, then copy. The preview image is warmed up on every tap.
export default function ShareBar({ title, path, preview }: { title: string; path: string; preview: string }) {
    const { t } = useLocale();
    const toast = useToast();
    const text = fill(t.blog.shareText, { title });
    const url = () => `${window.location.origin}${path}`;
    const warm = () => fetch(preview, { priority: "low" }).catch(() => {});

    return (
        <div className="flex flex-wrap gap-2">
            <button
                type="button"
                onClick={() => {
                    warm();
                    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url()}`)}`, "_blank", "noopener,noreferrer");
                }}
                className="nt-btn h-11 bg-[#25d366] px-4 text-sm text-white hover:bg-[#1fbf5b]"
            >
                <MessageCircle size={17} />
                {t.blog.shareWhatsapp}
            </button>
            <button
                type="button"
                onClick={async () => {
                    const result = await sharePlace(title, url(), text, preview);
                    if (result === "copied") toast(t.blog.copied);
                }}
                className="nt-btn nt-btn-soft h-11 px-4 text-sm"
            >
                <Share2 size={17} />
                {t.blog.share}
            </button>
            <button
                type="button"
                onClick={async () => {
                    warm();
                    try {
                        await navigator.clipboard.writeText(url());
                        toast(t.blog.copied);
                    } catch {}
                }}
                className="nt-btn nt-btn-soft h-11 w-11 px-0"
                aria-label={t.blog.copied.replace(" ✓", "")}
            >
                <Link2 size={17} />
            </button>
        </div>
    );
}
