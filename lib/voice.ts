"use client";

import type { Locale } from "./i18n/config";
import LINES from "./route/voice-lines.json";

// Spoken guidance. Three engines, in this order:
//  1. A recorded voice (public/voice/<language>/<clip>.mp3): the guidance
//     sentences, said once by a clear woman's voice in each language. The
//     same on every phone, with nothing to switch on. The sentences are in
//     lib/route/voice-lines.json; the clips are named after their keys.
//  2. A natural studio voice from the server (/api/tts, Google's neural
//     French voice) when it is switched on, for a sentence that has no
//     recording.
//  3. Otherwise the best voice the phone itself has: natural / neural /
//     online voices first, a woman's voice first, French from France first,
//     never a robot voice or an English voice reading French.

const RECORDED = new Set(Object.keys(LINES));
const RECORDING = "1"; // bump when the clips are recorded again
const clipUrl = (clip: string, locale: Locale) => `/voice/${locale}/${clip}.mp3?v=${RECORDING}`;

const QUALITY = /natural|neural|online|premium|enhanced|wavenet|studio/i;
// Names phones give their voices: the guidance speaks with a woman's voice.
const WOMAN = /female|femme|woman|denise|eloise|vivienne|am[ée]lie|audrey|aur[ée]lie|marie|julie|hortense|virginie|brigitte|c[ée]line|sonia|libby|maisie|kate|serena|martha|susan|hazel|zira|samantha|karen|moira|tessa|fiona|catherine|emma|amy|joanna|salli/i;
const MAN = /\bmale\b|homme|henri|r[ée]my|thomas|claude|paul|guillaume|daniel|george|ryan|arthur|david|mark|oliver|james|fred|brian|matthew/i;
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
    if (WOMAN.test(voice.name)) points += 10;
    else if (MAN.test(voice.name)) points -= 10;
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
    utterance.rate = locale === "fr" ? 0.94 : 0.97; // unhurried: every word is heard
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
}

function ttsUrl(text: string, locale: Locale) {
    return `/api/tts?l=${locale}&t=${encodeURIComponent(forSpeech(text, locale))}`;
}

const recorded = (clips: readonly string[] | undefined): clips is readonly string[] => Boolean(clips?.length) && clips!.every((clip) => RECORDED.has(clip));

// Loads a sentence before it's needed (the next turn), so it plays at once.
// `clips` names the sentence in the recorded voice.
export function prefetchSpeech(text: string, locale: Locale, clips?: readonly string[]) {
    if (typeof window === "undefined") return;
    if (recorded(clips)) {
        for (const clip of clips) fetch(clipUrl(clip, locale), { priority: "low" }).catch(() => {});
        return;
    }
    if (serverVoice) fetch(ttsUrl(text, locale), { priority: "low" }).catch(() => {});
}

// Which sentence is being said: a newer one silences the one before.
let turn = 0;

// The recorded clips, one after the other. If one cannot be played, the
// phone's own voice says the whole sentence.
function playClips(audio: HTMLAudioElement, clips: readonly string[], locale: Locale, fallback: () => void) {
    const mine = ++turn;
    let index = 0;
    const fail = () => {
        if (mine !== turn) return; // a newer sentence took over: nothing went wrong
        turn++;
        fallback();
    };
    const next = () => {
        if (mine !== turn || index >= clips.length) return;
        audio.src = clipUrl(clips[index++], locale);
        audio.play().catch(fail);
    };
    audio.onended = next;
    audio.onerror = fail;
    audio.pause();
    next();
}

export function speak(text: string, locale: Locale, clips?: readonly string[]) {
    if (typeof window === "undefined") return;
    const spoken = forSpeech(text, locale);
    if (player && recorded(clips)) return playClips(player, clips, locale, () => speakOnDevice(spoken, locale));
    if (!serverVoice || !player) {
        stopSpeaking();
        return speakOnDevice(spoken, locale);
    }

    const audio = player;
    const mine = ++turn;
    const fallback = () => {
        if (mine !== turn) return;
        turn++;
        speakOnDevice(spoken, locale);
    };
    audio.onended = null;
    audio.onerror = fallback;
    audio.pause();
    audio.src = ttsUrl(text, locale);
    audio.play().catch(fallback);
}

export function stopSpeaking() {
    turn++;
    player?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
