"use client";

import { Music2, VolumeX } from "lucide-react";
import { useEffect, useRef } from "react";
import { SOUNDS, playTrack, type Playing, type Sound } from "@/lib/soundtracks";
import { useLocale } from "../site/LocaleProvider";

// The music of an outing: none, or one of NiceThings' own loops. A tap
// chooses it and plays a few seconds of it.

const PREVIEW_MS = 8000;

export default function SoundPicker({ value, onChange, video = false }: { value: string | null; onChange: (sound: Sound | null) => void; video?: boolean }) {
    const { t } = useLocale();
    const words = t.people.post;
    const playing = useRef<Playing | null>(null);
    const timer = useRef(0);

    const stop = () => {
        window.clearTimeout(timer.current);
        playing.current?.stop();
        playing.current = null;
    };
    useEffect(() => stop, []);

    if (video) return <p className="text-[0.8rem] text-muted">{words.videoSound}</p>;
    return (
        <div>
            <p className="mb-2 text-[0.75rem] text-muted">{words.musicHint}</p>
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    aria-pressed={value === null}
                    onClick={() => {
                        stop();
                        onChange(null);
                    }}
                    className="nt-chip h-9 gap-1.5 text-[0.875rem]"
                >
                    <VolumeX size={14} />
                    {words.noMusic}
                </button>
                {SOUNDS.map((sound) => (
                    <button
                        key={sound}
                        type="button"
                        aria-pressed={value === sound}
                        onClick={() => {
                            stop();
                            onChange(sound);
                            playing.current = playTrack(sound, 0.45);
                            timer.current = window.setTimeout(stop, PREVIEW_MS);
                        }}
                        className="nt-chip h-9 gap-1.5 text-[0.875rem]"
                    >
                        <Music2 size={14} />
                        {words.sounds[sound]}
                    </button>
                ))}
            </div>
        </div>
    );
}
