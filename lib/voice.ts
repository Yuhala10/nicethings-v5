"use client";

import type { Locale } from "./i18n/config";

// Spoken guidance. Two engines:
//  1. A natural studio voice from the server (/api/tts, Google's neural
//     French voice) when it is switched on: identical on every phone.
//  2. Otherwise the best voice the phone itself has: natural / neural /
//     online voices first, French from France first, never a robot voice
//     or an English voice reading French.

const QUALITY = /natural|neural|online|premium|enhanced|wavenet|studio/i;
const GOOD_FRENCH = /google fran|denise|henri|eloise|vivienne|remy|rémy|am[ée]lie|thomas|audrey|aur[ée]lie|marie|julie|hortense|virginie|claude/i;
const POOR = /compact|espeak|robot|eloquence|grandma|grandpa|novelty/i;

let voices: SpeechSynthesisVoice[] = [];
let serverVoice: boolean | null = null; // null = not checked yet

function refreshVoices() {
    voices = window.speechSynthesis.getVoices();
}

// One audio element for the whole trip: phones only let a page play sound
// after a tap, and this one is unlocked by the "Start" tap.
let player: HTMLAudioElement | null = null;

// Call from the tap that starts guidance: loads the phone's voices (they
// arrive late on Chrome), unlocks audio and checks whether the studio
// voice is switched on.
export function primeVoices() {
    if (typeof window === "undefined") return;
    if ("speechSynthesis" in window) {
        refreshVoices();
        window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
    }
    player ??= new Audio();
    player.play().catch(() => {});
    if (serverVoice === null) {
        fetch("/api/tts?l=fr&t=ok")
            .then((response) => {
                serverVoice = response.ok;
            })
            .catch(() => {
                serverVoice = false;
            });
    }
}

function score(voice: SpeechSynthesisVoice, locale: Locale) {
    const lang = voice.lang.toLowerCase().replace("_", "-");
    let points = 0;
    if (locale === "fr") {
        if (lang === "fr-fr") points += 50;
        else if (lang.startsWith("fr")) points += 30;
        else return -1;
        if (GOOD_FRENCH.test(voice.name)) points += 12;
    } else {
        if (lang === "en-gb") points += 50;
        else if (lang.startsWith("en")) points += 30;
        else return -1;
    }
    if (QUALITY.test(voice.name)) points += 40;
    if (/google/i.test(voice.name)) points += 15;
    if (!voice.localService) points += 6; // network voices are usually richer
    if (voice.default) points += 2;
    if (POOR.test(voice.name)) points -= 40;
    return points;
}

function bestVoice(locale: Locale) {
    if (!voices.length && typeof window !== "undefined" && "speechSynthesis" in window) refreshVoices();
    let best: SpeechSynthesisVoice | null = null;
    let bestScore = -1;
    for (const voice of voices) {
        const value = score(voice, locale);
        if (value > bestScore) {
            best = voice;
            bestScore = value;
        }
    }
    return best;
}

const ORDINALS_FR = ["", "première", "deuxième", "troisième", "quatrième", "cinquième", "sixième", "septième", "huitième", "neuvième"];
const ABBREVIATIONS_FR: [RegExp, string][] = [
    [/\bAv\.?(?=\s)/g, "Avenue"],
    [/\bBd\.?(?=\s)|\bBvd\.?(?=\s)/g, "Boulevard"],
    [/\bCarref\.?(?=\s)|\bCrf\.?(?=\s)/g, "Carrefour"],
    [/\bSt(?=\s)/g, "Saint"],
    [/\bSte(?=\s)/g, "Sainte"],
    [/\bRte(?=\s)/g, "Route"],
];

// Text written for the eyes, rewritten for the ear.
function forSpeech(text: string, locale: Locale) {
    let spoken = text
        .replace(/\p{Extended_Pictographic}/gu, "")
        .replace(/\((e|s|es)\)/g, "")
        // Yaoundé street numbers: "Rue 1.750" is street 1750.
        .replace(/(\d)\.(\d{3})\b/g, "$1$2");
    if (locale === "fr") {
        spoken = spoken.replace(/\b([1-9])(re|er|e|ème)\b/g, (_, n: string) => ORDINALS_FR[Number(n)]);
        for (const [pattern, word] of ABBREVIATIONS_FR) spoken = spoken.replace(pattern, word);
    }
    return spoken.replace(/\s+/g, " ").trim();
}

function speakOnDevice(text: string, locale: Locale) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = bestVoice(locale);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? (locale === "fr" ? "fr-FR" : "en-GB");
    utterance.rate = locale === "fr" ? 0.97 : 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
}

function ttsUrl(text: string, locale: Locale) {
    return `/api/tts?l=${locale}&t=${encodeURIComponent(forSpeech(text, locale))}`;
}

// Loads a sentence before it's needed (the next turn), so it plays at once.
export function prefetchSpeech(text: string, locale: Locale) {
    if (!serverVoice || typeof window === "undefined") return;
    fetch(ttsUrl(text, locale), { priority: "low" }).catch(() => {});
}

export function speak(text: string, locale: Locale) {
    if (typeof window === "undefined") return;
    const spoken = forSpeech(text, locale);
    if (!serverVoice || !player) return speakOnDevice(spoken, locale);

    const audio = player;
    let fellBack = false;
    const fallback = () => {
        if (fellBack) return;
        fellBack = true;
        speakOnDevice(spoken, locale);
    };
    audio.pause();
    audio.src = ttsUrl(text, locale);
    audio.addEventListener("error", fallback, { once: true });
    audio.play().catch(fallback);
}

export function stopSpeaking() {
    player?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
