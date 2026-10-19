"use client";

import { useEffect, useState } from "react";
import { fill } from "@/lib/i18n";
import { call, withMe } from "@/lib/people/client";
import { PULSES } from "@/lib/people/rules";
import type { PulseView } from "@/lib/people/types";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";
import { Face } from "./Person";

// "En ce moment": what people at the place said in the last hours (open,
// closed, lively, quiet, full, power cut), with their faces; and for a
// member who is there, one tap to tell everyone. Read fresh on each visit:
// the page around it is cached, the news must not be.

export function agoText(iso: string, words: { now: string; minutes: string; hours: string }) {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
    if (minutes < 2) return words.now;
    if (minutes < 60) return fill(words.minutes, { n: minutes });
    return fill(words.hours, { n: Math.round(minutes / 60) });
}

const TONES: Record<string, string> = {
    open: "text-open",
    closed: "text-closed",
    lively: "text-brand-600",
    calm: "text-text-2",
    full: "text-[#b7791f]",
    power_cut: "text-[#b7791f]",
};

export default function PlacePulse({ slug }: { slug: string }) {
    const { t } = useLocale();
    const words = t.people.pulse;
    const toast = useToast();
    const [pulses, setPulses] = useState<PulseView[] | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    useEffect(() => {
        let gone = false;
        call<{ pulses: PulseView[] }>(`/api/pulses?place=${encodeURIComponent(slug)}`, "GET").then((answer) => {
            if (!gone && answer.ok === true) setPulses(answer.pulses);
        });
        return () => {
            gone = true;
        };
    }, [slug]);

    // Not open yet (script 012), or not read: nothing on the page.
    if (pulses === null) return null;

    const say = (kind: string) =>
        withMe("generic", async () => {
            setBusy(kind);
            const answer = await call<{ pulses: PulseView[]; already?: boolean }>("/api/pulses", "POST", { place: slug, kind });
            setBusy(null);
            if (answer.ok === false) return toast(answer.why === "many" ? t.people.common.many : t.people.common.failed);
            setPulses(answer.pulses);
            toast(answer.already ? words.already : words.thanks);
        });

    return (
        <section aria-label={words.eyebrow} className="mt-5 rounded-[1.25rem] border border-line bg-surface p-4">
            <p className="nt-eyebrow flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-closed/60 motion-reduce:animate-none" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-closed" />
                </span>
                {words.eyebrow}
            </p>
            {pulses.length > 0 && (
                <ul className="mt-3 flex flex-col gap-2.5">
                    {pulses.map((pulse) => (
                        <li key={pulse.kind} className="flex items-center gap-2.5">
                            <span className="text-[1.125rem]" aria-hidden>
                                {words.emoji[pulse.kind as keyof typeof words.emoji]}
                            </span>
                            <span className="min-w-0 flex-1 text-[0.875rem]">
                                <span className={`font-bold ${TONES[pulse.kind] ?? ""}`}>{words.kinds[pulse.kind as keyof typeof words.kinds]}</span>
                                <span className="text-muted"> · {agoText(pulse.last, words)}</span>
                            </span>
                            <span className="flex shrink-0 items-center -space-x-2">
                                {pulse.people.map((person) => (
                                    <Face key={person.id} person={person} size={26} className="ring-2 ring-surface" />
                                ))}
                                {pulse.count > pulse.people.length && <span className="pl-3 text-[0.75rem] font-semibold text-muted">{fill(words.more, { count: pulse.count - pulse.people.length })}</span>}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            <p className="mt-3 text-[0.875rem] text-text-2">{words.ask}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
                {PULSES.map((kind) => (
                    <button key={kind} type="button" disabled={busy !== null} onClick={() => say(kind)} className="nt-chip h-9 gap-1.5 text-[0.875rem] disabled:opacity-60">
                        <span aria-hidden>{words.emoji[kind]}</span>
                        {words.kinds[kind]}
                    </button>
                ))}
            </div>
        </section>
    );
}
