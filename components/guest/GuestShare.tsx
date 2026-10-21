"use client";

import { Send } from "lucide-react";
import { sharePlace, useShareCard } from "@/lib/share";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";

// Shares a guest's page: their card shows in the conversation, with no
// sentence and no long address under it.
export default function GuestShare({ title, url, preview, label, tone = "dark" }: { title: string; url: string; preview: string; label: string; tone?: "dark" | "light" }) {
    const { t } = useLocale();
    const toast = useToast();
    const card = useShareCard(preview);
    const share = async () => {
        const done = await sharePlace(title, url, "", preview);
        if (done === "copied") toast(t.guestKit.copied);
    };
    return (
        <button
            type="button"
            {...card}
            onClick={() => void share()}
            className={`nt-tap inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-[0.875rem] font-bold transition active:scale-[0.97] ${
                tone === "dark" ? "border border-white/20 text-white hover:bg-white/10" : "border border-line-strong text-text hover:bg-surface-2"
            }`}
        >
            <Send size={16} />
            {label}
        </button>
    );
}
