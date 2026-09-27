"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { paths } from "@/lib/places/paths";
import { useLocale } from "./LocaleProvider";

// Goes back when the visitor came from inside NiceThings; from a shared
// link (WhatsApp, Google) it opens the explorer instead of leaving the app.
export default function BackButton({ className = "" }: { className?: string }) {
    const router = useRouter();
    const { locale, t } = useLocale();

    return (
        <button
            type="button"
            onClick={() => {
                const internal = document.referrer.startsWith(window.location.origin);
                if (internal && window.history.length > 1) router.back();
                else router.push(paths.explore(locale));
            }}
            className={`grid h-10 w-10 place-items-center rounded-full bg-glass shadow-card backdrop-blur-xl transition active:scale-90 ${className}`}
            aria-label={t.common.back}
        >
            <ArrowLeft size={19} />
        </button>
    );
}
