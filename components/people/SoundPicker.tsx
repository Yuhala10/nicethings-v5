"use client";

import Link from "next/link";
import { Check, Music2, Pause, Play, Search, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { paths } from "@/lib/places/paths";
import type { SongView } from "@/lib/people/types";
import { useSongs } from "@/lib/song-library";
import { SOUNDS, playSong, playTrack, type Playing, type Sound } from "@/lib/soundtracks";
import { useLocale } from "../site/LocaleProvider";

// The music of an outing: none, a real song of the library (with its
// artist), or one of NiceThings' own vibes. A tap chooses it and plays a
// few seconds of it; a second tap stops.

const PREVIEW_MS = 10_000;
const FIRST = 6;

export type Music = { sound: Sound | null; song: SongView | null };

export default function SoundPicker({ sound, song, onChange, video = false }: { sound: string | null; song: SongView | null; onChange: (music: Music) => void; video?: boolean }) {
    const { locale, t } = useLocale();
    const words = t.people.post;
    const { songs } = useSongs();
    const playing = useRef<Playing | null>(null);
    const timer = useRef(0);
    const [previewing, setPreviewing] = useState<string | null>(null);
    const [all, setAll] = useState(false);
    const [needle, setNeedle] = useState("");

    const stop = () => {
        window.clearTimeout(timer.current);
        playing.current?.stop();
        playing.current = null;
        setPreviewing(null);
    };
    useEffect(
        () => () => {
            window.clearTimeout(timer.current);
            playing.current?.stop();
        },
        [],
    );

    const preview = (key: string, start: () => Playing | null) => {
        if (previewing === key) return stop();
        stop();
        playing.current = start();
        if (!playing.current) return;
        setPreviewing(key);
        timer.current = window.setTimeout(stop, PREVIEW_MS);
    };

    if (video) return <p className="text-[0.8rem] text-muted">{words.videoSound}</p>;

    const query = needle.trim().toLowerCase();
    const found = query ? songs.filter((item) => `${item.title} ${item.artist} ${words.genres[item.genre as keyof typeof words.genres] ?? ""}`.toLowerCase().includes(query)) : songs;
    // The chosen song always shows, even when the list is folded.
    const shown = all || query ? found : [...(song && !found.slice(0, FIRST).some((item) => item.id === song.id) ? [song] : []), ...found].slice(0, FIRST);

    return (
        <div>
            <p className="mb-2 text-[0.75rem] text-muted">{words.musicHint}</p>
            <button
                type="button"
                aria-pressed={!sound && !song}
                onClick={() => {
                    stop();
                    onChange({ sound: null, song: null });
                }}
                className="nt-chip h-9 gap-1.5 text-[0.875rem]"
            >
                <VolumeX size={14} />
                {words.noMusic}
            </button>

            {songs.length > 0 && (
                <div className="mt-4">
                    <p className="text-[0.875rem] font-semibold">
                        {words.songs} <span className="font-normal text-muted">· {words.songsHint}</span>
                    </p>
                    {songs.length > FIRST && (
                        <label className="relative mt-2 block">
                            <Search size={15} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
                            <input value={needle} onChange={(event) => setNeedle(event.target.value)} placeholder={words.searchSongs} className="nt-input !pl-10" enterKeyHint="search" />
                        </label>
                    )}
                    <ul className="mt-2 flex flex-col gap-1.5">
                        {shown.map((item) => {
                            const chosen = song?.id === item.id;
                            const on = previewing === item.id;
                            return (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        aria-pressed={chosen}
                                        onClick={() => {
                                            onChange({ sound: null, song: item });
                                            preview(item.id, () => playSong(item.url, item.start));
                                        }}
                                        className={`flex w-full items-center gap-3 rounded-[1rem] border p-2 text-left transition active:scale-[0.99] ${chosen ? "border-brand-500 bg-brand-500/8" : "border-line bg-surface hover:bg-surface-2"}`}
                                    >
                                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-white ${on ? "nt-disc bg-[#15110e]" : "nt-sunset"}`}>{on ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[0.875rem] font-semibold">{item.title}</span>
                                            <span className="block truncate text-[0.75rem] text-muted">
                                                {item.artist} · {words.genres[item.genre as keyof typeof words.genres] ?? item.genre}
                                            </span>
                                        </span>
                                        {chosen && (
                                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500 text-white">
                                                <Check size={14} />
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    {query && !found.length && <p className="mt-2 text-[0.8125rem] text-muted">{words.noSongFound}</p>}
                    {!all && !query && songs.length > FIRST && (
                        <button type="button" onClick={() => setAll(true)} className="nt-tap mt-2 min-h-11 text-[0.875rem] font-semibold text-brand-600">
                            {words.allSongs.replace("{count}", String(songs.length))}
                        </button>
                    )}
                </div>
            )}

            <p className="mt-4 mb-2 text-[0.875rem] font-semibold">{words.ambiances}</p>
            <div className="flex flex-wrap gap-2">
                {SOUNDS.map((key) => (
                    <button
                        key={key}
                        type="button"
                        aria-pressed={sound === key}
                        onClick={() => {
                            onChange({ sound: key, song: null });
                            preview(key, () => playTrack(key, 0.45));
                        }}
                        className="nt-chip h-9 gap-1.5 text-[0.875rem]"
                    >
                        <Music2 size={14} />
                        {words.sounds[key]}
                    </button>
                ))}
            </div>
            <Link href={paths.artists(locale)} className="nt-tap mt-3 inline-flex min-h-11 items-center text-[0.8125rem] font-semibold text-brand-600">
                🎤 {words.artistCta} →
            </Link>
        </div>
    );
}
