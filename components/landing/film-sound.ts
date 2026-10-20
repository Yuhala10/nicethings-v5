import { BEAT, FILM, FILM_BEATS, FILM_STARTS } from "@/lib/film";

// The film's soundtrack, played by the browser itself: a kick, a clap, a
// shaker, a bass and a balafon-like pluck over four chords, with a whoosh on
// every cut, a rise before the title and a deep hit when it lands. Nothing
// is downloaded and no recording is used: every sound is made here, so it
// costs the visitor no data and belongs to nobody else.
//
// A browser only lets a page make sound after the visitor has touched it:
// `start` must be called from a tap.

type Step = { music: "air" | "beat" | "break"; cut: boolean; hit: boolean; rise: number };

// What happens on each beat of the film.
const STEPS: Step[] = Array.from({ length: FILM_BEATS }, (_, beat) => {
    let index = 0;
    while (index + 1 < FILM.length && FILM_STARTS[index + 1] <= beat) index++;
    const scene = FILM[index];
    const first = FILM_STARTS[index] === beat;
    return { music: scene.music, cut: first, hit: first && Boolean(scene.hit), rise: first && scene.rise ? scene.beats : 0 };
});

// Four chords, one per bar: C, G, A minor, F. The bass plays the root, the
// pluck walks through the chord in eighth notes.
const BASS = [65.41, 49.0, 55.0, 43.65];
const PLUCK = [
    [659.25, 783.99, 1046.5, 783.99, 659.25, 783.99, 880.0, 783.99],
    [587.33, 783.99, 987.77, 783.99, 587.33, 783.99, 880.0, 783.99],
    [523.25, 659.25, 880.0, 659.25, 523.25, 659.25, 783.99, 659.25],
    [523.25, 698.46, 880.0, 698.46, 523.25, 698.46, 783.99, 880.0],
];
const PAD = [
    [261.63, 329.63, 392.0],
    [196.0, 246.94, 392.0],
    [220.0, 261.63, 329.63],
    [174.61, 220.0, 349.23],
];
const GROOVE = [1, 0, 1, 1, 0, 1, 1, 0]; // which eighth notes the pluck plays

export type FilmSound = { start: (seconds: number) => void; stop: () => void };

export function createFilmSound(): FilmSound | null {
    const Context = typeof window === "undefined" ? null : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!Context) return null;
    // iPhones can refuse an audio device (a call in progress, silent mode,
    // too many players open): the film then simply plays without sound.
    let ctx: AudioContext;
    try {
        ctx = new Context();
    } catch {
        return null;
    }
    const out = ctx.createDynamicsCompressor();
    const master = ctx.createGain();
    master.gain.value = 0.55;
    out.connect(master).connect(ctx.destination);

    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

    // A note: an oscillator through a gain that fades to nothing.
    const tone = (at: number, type: OscillatorType, from: number, to: number, level: number, length: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(from, at);
        if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, at + length * 0.6);
        gain.gain.setValueAtTime(level, at);
        gain.gain.exponentialRampToValueAtTime(0.0008, at + length);
        osc.connect(gain).connect(out);
        osc.start(at);
        osc.stop(at + length + 0.02);
    };
    // A breath of noise through a filter that can sweep.
    const air = (at: number, type: BiquadFilterType, from: number, to: number, level: number, length: number, swell = false) => {
        const source = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        source.buffer = noise;
        source.loop = true;
        filter.type = type;
        filter.Q.value = type === "bandpass" ? 1.2 : 0.7;
        filter.frequency.setValueAtTime(from, at);
        if (to !== from) filter.frequency.exponentialRampToValueAtTime(to, at + length);
        if (swell) {
            gain.gain.setValueAtTime(0.0008, at);
            gain.gain.exponentialRampToValueAtTime(level, at + length * 0.9);
            gain.gain.exponentialRampToValueAtTime(0.0008, at + length);
        } else {
            gain.gain.setValueAtTime(level, at);
            gain.gain.exponentialRampToValueAtTime(0.0008, at + length);
        }
        source.connect(filter).connect(gain).connect(out);
        source.start(at);
        source.stop(at + length + 0.02);
    };
    const pad = (at: number, notes: number[], length: number) => {
        for (const note of notes) {
            const osc = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.value = note;
            filter.type = "lowpass";
            filter.frequency.value = 900;
            gain.gain.setValueAtTime(0.0008, at);
            gain.gain.exponentialRampToValueAtTime(0.05, at + length * 0.35);
            gain.gain.exponentialRampToValueAtTime(0.0008, at + length);
            osc.connect(filter).connect(gain).connect(out);
            osc.start(at);
            osc.stop(at + length + 0.02);
        }
    };

    // One eighth note of the film, `at` seconds on the audio clock.
    const play = (eighth: number, at: number) => {
        const beat = Math.floor(eighth / 2) % FILM_BEATS;
        const onBeat = eighth % 2 === 0;
        const step = STEPS[beat];
        const bar = Math.floor(beat / 4) % 4;
        if (onBeat) {
            if (step.cut) air(at, "bandpass", 400, 5200, 0.22, 0.34, true); // whoosh into the new scene
            if (step.hit) {
                tone(at, "sine", 92, 30, 0.95, 1.1);
                air(at, "lowpass", 2400, 120, 0.4, 0.7);
            }
            if (step.rise) air(at, "bandpass", 240, 7000, 0.3, step.rise * BEAT, true);
            if (step.music !== "beat" && beat % 4 === 0) pad(at, PAD[bar], BEAT * 4.2);
        }
        if (step.music === "air") return;
        if (onBeat) {
            tone(at, "triangle", BASS[bar] * 2, BASS[bar] * 2, 0.3, 0.32);
            if (step.music === "beat") {
                tone(at, "sine", 150, 44, 0.9, 0.3); // kick
                if (beat % 2 === 1) air(at, "bandpass", 1700, 1700, 0.34, 0.16); // clap
            }
        }
        if (step.music === "beat") air(at, "highpass", 7600, 7600, onBeat ? 0.05 : 0.11, 0.05); // shaker
        if (GROOVE[eighth % 8]) {
            const note = PLUCK[bar][eighth % 8];
            tone(at, "sine", note, note, 0.16, 0.3);
            tone(at, "sine", note * 3.93, note * 3.93, 0.035, 0.09); // the knock of the mallet
        }
    };

    let timer = 0;
    let origin = 0; // audio time at which the film was at zero
    let next = 0; // the next eighth note to schedule
    const schedule = () => {
        const until = ctx.currentTime - origin + 0.22;
        while ((next * BEAT) / 2 < until) {
            const at = origin + (next * BEAT) / 2;
            if (at >= ctx.currentTime - 0.02) play(next, Math.max(at, ctx.currentTime));
            next++;
        }
    };

    return {
        // Plays from `seconds` into the film (the film's own clock).
        start(seconds) {
            ctx.resume().catch(() => {});
            window.clearInterval(timer);
            origin = ctx.currentTime - seconds;
            next = Math.ceil((seconds * 2) / BEAT);
            schedule();
            timer = window.setInterval(schedule, 60);
        },
        stop() {
            window.clearInterval(timer);
            ctx.suspend().catch(() => {});
        },
    };
}
