"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Eye, TriangleAlert, Users } from "lucide-react";
import { fill } from "@/lib/i18n";
import { formatDistance, tidy } from "@/lib/i18n/format";
import { useLocale } from "../site/LocaleProvider";

// The last steps of a trip. The phone says the visitor is beside the place;
// before any "you have arrived", it asks the one person who can know: do you
// see it? A yes ends the trip. A "not yet" keeps the map following them and
// says what a friend would: we are in the right area, ask the people around.
// Only their own "found it" closes the search.
export type NearAnswer = "seen" | "found" | "missing";

type Props = {
    name: string;
    approximate: boolean; // the pin is only roughly placed
    outdoors: boolean; // a lake, a waterfall, a hill: a word of care
    access: string | null; // the place's own "how to get there" note
    distance: number | null; // metres from the visitor to the pin, live
    onLooking: () => void;
    onAnswer: (answer: NearAnswer) => void;
};

export default function NearSheet({ name, approximate, outdoors, access, distance, onLooking, onAnswer }: Props) {
    const { locale, t } = useLocale();
    const [looking, setLooking] = useState(false);

    return (
        <motion.div
            initial={{ y: 220, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 220, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="absolute inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-30 mx-auto max-w-lg"
        >
            {/* The words scroll if they must; the answers stay in reach, and the map keeps its share of the screen. */}
            <div className="flex max-h-[62dvh] flex-col overflow-hidden rounded-[1.75rem] bg-bg shadow-float" role="dialog" aria-live="polite" aria-label={t.route.nearAsk}>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5">
                    <p className="nt-eyebrow flex items-center gap-2">
                        <span className="nt-open-dot shrink-0" aria-hidden />
                        {looking && distance !== null ? fill(t.route.fromPoint, { distance: formatDistance(distance, locale) }) : fill(t.route.nearEyebrow, { name })}
                    </p>
                    {looking ? (
                        <>
                            <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.02]">{t.route.lookingTitle}</h2>
                            <p className="mt-2.5 flex gap-2.5 text-[1rem] leading-relaxed text-text-2">
                                <Users size={19} className="mt-[0.2rem] shrink-0 text-brand-600" />
                                {t.route.lookingBody}
                            </p>
                            {access && (
                                <div className="mt-4 rounded-[1.1rem] bg-surface-2 p-4">
                                    <p className="text-[0.75rem] font-semibold tracking-[0.12em] text-muted uppercase">{t.route.lastSteps}</p>
                                    <p className="mt-1.5 text-[0.875rem] leading-relaxed">{tidy(access)}</p>
                                </div>
                            )}
                            {outdoors && (
                                <p className="mt-3 flex gap-2.5 text-[0.875rem] leading-relaxed text-text-2">
                                    <TriangleAlert size={17} className="mt-[0.15rem] shrink-0 text-brand-600" />
                                    {t.route.natureCare}
                                </p>
                            )}
                        </>
                    ) : (
                        <>
                            <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.02]">{tidy(t.route.nearAsk)}</h2>
                            <p className="mt-2.5 text-[1rem] leading-relaxed text-text-2">{tidy(approximate ? t.route.nearHintApprox : t.route.nearHint)}</p>
                        </>
                    )}
                </div>

                {looking ? (
                    <div className="shrink-0 px-5 pt-4 pb-2">
                        <button type="button" onClick={() => onAnswer("found")} className="nt-btn nt-btn-primary h-12 w-full">
                            <Check size={18} strokeWidth={2.6} />
                            {t.route.found}
                        </button>
                        <button type="button" onClick={() => onAnswer("missing")} className="nt-tap h-11 w-full text-[0.875rem] font-semibold text-muted">
                            {t.route.confirmNo}
                        </button>
                    </div>
                ) : (
                    <div className="grid shrink-0 grid-cols-2 gap-2 p-5">
                        <button type="button" onClick={() => onAnswer("seen")} className="nt-btn nt-btn-primary h-12 px-3">
                            <Eye size={18} />
                            {t.route.nearYes}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setLooking(true);
                                onLooking();
                            }}
                            className="nt-btn nt-btn-outline h-12 px-3"
                        >
                            {t.route.nearNo}
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
