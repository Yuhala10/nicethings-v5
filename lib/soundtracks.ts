"use client";

// The soundtracks of outings: five short loops in the spirit of music
// played here (makossa, bikutsi, afro, chill, a party), played by the
// browser itself, note by note. Nothing is downloaded and no song is
// borrowed: they belong to NiceThings and cost the visitor no data.
// A browser only lets a page make sound after a tap: `playTrack` must be
// called from one.

export const SOUNDS = ["makossa", "bikutsi", "afro", "chill", "soiree"] as const;
export type Sound = (typeof SOUNDS)[number];
export const isSound = (value: unknown): value is Sound => typeof value === "string" && (SOUNDS as readonly string[]).includes(value);

type Voice = "guitar" | "balafon" | "bell" | "stab";
type Track = {
    bpm: number;
    steps: number; // steps in a bar (16: four beats in sixteenths; 12: four beats in triplets)
    // Four chords, one per bar: the root (Hz), then the notes the melody picks from.
    chords: [number, number[]][];
    kick: number[];
    clap: number[];
    hat: number[];
    bass: number[];
    // Which chord note the melody plays on each step (-1: none).
    melody: number[];
    voice: Voice;
    pad: boolean;
};

const C = [130.81, [523.25, 659.25, 783.99, 1046.5]] as [number, number[]];
const G = [98.0, [493.88, 587.33, 783.99, 987.77]] as [number, number[]];
const Am = [110.0, [523.25, 659.25, 880.0, 1046.5]] as [number, number[]];
const F = [87.31, [523.25, 698.46, 880.0, 1046.5]] as [number, number[]];
const Dm = [73.42, [587.33, 698.46, 880.0, 1174.66]] as [number, number[]];
const Em = [82.41, [493.88, 659.25, 783.99, 987.77]] as [number, number[]];

const TRACKS: Record<Sound, Track> = {
    // Bright guitars running in sixteenths over a bass that dances off the beat.
    makossa: {
        bpm: 118,
        steps: 16,
        chords: [C, G, Am, F],
        kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
        clap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hat: [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
        bass: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
        melody: [0, 1, 2, 1, 3, 2, 1, 2, 0, 1, 2, 1, 3, 2, 1, 0],
        voice: "guitar",
        pad: false,
    },
    // Fast and driving, in threes, the balafon never still.
    bikutsi: {
        bpm: 132,
        steps: 12,
        chords: [Am, G, F, G],
        kick: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
        clap: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
        hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        bass: [1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1],
        melody: [0, 2, 1, 3, 2, 1, 0, 2, 1, 3, 2, 3],
        voice: "balafon",
        pad: false,
    },
    // Laid-back drums, a deep bass that slides, a few notes.
    afro: {
        bpm: 104,
        steps: 16,
        chords: [Dm, Am, C, G],
        kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        clap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
        hat: [0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0],
        bass: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        melody: [-1, -1, 2, -1, -1, 3, -1, 2, -1, -1, 1, -1, 0, -1, -1, -1],
        voice: "balafon",
        pad: true,
    },
    // Slow chords and a bell, for a terrace at sunset.
    chill: {
        bpm: 80,
        steps: 16,
        chords: [F, C, Am, Em],
        kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
        bass: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        melody: [0, -1, -1, 2, -1, -1, 1, -1, -1, 3, -1, -1, 2, -1, -1, -1],
        voice: "bell",
        pad: true,
    },
    // Four on the floor and chords that hit off the beat.
    soiree: {
        bpm: 124,
        steps: 16,
        chords: [Am, F, C, G],
        kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        clap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1],
        bass: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
        melody: [-1, -1, 0, -1, -1, -1, 0, -1, -1, -1, 0, -1, -1, 0, -1, -1],
        voice: "stab",
        pad: false,
    },
};

export type Playing = { stop: () => void };
let current: Playing | null = null;

// What plays on the page now; "nt-track" is sent on the window when it changes.
export const nowPlaying = () => current;
const announce = () => window.dispatchEvent(new Event("nt-track"));

// Somewhere else than the speakers: a recording (a downloaded video).
export type Into = { ctx: AudioContext; node: AudioNode };

export const audioContext = () => {
    const Context = typeof window === "undefined" ? null : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    try {
        return Context ? new Context() : null;
    } catch {
        return null;
    }
};

