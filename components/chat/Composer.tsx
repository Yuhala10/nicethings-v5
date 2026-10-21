"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, Camera, ChevronLeft, Lock, MapPin, Mic, Plus, SendHorizontal, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PeopleWords } from "@/lib/i18n/people";
import type { Shown } from "./Bubble";
import { clock, previewOf } from "./format";

// Where one writes: the text, what can be attached (a photo, a place, an
// "on y va ?"), and the microphone, as on WhatsApp: hold it to record and
// let go to send; slide left to cancel; slide up to lock it and talk with
// the hands free (a simple tap also records hands free). The voice's shape
// is drawn while it is recorded, and sent with it.

type Words = PeopleWords["chat"];
const MAX_SECONDS = 180;
// What the phone can record, best first (Android: WebM/Opus, iPhone: MP4/AAC).
const RECORDING_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus", "audio/aac"];
const CANCEL_AT = -90; // px to the left
const LOCK_AT = -70; // px up

type Recording = { started: number; locked: boolean; dx: number; dy: number };

function Choice({ icon: Icon, label, tone, disabled = false, onClick }: { icon: typeof Camera; label: string; tone: string; disabled?: boolean; onClick: () => void }) {
    return (
        <button type="button" disabled={disabled} onClick={onClick} className="flex w-20 flex-col items-center gap-1.5 text-[0.75rem] font-semibold disabled:opacity-35">
            <span className={`grid h-12 w-12 place-items-center rounded-full text-white ${tone}`}>
                <Icon size={20} />
            </span>
            {label}
        </button>
    );
}

// The last few seconds of the voice, as bars moving to the left.
function LiveBars({ levels }: { levels: number[] }) {
    const shown = levels.slice(-34);
    return (
        <span className="flex h-7 min-w-0 flex-1 items-center justify-end gap-[2px] overflow-hidden">
            {shown.map((level, index) => (
                <span key={index} className="w-[3px] shrink-0 rounded-full bg-[#1faa59]" style={{ height: `${Math.max(3, Math.round(level * 26))}px` }} />
            ))}
        </span>
    );
}

