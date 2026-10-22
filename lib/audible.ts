"use client";

// Sound a page makes itself (Web Audio: the outings' soundtracks, the film)
// is muted by an iPhone whose side switch is on silent, though its music
// apps and any sound file still play. Asking for "playback" sound (Safari
// 16.4 and later), or on older iPhones playing a silent sound file at the
// same time, makes it heard like any music. Call it from the tap that
// starts the sound, `quiet` when it ends, with the same `owner` (whatever
// object stands for that sound).

const SILENCE = "data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";
let silence: HTMLAudioElement | null = null;
const owners = new Set<object>();

type Session = { type: string };
const sessionOf = () => (typeof navigator === "undefined" ? undefined : (navigator as Navigator & { audioSession?: Session }).audioSession);

export function audible(owner: object) {
    owners.add(owner);
    const session = sessionOf();
    if (session) {
        try {
            session.type = "playback";
            return;
        } catch {}
    }
    if (typeof Audio === "undefined") return;
    if (!silence) {
        silence = new Audio(SILENCE);
        silence.loop = true;
        silence.setAttribute("playsinline", "");
    }
    silence.play().catch(() => {});
}

export function quiet(owner: object) {
    owners.delete(owner);
    if (owners.size) return;
    const session = sessionOf();
    if (session) {
        try {
            session.type = "auto";
        } catch {}
    }
    silence?.pause();
}
