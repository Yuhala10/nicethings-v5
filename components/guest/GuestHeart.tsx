"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { fill } from "@/lib/i18n";
import { visitorId } from "../site/Analytics";
import { useLocale } from "../site/LocaleProvider";

// "I love these places": one heart per browser for a guest, the way people
// thank someone for a good address. The count is the real one, read fresh
// when the page opens; a heart can be taken back.

const KEPT = "nt_guest_hearts"; // the guests this browser has given a heart to

function kept(): string[] {
    try {
        const list = JSON.parse(localStorage.getItem(KEPT) ?? "[]");
        return Array.isArray(list) ? list.filter((item): item is string => typeof item === "string") : [];
    } catch {
        return [];
    }
}

export default function GuestHeart({ slug, initial, tone = "dark" }: { slug: string; initial: number; tone?: "dark" | "light" }) {
    const { t } = useLocale();
    const [count, setCount] = useState(initial);
    const [on, setOn] = useState(false);
    const [pop, setPop] = useState(0);

    useEffect(() => {
        setOn(kept().includes(slug));
        fetch(`/api/guests/heart?slug=${encodeURIComponent(slug)}`)
            .then((response) => (response.ok ? response.json() : null))
            .then((data: { hearts?: number } | null) => typeof data?.hearts === "number" && setCount(data.hearts))
            .catch(() => {});
    }, [slug]);

    const toggle = async () => {
        const next = !on;
        setOn(next);
        setCount((value) => Math.max(0, value + (next ? 1 : -1)));
        if (next) setPop((value) => value + 1);
        try {
            const list = kept().filter((item) => item !== slug);
            localStorage.setItem(KEPT, JSON.stringify(next ? [...list, slug] : list));
        } catch {
            // Not kept: the heart still counts on the server.
        }
        try {
            const response = await fetch("/api/guests/heart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, v: visitorId(), on: next }) });
            const data = (await response.json().catch(() => null)) as { ok?: boolean; hearts?: number } | null;
            if (data?.ok && typeof data.hearts === "number") setCount(data.hearts);
        } catch {
            // The count on screen stays as tapped; the next visit reads the real one.
        }
    };

    const dark = tone === "dark";
    const label = count > 0 ? fill(count === 1 ? t.guestPage.heartsOne : t.guestPage.heartsMany, { count }) : t.guestPage.heartFirst;
    return (
        <button
            type="button"
            onClick={() => void toggle()}
            aria-pressed={on}
            className={`nt-tap group inline-flex min-h-12 items-center gap-3 rounded-full py-2 pr-5 pl-2 text-left transition active:scale-[0.97] ${
                on ? "bg-[#d9bc8c] text-[#15110e]" : dark ? "bg-white/10 text-white hover:bg-white/15" : "bg-surface-2 text-text hover:bg-surface-3"
            }`}
        >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${on ? "bg-[#15110e]/10" : dark ? "bg-white/10" : "bg-surface"}`}>
                <Heart key={pop} size={18} className={on ? "nt-pop fill-[#c0471b] text-[#c0471b]" : ""} />
            </span>
            <span className="leading-tight">
                <span className="block text-[0.875rem] font-bold">{on ? t.guestPage.heartOn : t.guestPage.heartOff}</span>
                <span className={`block text-[0.75rem] ${on ? "text-[#15110e]/70" : dark ? "text-white/60" : "text-muted"}`}>{label}</span>
            </span>
        </button>
    );
}
