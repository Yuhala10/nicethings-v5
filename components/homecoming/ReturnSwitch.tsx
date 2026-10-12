"use client";

import { useEffect, useState } from "react";
import { Check, Plane } from "lucide-react";
import { cameFromArrivals, returnModeOn, setReturnMode, watchReturnMode } from "@/lib/return-mode";
import { useLocale } from "../site/LocaleProvider";

// On "De retour au pays": keep this page one tap away on the home screen for
// the length of the stay (lib/return-mode.ts). Someone who scanned the
// arrivals poster has it switched on for them; one tap takes it away again.
export default function ReturnSwitch() {
    const { t } = useLocale();
    const [on, setOn] = useState(false);

    useEffect(() => {
        if (cameFromArrivals() && !returnModeOn()) setReturnMode(true);
        const read = () => setOn(returnModeOn());
        read();
        return watchReturnMode(read);
    }, []);

    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => setReturnMode(!on)}
            className={`nt-btn h-auto min-h-12 justify-start gap-3 px-4 py-2.5 text-left ${on ? "bg-white text-[#15110e]" : "border border-white/25 text-white hover:bg-white/10"}`}
        >
            {on ? <Check size={18} strokeWidth={2.6} className="shrink-0" /> : <Plane size={18} className="shrink-0" />}
            <span className="min-w-0">
                <span className="block text-[1rem] leading-tight font-semibold">{on ? t.homecoming.modeOn : t.homecoming.modeOffer}</span>
                <span className={`block text-[0.75rem] leading-snug font-medium ${on ? "text-[#15110e]/65" : "text-white/65"}`}>{on ? t.homecoming.modeOnHint : t.homecoming.modeOfferHint}</span>
            </span>
        </button>
    );
}
