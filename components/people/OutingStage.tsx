"use client";

import { Heart, Music2, Pause } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fill } from "@/lib/i18n";
import type { OutingView } from "@/lib/people/types";
import { isSound, nowPlaying, playTrack, type Playing } from "@/lib/soundtracks";
import { useLocale } from "../site/LocaleProvider";

// The photos of an outing (swiped sideways) or its video. With music, a
// tap on the turning disc plays it: the photos then roll on their own, each
// slowly coming closer (Ken Burns), until the outing leaves the screen.
// Two taps on a photo like it, with a heart.

const ROLL_MS = 3600;

export default function OutingStage({ outing, shown, onShown, onDoubleTap }: { outing: OutingView; shown: number; onShown: (index: number) => void; onDoubleTap: () => void }) {
    const { t } = useLocale();
    const words = t.people.post;
    const stage = useRef<HTMLDivElement>(null);
    const scroller = useRef<HTMLDivElement>(null);
    const track = useRef<Playing | null>(null);
    const lastTap = useRef({ at: 0, x: 0, y: 0 });
    const [playing, setPlaying] = useState(false);
    const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
    const sound = isSound(outing.sound) && outing.media.every((item) => item.kind === "photo") ? outing.sound : null;
    const count = outing.media.length;

    // Another outing's music, or this one stopped: the disc stops turning.
    useEffect(() => {
        const changed = () => setPlaying(Boolean(track.current) && nowPlaying() === track.current);
        window.addEventListener("nt-track", changed);
        return () => {
            window.removeEventListener("nt-track", changed);
            track.current?.stop();
        };
    }, []);

    // While it plays: the photos roll; leaving the screen (or the app) stops it.
    useEffect(() => {
        if (!playing) return;
        const box = stage.current;
        const roll =
            count > 1
                ? window.setInterval(() => {
                      const list = scroller.current;
                      if (!list) return;
                      const next = (Math.round(list.scrollLeft / Math.max(1, list.clientWidth)) + 1) % count;
                      list.scrollTo({ left: next * list.clientWidth, behavior: "smooth" });
                  }, ROLL_MS)
                : 0;
        const watch = new IntersectionObserver(([entry]) => {
            if (entry && entry.intersectionRatio < 0.35) track.current?.stop();
        }, { threshold: [0, 0.35] });
        if (box) watch.observe(box);
        const hidden = () => {
            if (document.hidden) track.current?.stop();
        };
        document.addEventListener("visibilitychange", hidden);
        return () => {
            window.clearInterval(roll);
            watch.disconnect();
            document.removeEventListener("visibilitychange", hidden);
        };
    }, [playing, count]);

    const toggle = () => {
        if (!sound) return;
        if (track.current && nowPlaying() === track.current) {
            track.current.stop();
            return;
        }
        track.current = playTrack(sound, 0.55);
        setPlaying(Boolean(track.current));
    };

    const tapped = (event: React.MouseEvent<HTMLDivElement>) => {
        const box = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - box.left;
        const y = event.clientY - box.top;
        const before = lastTap.current;
        lastTap.current = { at: event.timeStamp, x, y };
        if (event.timeStamp - before.at > 320 || Math.hypot(x - before.x, y - before.y) > 40) return;
        lastTap.current = { at: 0, x: 0, y: 0 };
        const id = event.timeStamp;
        setHearts((list) => [...list, { id, x, y }]);
        window.setTimeout(() => setHearts((list) => list.filter((heart) => heart.id !== id)), 900);
        onDoubleTap();
    };

    return (
        <div ref={stage} className="relative">
            <div
                ref={scroller}
                className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                onScroll={(event) => {
                    const box = event.currentTarget;
                    onShown(Math.round(box.scrollLeft / Math.max(1, box.clientWidth)));
                }}
            >
                {outing.media.map((item, index) => (
                    <div key={item.url} className="relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden bg-surface-2" onClick={item.kind === "photo" ? tapped : undefined}>
                        {item.kind === "video" ? (
                            <video src={item.url} poster={item.poster ?? undefined} controls playsInline preload="none" className="h-full w-full object-cover" />
                        ) : (
                            <img
                                src={item.url}
                                alt={index === 0 ? `${outing.place.name}, ${outing.person.handle}` : ""}
                                loading="lazy"
                                decoding="async"
                                draggable={false}
                                className={`h-full w-full object-cover select-none ${playing && index === shown ? (index % 2 ? "nt-kenburns-b" : "nt-kenburns") : ""}`}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* A soft shade at the bottom, so what sits on the photo reads. */}
            {sound && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/55 to-transparent" aria-hidden />}

            {count > 1 && (
                <>
                    <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-black/45 px-2.5 py-1 text-[0.75rem] font-bold text-white tabular-nums backdrop-blur-sm">
                        {shown + 1}/{count}
                    </span>
                    <div className={`pointer-events-none absolute inset-x-0 flex justify-center gap-1.5 ${sound ? "bottom-[4.25rem]" : "bottom-3"}`}>
                        {outing.media.map((item, index) => (
                            <span key={item.url} className={`h-1.5 rounded-full transition-all ${index === shown ? "w-4 bg-white" : "w-1.5 bg-white/60"}`} />
                        ))}
                    </div>
                </>
            )}

            {/* The music, as on TikTok: its name rolling by, a turning disc. */}
            {sound && (
                <button type="button" onClick={toggle} aria-pressed={playing} aria-label={playing ? words.mute : words.play} className="absolute inset-x-3 bottom-3 flex items-center gap-2.5 text-left text-white">
                    <span className="flex h-10 min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-full bg-black/40 px-3.5 backdrop-blur-sm">
                        {playing ? (
                            <span className="flex h-4 shrink-0 items-end gap-[3px]" aria-hidden>
                                <span className="nt-eq w-[3px] rounded-full bg-white" />
                                <span className="nt-eq w-[3px] rounded-full bg-white [animation-delay:-0.35s]" />
                                <span className="nt-eq w-[3px] rounded-full bg-white [animation-delay:-0.7s]" />
                            </span>
                        ) : (
                            <Music2 size={16} className="shrink-0" />
                        )}
                        <span className="min-w-0 flex-1 overflow-hidden">
                            <span className={`block text-[0.8125rem] font-semibold whitespace-nowrap ${playing ? "nt-marquee" : "truncate"}`}>{fill(words.ticker, { sound: words.sounds[sound] })}</span>
                        </span>
                    </span>
                    <span className="relative h-11 w-11 shrink-0">
                        <span className={`grid h-11 w-11 place-items-center rounded-full border-[3px] border-white/25 bg-[radial-gradient(circle,#2a2320_0%,#0f0c0b_70%)] shadow-float ${playing ? "nt-disc" : ""}`}>
                            <img src="/brand/mark.svg" alt="" width={22} height={22} />
                        </span>
                        <span className="absolute -right-1 -bottom-1 grid h-5 w-5 place-items-center rounded-full bg-white text-[#15110e]">{playing ? <Pause size={10} /> : <Music2 size={11} />}</span>
                    </span>
                </button>
            )}

            {hearts.map((heart) => (
                <Heart key={heart.id} size={88} className="nt-heart-burst pointer-events-none absolute fill-white text-white drop-shadow-lg" style={{ left: heart.x - 44, top: heart.y - 44 }} aria-hidden />
            ))}

            {outing.status === "PENDING" && <span className="absolute top-3 left-3 rounded-full bg-[#b7791f] px-3 py-1 text-[0.75rem] font-bold text-white">{t.people.outing.pending}</span>}
        </div>
    );
}
