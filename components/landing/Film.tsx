"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useLocale } from "@/components/site/LocaleProvider";
import { BEAT, FILM, FILM_BEATS, FILM_CHAPTERS, FILM_STARTS, type FilmScene } from "@/lib/film";
import type { FilmPhoto } from "@/lib/film-photos";
import { paths } from "@/lib/places/paths";
import { createFilmSound, type FilmSound } from "./film-sound";

// The opening film: Cameroon in a little over a minute, drawn here from the
// real photos of the site, cut on the beat of a soundtrack the browser plays
// itself (film-sound.ts). It starts on its own, silent, as browsers require;
// the first tap gives it its sound. It stops when it leaves the screen, and
// waits for a tap when the visitor asked for less motion or is saving data.

const TOTAL = FILM_BEATS * BEAT;
const LABELS = {
    fr: { film: "Le Cameroun en une minute", sound: "Activer le son", mute: "Couper le son", play: "Lire le film", pause: "Mettre en pause", tap: "Touche pour le son", photo: "Photo", summary: "Un film d’une minute sur le Cameroun : ses montagnes, ses chutes et ses lacs, ses royaumes, sa cuisine, ses nuits, et ceux qui l’ont rendu grand." },
    en: { film: "Cameroon in one minute", sound: "Turn the sound on", mute: "Turn the sound off", play: "Play the film", pause: "Pause", tap: "Tap for sound", photo: "Photo", summary: "A one-minute film about Cameroon: its mountains, waterfalls and lakes, its kingdoms, its food, its nights, and the people who made it great." },
};

// The photo at the size the screen needs, through the site's own image service.
const sized = (photo: FilmPhoto, wide: boolean) => `/_next/image?url=${encodeURIComponent(photo.src)}&w=${wide ? 1920 : 828}&q=75`;
const photosOf = (scene: FilmScene) => (scene.kind === "shot" ? [scene.photo] : scene.kind === "montage" ? scene.photos : []);

function Picture({ photo, wide, seconds, delay = 0 }: { photo: FilmPhoto; wide: boolean; seconds: number; delay?: number }) {
    return (
        <img
            src={sized(photo, wide)}
            alt=""
            decoding="async"
            className="nt-film-photo absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: photo.focus, animationDuration: `${seconds + 0.8}s`, animationDelay: `${delay}s` }}
            onError={(event) => (event.currentTarget.style.visibility = "hidden")}
        />
    );
}

