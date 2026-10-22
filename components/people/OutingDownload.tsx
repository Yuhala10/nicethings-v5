"use client";

import { Clapperboard, Download, ImageDown, Send } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { fill } from "@/lib/i18n";
import { canMakeVideo, photoKeepsake, saveKeepsake, sendKeepsake, videoKeepsake, type Keepsake, type Story } from "@/lib/people/keepsake";
import type { OutingView } from "@/lib/people/types";
import { audioContext, isSound } from "@/lib/soundtracks";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";
import Sheet from "./Sheet";

// "Télécharger": the outing as a framed photo, or as a video marked
// NiceThings (its own video, or its photos rolling with their music), made
// on the phone, then saved to it or sent on.

type Step = { step: "choose" } | { step: "making"; percent: number; kind: "photo" | "video" } | { step: "ready"; item: Keepsake } | { step: "failed" };

export default function OutingDownload({ outing, shown, story, link }: { outing: OutingView; shown: number; story: Story; link: string }) {
    const { t } = useLocale();
    const words = t.people.post;
    const toast = useToast();
    const [open, setOpen] = useState(false);
    const [state, setState] = useState<Step>({ step: "choose" });
    const control = useRef<AbortController | null>(null);
    const audio = useRef<AudioContext | null>(null);
    const percent = useRef(-1);
    const isVideo = outing.media[0]?.kind === "video";
    const song = outing.song;
    const sound = !song && isSound(outing.sound) ? outing.sound : null;
    // The photo shown, or a video's first image.
    const current = outing.media[Math.min(shown, outing.media.length - 1)];
    const still = current?.kind === "video" ? (current.poster ?? "") : (current?.url ?? "");

    const make = async (kind: "photo" | "video") => {
        control.current?.abort();
        const controller = new AbortController();
        control.current = controller;
        percent.current = 0;
        setState({ step: "making", percent: 0, kind });
        try {
            const item =
                kind === "photo"
                    ? await photoKeepsake(still, story)
                    : await videoKeepsake(
                          isVideo ? { video: outing.media[0].url } : { photos: outing.media.map((item) => item.url), sound, song: song ? { url: song.url, start: song.start } : null },
                          story,
                          audio.current,
                          (share) => {
                              const now = Math.round(share * 100);
                              if (now === percent.current || controller.signal.aborted) return;
                              percent.current = now;
                              setState({ step: "making", percent: now, kind });
                          },
                          controller.signal,
                      );
            if (controller.signal.aborted) return URL.revokeObjectURL(item.url);
            setState({ step: "ready", item });
        } catch {
            if (!controller.signal.aborted) setState({ step: "failed" });
        }
    };

    // The sound of a video is made in answer to the tap itself (iPhones ask that).
    const wakeAudio = () => {
        if (!audio.current) audio.current = audioContext();
        audio.current?.resume().catch(() => {});
    };

    const start = () => {
        wakeAudio();
        setOpen(true);
        if (isVideo && canMakeVideo()) void make("video");
    };

    const pick = (kind: "photo" | "video") => {
        if (kind === "video") wakeAudio();
        void make(kind);
    };

    const close = useCallback(() => {
        control.current?.abort();
        setState((now) => {
            if (now.step === "ready") URL.revokeObjectURL(now.item.url);
            return { step: "choose" };
        });
        audio.current?.close().catch(() => {});
        audio.current = null;
        setOpen(false);
    }, []);

    const after = (kept: string) => {
        if (kept === "saved") toast(words.downloaded);
        else if (kept === "failed") toast(t.people.common.failed);
    };

    return (
        <>
            <button type="button" onClick={start} className="nt-tap inline-flex h-10 items-center rounded-full px-2.5" aria-label={words.download}>
                <Download size={19} />
            </button>
            <Sheet open={open} onClose={close} closeLabel={t.people.common.close} title={words.downloadTitle}>
                {state.step === "choose" && (
                    <div className="grid gap-3 pt-1">
                        {isVideo && canMakeVideo() && <Choice Icon={Clapperboard} title={words.video} lead={words.videoLead} onPick={() => pick("video")} />}
                        {still && <Choice Icon={ImageDown} title={words.photo} lead={words.photoLead} onPick={() => pick("photo")} />}
                        {!isVideo && canMakeVideo() && (outing.media.length > 1 || sound || song) && <Choice Icon={Clapperboard} title={sound || song ? words.slideshow : words.video} lead={words.slideshowLead} onPick={() => pick("video")} />}
                    </div>
                )}

                {state.step === "making" && (
                    <div className="grid place-items-center py-8 text-center">
                        <span className="relative grid h-24 w-24 place-items-center">
                            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
                                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-surface-2)" strokeWidth="6" />
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#f97316" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(state.percent / 100) * 282.7} 282.7`} className="transition-[stroke-dasharray] duration-300" />
                            </svg>
                            <img src="/brand/mark.svg" alt="" width={44} height={44} className="animate-pulse" />
                        </span>
                        <p className="mt-4 text-[1rem] font-bold tabular-nums" aria-live="polite">
                            {fill(words.preparing, { percent: state.percent })}
                        </p>
                        {state.kind === "video" && <p className="mt-1.5 max-w-[18rem] text-[0.8125rem] leading-snug text-muted">{words.keepOpen}</p>}
                    </div>
                )}

                {state.step === "ready" && (
                    <div className="pt-1">
                        <div className="overflow-hidden rounded-[1.25rem] bg-black">
                            {state.item.kind === "video" ? (
                                <video src={state.item.url} controls autoPlay playsInline loop className="mx-auto max-h-[52dvh] w-auto" />
                            ) : (
                                <img src={state.item.url} alt="" className="mx-auto max-h-[52dvh] w-auto" />
                            )}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2.5">
                            <button type="button" onClick={async () => after(await saveKeepsake(state.item))} className="nt-btn nt-btn-primary">
                                <Download size={17} />
                                {words.save}
                            </button>
                            <button type="button" onClick={async () => after(await sendKeepsake(state.item, `${words.endLine} · ${link}`))} className="nt-btn border border-line bg-surface">
                                <Send size={17} />
                                {words.send}
                            </button>
                        </div>
                    </div>
                )}

                {state.step === "failed" && (
                    <div className="py-6 text-center">
                        <p className="text-[0.9375rem] font-semibold">{words.downloadFailed}</p>
                        <button type="button" onClick={() => setState({ step: "choose" })} className="nt-btn mt-4 border border-line bg-surface">
                            {t.people.common.back}
                        </button>
                    </div>
                )}
            </Sheet>
        </>
    );
}

function Choice({ Icon, title, lead, onPick }: { Icon: typeof ImageDown; title: string; lead: string; onPick: () => void }) {
    return (
        <button type="button" onClick={onPick} className="flex w-full items-center gap-3.5 rounded-[1.25rem] border border-line bg-surface p-4 text-left transition active:scale-[0.99] hover:bg-surface-2">
            <span className="nt-sunset grid h-12 w-12 shrink-0 place-items-center rounded-[1rem] text-white">
                <Icon size={22} />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-[1rem] font-bold">{title}</span>
                <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">{lead}</span>
            </span>
        </button>
    );
}