export default function Composer({
    words,
    reply,
    replyName,
    canMedia,
    onCancelReply,
    onText,
    onTyping,
    onPhoto,
    onPlace,
    onPlan,
    onVoice,
    onTrouble,
}: {
    words: Words;
    reply: Shown | null;
    replyName: string;
    canMedia: boolean;
    onCancelReply: () => void;
    onText: (text: string) => void;
    onTyping: () => void;
    onPhoto: (file: File) => void;
    onPlace: () => void;
    onPlan: () => void;
    onVoice: (voice: Blob, seconds: number, waveform: number[]) => void;
    onTrouble: (message: string) => void;
}) {
    const [text, setText] = useState("");
    const [menu, setMenu] = useState(false);
    const [recording, setRecording] = useState<Recording | null>(null);
    const [now, setNow] = useState(0);
    const [levels, setLevels] = useState<number[]>([]);
    const field = useRef<HTMLTextAreaElement>(null);
    const picker = useRef<HTMLInputElement>(null);
    const recorder = useRef<MediaRecorder | null>(null);
    const chunks = useRef<Blob[]>([]);
    const keep = useRef(true);
    const all = useRef<number[]>([]);
    const meter = useRef<{ context: AudioContext; timer: number } | null>(null);
    // The finger: where it went down, whether it is still down.
    const finger = useRef<{ x: number; y: number; down: boolean; at: number } | null>(null);
    const live = useRef<Recording | null>(null);

    useEffect(() => {
        const element = field.current;
        if (!element) return;
        element.style.height = "auto";
        element.style.height = `${Math.min(element.scrollHeight, 132)}px`;
    }, [text]);

    // Replying (a swipe or the menu): the keyboard opens, as on WhatsApp.
    useEffect(() => {
        if (reply) field.current?.focus();
    }, [reply]);

    useEffect(() => {
        if (!recording) return;
        const timer = window.setInterval(() => {
            setNow(Date.now());
            if (Date.now() - recording.started > MAX_SECONDS * 1000) stop(true);
        }, 200);
        return () => window.clearInterval(timer);
    });

    const setRec = (next: Recording | null) => {
        live.current = next;
        setRecording(next);
    };

    const send = () => {
        const value = text.trim();
        if (!value) return;
        onText(value);
        setText("");
        field.current?.focus();
    };

    const start = async () => {
        if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return onTrouble(words.voice.unsupported);
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        } catch {
            return onTrouble(words.voice.denied);
        }
        const type = RECORDING_TYPES.find((candidate) => MediaRecorder.isTypeSupported?.(candidate));
        const media = type ? new MediaRecorder(stream, { mimeType: type, audioBitsPerSecond: 32_000 }) : new MediaRecorder(stream);
        chunks.current = [];
        all.current = [];
        keep.current = true;
        const started = Date.now();
        // The voice's loudness, ten times a second, for the bars.
        try {
            const context = new AudioContext();
            const analyser = context.createAnalyser();
            analyser.fftSize = 512;
            context.createMediaStreamSource(stream).connect(analyser);
            const data = new Uint8Array(analyser.fftSize);
            const timer = window.setInterval(() => {
                analyser.getByteTimeDomainData(data);
                let sum = 0;
                for (const value of data) sum += ((value - 128) / 128) ** 2;
                const level = Math.min(1, Math.sqrt(sum / data.length) * 4);
                all.current.push(level);
                setLevels(all.current.slice(-34));
            }, 100);
            meter.current = { context, timer };
        } catch {}
        media.ondataavailable = (event) => {
            if (event.data.size) chunks.current.push(event.data);
        };
        media.onstop = () => {
            stream.getTracks().forEach((track) => track.stop());
            if (meter.current) {
                window.clearInterval(meter.current.timer);
                meter.current.context.close().catch(() => {});
                meter.current = null;
            }
            setRec(null);
            setLevels([]);
            const seconds = (Date.now() - started) / 1000;
            if (!keep.current || seconds < 0.8 || !chunks.current.length) return;
            // The shape on 48 bars, 0 to 31.
            const source = all.current.length ? all.current : [0];
            const peak = Math.max(0.05, ...source);
            const waveform = Array.from({ length: 48 }, (_, index) => {
                const from = Math.floor((index / 48) * source.length);
                const to = Math.max(from + 1, Math.floor(((index + 1) / 48) * source.length));
                const slice = source.slice(from, to);
                return Math.round((Math.max(...slice) / peak) * 31);
            });
            onVoice(new Blob(chunks.current, { type: (media.mimeType || type || "audio/webm").split(";")[0] }), Math.min(seconds, MAX_SECONDS), waveform);
        };
        recorder.current = media;
        media.start(250);
        setNow(started);
        // A finger already lifted (the microphone permission was asked): hands free.
        setRec({ started, locked: !finger.current?.down, dx: 0, dy: 0 });
        navigator.vibrate?.(20);
    };

    const stop = (sendIt: boolean) => {
        keep.current = sendIt;
        if (recorder.current?.state === "recording") recorder.current.stop();
        else setRec(null);
    };

    // ---- the microphone's gestures
    const down = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (!canMedia) return onTrouble(words.request.media);
        event.currentTarget.setPointerCapture?.(event.pointerId);
        finger.current = { x: event.clientX, y: event.clientY, down: true, at: Date.now() };
        start();
    };
    const move = (event: React.PointerEvent<HTMLButtonElement>) => {
        const rec = live.current;
        if (!finger.current?.down || !rec || rec.locked) return;
        const dx = Math.min(0, event.clientX - finger.current.x);
        const dy = Math.min(0, event.clientY - finger.current.y);
        if (dx < CANCEL_AT) {
            finger.current.down = false;
            navigator.vibrate?.([15, 40, 15]);
            return stop(false);
        }
        if (dy < LOCK_AT) {
            navigator.vibrate?.(20);
            return setRec({ ...rec, locked: true, dx: 0, dy: 0 });
        }
        setRec({ ...rec, dx, dy });
    };
    const up = () => {
        if (!finger.current) return;
        const quick = Date.now() - finger.current.at < 350;
        finger.current.down = false;
        const rec = live.current;
        if (!rec) return;
        if (rec.locked) return;
        // A quick tap: hands free; a hold let go: sent.
        if (quick) return setRec({ ...rec, locked: true, dx: 0, dy: 0 });
        stop(true);
    };

    const seconds = recording ? (now - recording.started) / 1000 : 0;

    return (
        <div className="relative border-t border-line bg-bg/95 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur">
            <AnimatePresence>
                {menu && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        className="absolute bottom-full left-2 mb-2 grid grid-cols-3 gap-2 rounded-[1.4rem] border border-line bg-surface p-3 shadow-float"
                    >
                        <Choice icon={Camera} label={words.attach.photo} tone="bg-[#7048e8]" disabled={!canMedia} onClick={() => (setMenu(false), picker.current?.click())} />
                        <Choice icon={MapPin} label={words.attach.place} tone="bg-[#1faa59]" onClick={() => (setMenu(false), onPlace())} />
                        <Choice icon={CalendarClock} label={words.attach.plan} tone="bg-[#e8590c]" onClick={() => (setMenu(false), onPlan())} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Holding: the lock waits above the finger. */}
            <AnimatePresence>
                {recording && !recording.locked && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: Math.max(-30, recording.dy / 2) }}
                        exit={{ opacity: 0 }}
                        className="pointer-events-none absolute right-3 bottom-[calc(100%+0.5rem)] flex h-20 w-11 flex-col items-center justify-start gap-1 rounded-full border border-line bg-surface pt-3 shadow-float"
                    >
                        <Lock size={17} className="text-text-2" />
                        <ChevronLeft size={16} className="rotate-90 text-muted" />
                    </motion.div>
                )}
            </AnimatePresence>

            {reply && !recording && (
                <div className="mx-1 mb-2 flex items-center gap-2 rounded-xl border-l-4 border-[#1faa59] bg-surface-2 px-3 py-2">
                    <span className="min-w-0 flex-1">
                        <span className="block text-[0.8rem] font-bold text-[#1faa59]">{reply.mine ? words.you : replyName}</span>
                        <span className="block truncate text-[0.8rem] text-text-2">{previewOf(reply.kind, reply.body, words, reply.place?.name)}</span>
                    </span>
                    <button type="button" onClick={onCancelReply} aria-label={words.voice.cancel} className="grid h-9 w-9 place-items-center rounded-full">
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="flex items-end gap-1.5">
                {recording ? (
                    recording.locked ? (
                        <div className="flex h-12 min-w-0 flex-1 items-center gap-2 px-1">
                            <button type="button" onClick={() => stop(false)} aria-label={words.voice.cancel} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-closed">
                                <Trash2 size={20} />
                            </button>
                            <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-closed" />
                            <span className="w-11 shrink-0 text-[0.95rem] font-semibold tabular-nums">{clock(seconds)}</span>
                            <LiveBars levels={levels} />
                        </div>
                    ) : (
                        <div className="flex h-12 min-w-0 flex-1 items-center gap-2 px-2" style={{ transform: `translateX(${recording.dx * 0.4}px)` }}>
                            <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-closed" />
                            <span className="w-11 shrink-0 text-[0.95rem] font-semibold tabular-nums">{clock(seconds)}</span>
                            <span className="flex min-w-0 flex-1 items-center justify-center gap-1 truncate text-[0.875rem] text-muted" style={{ opacity: 1 + recording.dx / 140 }}>
                                <ChevronLeft size={16} />
                                {words.voice.slide}
                            </span>
                        </div>
                    )
                ) : (
                    <>
                        <button type="button" onClick={() => setMenu(!menu)} aria-label={words.attach.open} aria-expanded={menu} className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-text-2 transition ${menu ? "rotate-45" : ""}`}>
                            <Plus size={24} />
                        </button>
                        <textarea
                            ref={field}
                            rows={1}
                            value={text}
                            maxLength={2000}
                            onChange={(event) => {
                                setText(event.target.value);
                                onTyping();
                            }}
                            onKeyDown={(event) => {
                                // Enter sends on a computer; on a phone the key makes a new line.
                                if (event.key === "Enter" && !event.shiftKey && window.matchMedia("(pointer: fine)").matches) {
                                    event.preventDefault();
                                    send();
                                }
                            }}
                            placeholder={words.placeholder}
                            aria-label={words.placeholder}
                            className="max-h-[132px] min-h-12 flex-1 resize-none rounded-[1.5rem] border border-line bg-surface px-4 py-3 text-[1rem] leading-snug outline-none focus:border-line-strong"
                        />
                    </>
                )}
                {text.trim() && !recording ? (
                    <button type="button" onClick={send} aria-label={words.send} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#1faa59] text-white shadow active:scale-95">
                        <SendHorizontal size={20} />
                    </button>
                ) : recording?.locked ? (
                    <button type="button" onClick={() => stop(true)} aria-label={words.voice.send} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#1faa59] text-white shadow active:scale-95">
                        <SendHorizontal size={20} />
                    </button>
                ) : (
                    <button
                        type="button"
                        onPointerDown={down}
                        onPointerMove={move}
                        onPointerUp={up}
                        onPointerCancel={up}
                        onContextMenu={(event) => event.preventDefault()}
                        aria-label={words.voice.record}
                        className={`grid shrink-0 touch-none place-items-center rounded-full text-white shadow transition-all select-none ${recording ? "h-16 w-16 -translate-y-2 bg-closed" : "h-12 w-12"} ${!recording ? (canMedia ? "bg-[#1faa59]" : "bg-[#1faa59]/40") : ""}`}
                    >
                        <Mic size={recording ? 26 : 20} />
                    </button>
                )}
            </div>
            {!recording && <p className="sr-only">{words.voice.hint}</p>}
            <input
                ref={picker}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onPhoto(file);
                    event.target.value = "";
                }}
            />
        </div>
    );
}
