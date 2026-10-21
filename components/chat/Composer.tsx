"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, Camera, MapPin, Mic, Plus, SendHorizontal, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PeopleWords } from "@/lib/i18n/people";
import type { Shown } from "./Bubble";
import { clock, previewOf } from "./format";

// Where one writes: the text, what can be attached (a photo, a place, an
// "on y va ?"), and the microphone for a voice note, as on WhatsApp.

type Words = PeopleWords["chat"];
const MAX_SECONDS = 180;
// What the phone can record, best first (Android: WebM/Opus, iPhone: MP4/AAC).
const RECORDING_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus", "audio/aac"];

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
    onVoice: (voice: Blob, seconds: number) => void;
    onTrouble: (message: string) => void;
}) {
    const [text, setText] = useState("");
    const [menu, setMenu] = useState(false);
    const [recording, setRecording] = useState<{ started: number } | null>(null);
    const [now, setNow] = useState(0);
    const field = useRef<HTMLTextAreaElement>(null);
    const picker = useRef<HTMLInputElement>(null);
    const recorder = useRef<MediaRecorder | null>(null);
    const chunks = useRef<Blob[]>([]);
    const keep = useRef(true);

    // The field grows with the text, up to five lines.
    useEffect(() => {
        const element = field.current;
        if (!element) return;
        element.style.height = "auto";
        element.style.height = `${Math.min(element.scrollHeight, 132)}px`;
    }, [text]);

    useEffect(() => {
        if (!recording) return;
        const timer = window.setInterval(() => {
            setNow(Date.now());
            if (Date.now() - recording.started > MAX_SECONDS * 1000) recorder.current?.stop();
        }, 250);
        return () => window.clearInterval(timer);
    }, [recording]);

    const send = () => {
        const value = text.trim();
        if (!value) return;
        onText(value);
        setText("");
        field.current?.focus();
    };

    const startRecording = async () => {
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
        keep.current = true;
        const started = Date.now();
        media.ondataavailable = (event) => {
            if (event.data.size) chunks.current.push(event.data);
        };
        media.onstop = () => {
            stream.getTracks().forEach((track) => track.stop());
            setRecording(null);
            const seconds = (Date.now() - started) / 1000;
            if (!keep.current || seconds < 0.8 || !chunks.current.length) return;
            onVoice(new Blob(chunks.current, { type: (media.mimeType || type || "audio/webm").split(";")[0] }), Math.min(seconds, MAX_SECONDS));
        };
        recorder.current = media;
        media.start(250);
        setNow(started);
        setRecording({ started });
    };

    const stopRecording = (send: boolean) => {
        keep.current = send;
        recorder.current?.stop();
    };

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

            {reply && (
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

            {recording ? (
                <div className="flex h-12 items-center gap-3 px-1">
                    <button type="button" onClick={() => stopRecording(false)} aria-label={words.voice.cancel} className="grid h-11 w-11 place-items-center rounded-full text-closed">
                        <Trash2 size={20} />
                    </button>
                    <span className="flex flex-1 items-center gap-2 font-semibold">
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-closed" />
                        {words.voice.recording} {clock((now - recording.started) / 1000)}
                    </span>
                    <button type="button" onClick={() => stopRecording(true)} aria-label={words.voice.send} className="grid h-12 w-12 place-items-center rounded-full bg-[#1faa59] text-white">
                        <SendHorizontal size={20} />
                    </button>
                </div>
            ) : (
                <div className="flex items-end gap-1.5">
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
                    {text.trim() ? (
                        <button type="button" onClick={send} aria-label={words.send} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#1faa59] text-white shadow active:scale-95">
                            <SendHorizontal size={20} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={canMedia ? startRecording : () => onTrouble(words.request.media)}
                            aria-label={words.voice.record}
                            className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-white shadow active:scale-95 ${canMedia ? "bg-[#1faa59]" : "bg-[#1faa59]/40"}`}
                        >
                            <Mic size={20} />
                        </button>
                    )}
                </div>
            )}
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