// Plays `sound` in a loop until stopped (one at a time on the page; any
// number into recordings).
export function playTrack(sound: Sound, level = 0.5, into?: Into): Playing | null {
    if (!into) current?.stop();
    const ctx = into?.ctx ?? audioContext();
    if (!ctx) return null;
    ctx.resume().catch(() => {});
    const track = TRACKS[sound];
    const out = ctx.createDynamicsCompressor();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.linearRampToValueAtTime(level, ctx.currentTime + 0.6);
    out.connect(master).connect(into?.node ?? ctx.destination);
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const grains = noise.getChannelData(0);
    for (let i = 0; i < grains.length; i++) grains[i] = Math.random() * 2 - 1;

    const tone = (at: number, type: OscillatorType, from: number, to: number, gainLevel: number, length: number, filter?: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(from, at);
        if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, at + length * 0.6);
        gain.gain.setValueAtTime(gainLevel, at);
        gain.gain.exponentialRampToValueAtTime(0.0008, at + length);
        let chain: AudioNode = osc;
        if (filter) {
            const lowpass = ctx.createBiquadFilter();
            lowpass.type = "lowpass";
            lowpass.frequency.value = filter;
            chain = osc.connect(lowpass);
        }
        chain.connect(gain).connect(out);
        osc.start(at);
        osc.stop(at + length + 0.02);
    };
    const air = (at: number, type: BiquadFilterType, frequency: number, gainLevel: number, length: number) => {
        const source = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        source.buffer = noise;
        filter.type = type;
        filter.frequency.value = frequency;
        filter.Q.value = type === "bandpass" ? 1.1 : 0.7;
        gain.gain.setValueAtTime(gainLevel, at);
        gain.gain.exponentialRampToValueAtTime(0.0008, at + length);
        source.connect(filter).connect(gain).connect(out);
        source.start(at, Math.random() * 0.5);
        source.stop(at + length + 0.02);
    };
    const note = (at: number, hz: number, accent: boolean) => {
        const level = accent ? 1 : 0.75;
        if (track.voice === "guitar") {
            tone(at, "triangle", hz, hz, 0.11 * level, 0.22, 3200);
            tone(at, "sine", hz * 2, hz * 2, 0.03 * level, 0.12);
        } else if (track.voice === "balafon") {
            tone(at, "sine", hz, hz, 0.14 * level, 0.26);
            tone(at, "sine", hz * 3.93, hz * 3.93, 0.03 * level, 0.08);
        } else if (track.voice === "bell") {
            tone(at, "sine", hz, hz, 0.09 * level, 1.1);
            tone(at, "sine", hz * 2.01, hz * 2.01, 0.025 * level, 0.6);
        } else {
            for (const ratio of [1, 1.26, 1.5]) tone(at, "sawtooth", hz * ratio * 0.5, hz * ratio * 0.5, 0.035 * level, 0.18, 2200);
        }
    };
    const stepLength = (60 / track.bpm) * (4 / track.steps);

    // One step of the loop, `at` seconds on the audio clock.
    const play = (step: number, at: number) => {
        const inBar = step % track.steps;
        const bar = Math.floor(step / track.steps) % track.chords.length;
        const [root, tones] = track.chords[bar];
        const beat = inBar % (track.steps / 4) === 0;
        if (track.kick[inBar]) tone(at, "sine", 150, 44, 0.8, 0.28);
        if (track.clap[inBar]) air(at, "bandpass", 1700, 0.28, 0.16);
        if (track.hat[inBar]) air(at, "highpass", 7800, beat ? 0.05 : 0.09, 0.05);
        if (track.bass[inBar]) {
            if (sound === "afro") tone(at, "sine", root * 0.75, root * 0.5, 0.45, 0.45);
            else tone(at, "triangle", root, root, 0.32, stepLength * 2.5);
        }
        if (track.melody[inBar] >= 0) note(at, tones[track.melody[inBar]], beat);
        if (track.pad && inBar === 0) for (const hz of tones.slice(0, 3)) tone(at, "sine", hz / 2, hz / 2, 0.035, stepLength * track.steps * 1.05);
    };

    let next = 0;
    const origin = ctx.currentTime + 0.08;
    const timer = window.setInterval(() => {
        while (origin + next * stepLength < ctx.currentTime + 0.25) {
            play(next, origin + next * stepLength);
            next++;
        }
    }, 50);

    const playing: Playing = {
        stop() {
            window.clearInterval(timer);
            try {
                master.gain.cancelScheduledValues(ctx.currentTime);
                master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
                master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
            } catch {}
            window.setTimeout(() => (into ? master.disconnect() : ctx.close().catch(() => {})), 400);
            if (current === playing) {
                current = null;
                announce();
            }
        },
    };
    if (!into) {
        current = playing;
        announce();
    }
    return playing;
}