// A number that counts up to its value.
function Counter({ value, running }: { value: number; running: boolean }) {
    const [shown, setShown] = useState(0);
    useEffect(() => {
        if (!running) return;
        let frame = 0;
        const started = performance.now();
        const tick = (now: number) => {
            const progress = Math.min(1, (now - started) / 1100);
            setShown(Math.round(value * (1 - (1 - progress) ** 3)));
            if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [value, running]);
    return <>{shown}</>;
}

function Scene({ scene, wide, running }: { scene: FilmScene; wide: boolean; running: boolean }) {
    const { locale } = useLocale();
    const seconds = scene.beats * BEAT;
    const credit = (photo: FilmPhoto) => (
        <p className="absolute right-3 bottom-2.5 z-10 max-w-[80%] truncate text-right text-[0.75rem] leading-none text-white/55">
            {LABELS[locale].photo} : {photo.credit} · Wikimedia Commons
        </p>
    );

    if (scene.kind === "words") {
        return (
            <div className={`nt-film-scene nt-film-in-fade flex items-center justify-center px-6 text-center ${scene.accent ? "bg-brand-600" : "bg-[#0f0c0a]"}`}>
                <p className={`nt-serif leading-[1.02] ${scene.accent ? "text-[3.5rem] md:text-[4.5rem]" : "text-[2.25rem] md:text-[3.5rem]"}`}>
                    {scene.lines.map((line, index) => (
                        <span key={line.fr} className="nt-film-line block" style={{ animationDelay: `${0.15 + index * BEAT * 2}s` }}>
                            {line[locale]}
                        </span>
                    ))}
                </p>
            </div>
        );
    }
    if (scene.kind === "montage") {
        return (
            <div className="nt-film-scene bg-black">
                {scene.photos.map((photo, index) => (
                    <div key={photo.src} className="nt-film-cut absolute inset-0" style={{ animationDelay: `${index * BEAT}s` }}>
                        <Picture photo={photo} wide={wide} seconds={BEAT * 2} delay={index * BEAT} />
                    </div>
                ))}
                <div className="absolute inset-0 bg-black/45" />
                <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
                    <p className="nt-film-title nt-serif text-[3.5rem] leading-[0.95] tracking-[0.03em] uppercase md:text-[4.5rem]">{scene.title}</p>
                    <p className="nt-film-line mt-4 max-w-md text-[1rem] font-medium text-white/90 md:text-[1.125rem]" style={{ animationDelay: `${BEAT * 4}s` }}>
                        {scene.sub[locale]}
                    </p>
                </div>
            </div>
        );
    }
    if (scene.kind === "chapter") {
        return (
            <div className="nt-film-scene nt-film-in-wipe-y flex flex-col items-center justify-center bg-[#f6efe4] text-[#15110e]">
                <p className="nt-film-line text-[0.75rem] font-semibold tracking-[0.3em] uppercase opacity-60">{scene.number}</p>
                <p className="nt-film-line nt-serif mt-2 text-[2.75rem] leading-none md:text-[4.5rem]" style={{ animationDelay: "0.12s" }}>
                    {scene.label[locale]}
                </p>
                <span className="nt-film-rule mt-5 block h-px w-24 bg-[#15110e]" />
            </div>
        );
    }
    if (scene.kind === "shot") {
        return (
            <div className={`nt-film-scene nt-film-in-${scene.enter} bg-black`}>
                <Picture photo={scene.photo} wide={wide} seconds={seconds} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/25" />
                <div className="absolute inset-x-5 bottom-9 md:inset-x-10 md:bottom-12">
                    <p className={`nt-film-line nt-serif leading-[0.98] ${scene.sub ? "text-[2.25rem] md:text-[3.5rem]" : "text-[3.5rem] md:text-[4.5rem]"}`} style={{ animationDelay: "0.18s" }}>
                        {scene.title[locale]}
                    </p>
                    {scene.sub && (
                        <p className="nt-film-line mt-2 max-w-md text-[1rem] font-medium text-white/90 md:text-[1.125rem]" style={{ animationDelay: `${BEAT}s` }}>
                            {scene.sub[locale]}
                        </p>
                    )}
                </div>
                {credit(scene.photo)}
            </div>
        );
    }
    if (scene.kind === "count") {
        return (
            <div className="nt-film-scene nt-film-in-wipe-x flex flex-col items-center justify-center gap-5 bg-[#0f0c0a] px-6 text-center md:flex-row md:gap-14">
                {scene.items.map((item, index) => (
                    <p key={item.label.fr} className="nt-film-line" style={{ animationDelay: `${index * BEAT}s` }}>
                        <span className="nt-serif block text-[3.5rem] leading-none text-brand-400 tabular-nums md:text-[4.5rem]">
                            <Counter value={item.value} running={running} />
                        </span>
                        <span className="mt-1 block text-[0.875rem] font-semibold tracking-[0.14em] uppercase opacity-80">{item.label[locale]}</span>
                    </p>
                ))}
                <p className="nt-film-line nt-serif absolute inset-x-0 bottom-10 text-[1.75rem] italic md:bottom-12 md:text-[2.25rem]" style={{ animationDelay: `${BEAT * 4}s` }}>
                    {scene.line[locale]}
                </p>
            </div>
        );
    }
    if (scene.kind === "names") {
        const slot = (BEAT * 5) / scene.names.length;
        return (
            <div className="nt-film-scene nt-film-in-fade flex items-center justify-center bg-brand-600 px-6 text-center">
                {scene.names.map((name, index) => (
                    <p key={name} className="nt-film-name nt-serif absolute inset-x-4 text-[2.75rem] leading-none md:text-[4.5rem]" style={{ animationDelay: `${index * slot}s`, animationDuration: `${slot}s` }}>
                        {name}
                    </p>
                ))}
                <p className="nt-film-line nt-serif text-[2.25rem] leading-[1.02] md:text-[3.5rem]" style={{ animationDelay: `${BEAT * 5.2}s` }}>
                    {scene.line[locale]}
                </p>
            </div>
        );
    }
    return (
        <div className="nt-film-scene nt-film-in-zoom flex flex-col items-center justify-center bg-[#0f0c0a] px-6 text-center">
            <p className="nt-film-line text-[1.5rem] font-bold tracking-[-0.03em]">
                Nice<span className="nt-sunset-text">Things</span>
            </p>
            <p className="nt-film-line nt-serif mt-3 text-[2.75rem] leading-[1] md:text-[4.5rem]" style={{ animationDelay: `${BEAT}s` }}>
                {scene.line[locale]}
            </p>
            <Link
                href={paths.searchEntry(locale)}
                onClick={(event) => event.stopPropagation()}
                className="nt-film-line nt-btn nt-btn-primary mt-7"
                style={{ animationDelay: `${BEAT * 2}s` }}
            >
                {scene.cta[locale]}
                <ArrowRight size={16} />
            </Link>
        </div>
    );
}

export default function Film() {
    const { locale } = useLocale();
    const label = LABELS[locale];
    const root = useRef<HTMLElement>(null);
    const clock = useRef({ elapsed: 0, last: 0 });
    const sound = useRef<FilmSound | null>(null);
    // `step` counts scenes without ever going back, so a scene coming round
    // again is drawn afresh; -1 is the still poster shown before the film runs.
    const [step, setStep] = useState(-1);
    const [wanted, setWanted] = useState(false); // the visitor (or autoplay) wants it running
    const [visible, setVisible] = useState(false);
    const [loud, setLoud] = useState(false);
    const [wide, setWide] = useState(false);
    const running = wanted && visible && step >= 0;

    // Runs only while it is on screen and the tab is in front. The first time
    // it comes on screen it starts by itself, unless the visitor asked for
    // less motion or is saving data.
    useEffect(() => {
        const node = root.current;
        if (!node) return;
        let inView = false;
        let met = false;
        const update = () => setVisible(inView && !document.hidden);
        const watcher = new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            if (inView && !met) {
                met = true;
                const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                const saving = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
                setWide(window.innerWidth >= 900);
                if (!calm && !saving) {
                    setWanted(true);
                    setStep(0);
                }
            }
            update();
        }, { threshold: 0.35 });
        watcher.observe(node);
        document.addEventListener("visibilitychange", update);
        return () => {
            watcher.disconnect();
            document.removeEventListener("visibilitychange", update);
        };
    }, []);

    // The clock: real time while running, and the scene it has reached.
    useEffect(() => {
        if (!running) return;
        let frame = 0;
        // Time is counted from the first frame drawn, and never backwards: a
        // frame's own timestamp can be a hair earlier than the moment this
        // started, and a clock below zero would stop the film on its poster.
        clock.current.last = 0;
        const tick = (now: number) => {
            const time = clock.current;
            if (time.last > 0) time.elapsed += Math.max(0, now - time.last) / 1000;
            time.last = now;
            const at = (time.elapsed % TOTAL) / BEAT;
            let scene = 0;
            while (scene + 1 < FILM.length && FILM_STARTS[scene + 1] <= at) scene++;
            setStep(Math.floor(time.elapsed / TOTAL) * FILM.length + scene);
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [running]);

    // The sound follows the film: it plays from where the picture is.
    useEffect(() => {
        if (!loud || !running) return;
        sound.current?.start(clock.current.elapsed);
        return () => sound.current?.stop();
    }, [loud, running]);

    // The next pictures are fetched one scene ahead.
    useEffect(() => {
        if (step < 0) return;
        for (const photo of photosOf(FILM[(step + 1) % FILM.length])) new window.Image().src = sized(photo, wide);
    }, [step, wide]);

    const begin = useCallback(() => {
        setWanted(true);
        setStep((current) => (current < 0 ? 0 : current));
    }, []);
    // Sound can only be switched on from a tap: this is that tap.
    const speak = useCallback(() => {
        sound.current ??= createFilmSound();
        if (sound.current) setLoud(true);
        begin();
    }, [begin]);
    // A tap on the picture: first it gives the sound, after that it pauses and resumes.
    const tap = () => {
        if (step < 0 || !wanted) return speak();
        if (!loud) return speak();
        setWanted(false);
    };

    const scene = step >= 0 ? FILM[step % FILM.length] : null;
    const before = step > 0 ? FILM[(step - 1) % FILM.length] : null;
    const chapter = scene?.chapter ?? 0;

    return (
        <section ref={root} aria-label={label.film} className="mx-auto max-w-6xl px-4 pt-4 md:px-6 md:pt-8">
            <p className="sr-only">{label.summary}</p>
            <div
                className="nt-film relative aspect-[4/5] cursor-pointer overflow-hidden rounded-[1.6rem] bg-[#0f0c0a] text-white select-none sm:aspect-[16/10] lg:aspect-[2/1]"
                data-paused={running ? undefined : "true"}
                onClick={tap}
            >
                <div aria-hidden className="absolute inset-0">
                    {scene === null ? (
                        // The still shown before the film runs (and to a browser without scripts).
                        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                            <p className="nt-serif text-[3.5rem] leading-[0.95] uppercase md:text-[4.5rem]">Le Continent</p>
                            <p className="mt-4 max-w-md text-[1rem] font-medium text-white/85 md:text-[1.125rem]">{label.film}</p>
                        </div>
                    ) : (
                        // The scene before stays underneath while the new one comes in over it.
                        [...(before ? [{ at: step - 1, item: before }] : []), { at: step, item: scene }].map(({ at, item }) => (
                            <Scene key={at} scene={item} wide={wide} running={running && at === step} />
                        ))
                    )}
                </div>

                {/* Where the film is: one bar per chapter, like a story. */}
                {scene && (
                    <ol className="absolute inset-x-3 top-3 z-20 flex gap-1" aria-hidden>
                        {FILM_CHAPTERS.map((name, index) => (
                            <li key={name.fr} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
                                <span className={`block h-full rounded-full bg-white ${index < chapter ? "w-full" : index === chapter ? "nt-film-bar" : "w-0"}`} key={index === chapter ? `on-${Math.floor(step / FILM.length)}` : "off"} style={index === chapter ? { animationDuration: `${FILM.filter((item) => item.chapter === chapter).reduce((sum, item) => sum + item.beats, 0) * BEAT}s` } : undefined} />
                            </li>
                        ))}
                    </ol>
                )}

                <div className="absolute top-6 right-3 z-20 flex items-center gap-2">
                    {scene && !loud && wanted && <span className="nt-film-hint rounded-full bg-black/55 px-3 py-1.5 text-[0.75rem] font-semibold backdrop-blur">{label.tap}</span>}
                    <button
                        type="button"
                        aria-label={loud ? label.mute : label.sound}
                        aria-pressed={loud}
                        onClick={(event) => {
                            event.stopPropagation();
                            if (loud) setLoud(false);
                            else speak();
                        }}
                        className="grid h-11 w-11 place-items-center rounded-full bg-black/55 backdrop-blur transition active:scale-95"
                    >
                        {loud ? <Volume2 size={19} /> : <VolumeX size={19} />}
                    </button>
                    <button
                        type="button"
                        aria-label={wanted && scene ? label.pause : label.play}
                        onClick={(event) => {
                            event.stopPropagation();
                            if (wanted && scene) setWanted(false);
                            else begin();
                        }}
                        className="grid h-11 w-11 place-items-center rounded-full bg-black/55 backdrop-blur transition active:scale-95"
                    >
                        {wanted && scene ? <Pause size={18} /> : <Play size={18} className="translate-x-px" />}
                    </button>
                </div>
            </div>
        </section>
    );
}
