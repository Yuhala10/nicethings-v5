"use client";

import { Mic, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PeopleWords } from "@/lib/i18n/people";
import { clock } from "./format";

// A voice note, as on WhatsApp: the shape of the voice in bars that fill as
// it plays, a tap on the bars to jump, the speed (1×, 1.5×, 2×), and the
// microphone that turns blue once the other person has listened. When it
// ends, the voice note right after it plays by itself.

type Words = PeopleWords["chat"];
const SPEEDS = [1, 1.5, 2];
const SPEED_KEY = "nt_voice_speed";
const BARS = 40;

// The voice's shape on BARS bars; a quiet even line when it is unknown.
function shape(waveform: number[] | null | undefined) {
    if (!waveform?.length) return Array.from({ length: BARS }, (_, index) => 5 + ((index * 7) % 5));
    return Array.from({ length: BARS }, (_, index) => waveform[Math.floor((index / BARS) * waveform.length)] ?? 0);
}

export default function Voice({
    id,
    url,
    duration,
    waveform,
    mine,
    listened,
    words,
    onListened,
}: {
    id: string;
    url: string;
    duration: number | null;
    waveform?: number[] | null;
    mine: boolean;
    listened: boolean;
    words: Words;
    onListened: () => void;
}) {
    const audio = useRef<HTMLAudioElement>(null);
    const root = useRef<HTMLDivElement>(null);
    const [playing, setPlaying] = useState(false);
    const [at, setAt] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [broken, setBroken] = useState(false);
    const told = useRef(false);
    const length = duration ?? 0;
    const bars = shape(waveform);

    useEffect(() => {
        try {
            const saved = Number(localStorage.getItem(SPEED_KEY));
            if (SPEEDS.includes(saved)) requestAnimationFrame(() => setSpeed(saved));
        } catch {}
    }, []);

    useEffect(() => {
        const element = audio.current;
        const box = root.current;
        if (!element || !box) return;
        const tick = () => setAt(element.currentTime);
        const end = () => {
            setPlaying(false);
            setAt(0);
            // The next voice note, if it comes right after this one.
            const all = [...document.querySelectorAll<HTMLElement>("[data-voice]")];
            const next = all[all.indexOf(box) + 1];
            if (next && next.closest("[data-message]")?.previousElementSibling === box.closest("[data-message]")) next.dispatchEvent(new Event("nt-play"));
        };
        const playHere = () => start();
        element.addEventListener("timeupdate", tick);
        element.addEventListener("ended", end);
        box.addEventListener("nt-play", playHere);
        return () => {
            element.removeEventListener("timeupdate", tick);
            element.removeEventListener("ended", end);
            box.removeEventListener("nt-play", playHere);
        };
    });

    const start = () => {
        const element = audio.current;
        if (!element) return;
        // One voice at a time.
        document.querySelectorAll("audio").forEach((other) => other !== element && other.pause());
        element.playbackRate = speed;
        element
            .play()
            .then(() => {
                setPlaying(true);
                if (!mine && !told.current) {
                    told.current = true;
                    onListened();
                }
            })
            .catch(() => setBroken(true));
    };

    const toggle = () => {
        const element = audio.current;
        if (!element) return;
        if (playing) {
            element.pause();
            setPlaying(false);
        } else start();
    };

    const faster = () => {
        const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
        setSpeed(next);
        if (audio.current) audio.current.playbackRate = next;
        try {
            localStorage.setItem(SPEED_KEY, String(next));
        } catch {}
    };

    if (broken) return <p className="w-60 text-[0.875rem] italic opacity-70">{words.voice.cantPlay}</p>;
    const done = length ? Math.min(1, at / length) : 0;
    return (
        <div ref={root} data-voice={id} className="flex w-64 max-w-full items-center gap-2.5 py-1">
            <button
                type="button"
                aria-label={playing ? words.voice.pause : words.voice.play}
                onClick={toggle}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${mine ? "bg-[#1faa59] text-white" : "bg-[#15110e] text-white dark:bg-white dark:text-[#15110e]"}`}
            >
                {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="translate-x-px" />}
            </button>
            <span className="min-w-0 flex-1">
                {/* The bars: a tap jumps there. */}
                <span
                    className="flex h-8 cursor-pointer items-center gap-[2px]"
                    onClick={(event) => {
                        const element = audio.current;
                        if (!element || !length) return;
                        const box = event.currentTarget.getBoundingClientRect();
                        element.currentTime = Math.max(0, Math.min(length - 0.05, ((event.clientX - box.left) / box.width) * length));
                        setAt(element.currentTime);
                        if (!playing) start();
                    }}
                >
                    {bars.map((bar, index) => (
                        <span key={index} className={`w-[3px] shrink-0 rounded-full ${index / BARS < done ? (mine ? "bg-[#1faa59]" : "bg-[#34b7f1]") : "bg-current opacity-30"}`} style={{ height: `${Math.max(3, Math.round((bar / 31) * 28))}px` }} />
                    ))}
                </span>
                <span className="mt-0.5 flex items-center gap-2 text-[0.72rem] opacity-70">
                    <Mic size={12} className={mine ? (listened ? "text-[#34b7f1]" : "") : listened ? "" : "text-[#1faa59]"} />
                    {clock(playing || at ? at : length)}
                </span>
            </span>
            <button type="button" onClick={faster} className="h-7 shrink-0 rounded-full bg-black/10 px-2 text-[0.75rem] font-bold dark:bg-white/15">
                {speed}×
            </button>
            <audio ref={audio} src={url} preload="metadata" onError={() => setBroken(true)} />
        </div>
    );
}
