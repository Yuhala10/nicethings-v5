"use client";

import { Check, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { call, useMe, withMe } from "@/lib/people/client";
import { useLocale } from "../site/LocaleProvider";

// "Suivre": their outings then show under "Mes amis". Nothing for oneself.
export default function FollowButton({ handle, light = false, small = false, onChange }: { handle: string; light?: boolean; small?: boolean; onChange?: (followers: number) => void }) {
    const { t } = useLocale();
    const words = t.people.follow;
    const { me } = useMe();
    const [following, setFollowing] = useState<boolean | null>(null);

    useEffect(() => {
        if (!me || me.handle === handle) return;
        let gone = false;
        call<{ following: boolean }>(`/api/follows?handle=${encodeURIComponent(handle)}`, "GET").then((answer) => {
            if (!gone && answer.ok === true) setFollowing(answer.following);
        });
        return () => {
            gone = true;
        };
    }, [me, handle]);

    if (me?.handle === handle) return null;
    const on = following === true;
    const toggle = () =>
        withMe("generic", async () => {
            const next = !on;
            setFollowing(next);
            const answer = await call<{ following: boolean; followers: number }>("/api/follows", "POST", { handle, on: next });
            if (answer.ok === false) return setFollowing(!next);
            onChange?.(answer.followers);
        });

    const tone = on ? (light ? "bg-white/10 text-white" : "bg-surface-2 text-text") : light ? "bg-white text-[#15110e]" : "bg-brand-600 text-white";
    return (
        <button type="button" onClick={toggle} aria-pressed={on} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold transition active:scale-95 ${small ? "h-8 px-3 text-[0.75rem]" : "h-11 px-5 text-[0.875rem]"} ${tone}`}>
            {on ? <Check size={small ? 13 : 15} /> : <UserPlus size={small ? 13 : 15} />}
            {on ? words.following : words.follow}
        </button>
    );
}
