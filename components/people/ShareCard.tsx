"use client";

import { Copy, Download, ImageUp, Link2, MessageCircle } from "lucide-react";
import { useState } from "react";
import { SITE_URL, fill } from "@/lib/i18n";
import { cardUrl } from "@/lib/people/card-version";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";
import Sheet from "./Sheet";

// Sharing a profile: the member card shown as it will look, then the ways
// to send it. "Partager ma carte" sends the picture itself (WhatsApp status,
// Instagram story); the link carries the smaller card as its preview.

export default function ShareCard({ open, onClose, handle, name, version, mine }: { open: boolean; onClose: () => void; handle: string; name: string; version: string; mine: boolean }) {
    const { locale, t } = useLocale();
    const words = t.people.card;
    const toast = useToast();
    const [loaded, setLoaded] = useState(false);
    const [busy, setBusy] = useState(false);
    const url = `${SITE_URL.replace(/^https:\/\/www\./, "https://")}/@${handle}`;
    const story = cardUrl(handle, locale, version, true);
    const message = fill(mine ? words.message : words.theirMessage, { url, name });

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            toast(t.common.copied);
        } catch {}
    };

    // The picture as a file, so WhatsApp and Instagram take it as a photo.
    const sendCard = async () => {
        setBusy(true);
        try {
            const blob = await (await fetch(story)).blob();
            const file = new File([blob], `nicethings-${handle}.jpg`, { type: "image/jpeg" });
            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], text: message });
            } else {
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = file.name;
                link.click();
                setTimeout(() => URL.revokeObjectURL(link.href), 4000);
            }
        } catch {
            // Closed without sharing.
        } finally {
            setBusy(false);
        }
    };

    const shareLink = async () => {
        try {
            if (navigator.share) return await navigator.share({ title: name, text: message, url });
        } catch {
            return;
        }
        copy();
    };

    const row = "flex min-h-14 w-full items-center gap-3.5 rounded-[1.1rem] px-4 text-left text-[1rem] font-semibold transition active:scale-[0.98]";

    return (
        <Sheet open={open} onClose={onClose} closeLabel={t.people.common.close} title={mine ? words.title : name}>
            {mine && <p className="text-[0.875rem] leading-relaxed text-text-2">{words.lead}</p>}
            <div className="relative mx-auto mt-4 aspect-[9/16] w-[min(62vw,15rem)] overflow-hidden rounded-[1.25rem] bg-[#15110e] shadow-float">
                {!loaded && (
                    <span className="absolute inset-0 grid place-items-center px-4 text-center text-[0.75rem] font-semibold text-white/60">
                        <span className="nt-skeleton absolute inset-0 opacity-20" />
                        {words.preparing}
                    </span>
                )}
                { }
                <img src={story} alt="" onLoad={() => setLoaded(true)} className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`} />
            </div>

            <div className="mt-5 flex flex-col gap-2">
                <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className={`${row} bg-[#25d366] text-[#0b2e17]`}>
                    <MessageCircle size={20} />
                    {words.whatsapp}
                </a>
                <button type="button" onClick={sendCard} disabled={busy} className={`${row} nt-sunset text-white disabled:opacity-70`}>
                    {typeof navigator !== "undefined" && "canShare" in navigator ? <ImageUp size={20} /> : <Download size={20} />}
                    {busy ? words.preparing : mine ? words.story : words.download}
                </button>
                <button type="button" onClick={shareLink} className={`${row} bg-surface-2`}>
                    <Link2 size={20} />
                    {words.link}
                </button>
                <button type="button" onClick={copy} className={`${row} bg-surface-2`}>
                    <Copy size={20} />
                    {words.copy}
                    <span className="ml-auto truncate text-[0.75rem] font-medium text-muted">{url.replace(/^https:\/\//, "")}</span>
                </button>
            </div>
        </Sheet>
    );
}
