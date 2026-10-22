"use client";

import { CheckCircle2, FileAudio, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { fill } from "@/lib/i18n";
import { put } from "@/lib/media-upload";
import { call, useMe, withMe } from "@/lib/people/client";
import { MAX_SONG_BYTES, SONG_GENRES, SONG_TYPES } from "@/lib/song-rules";
import { useLocale } from "../site/LocaleProvider";
import { displayName } from "./Person";

// "Envoyer ma chanson": an artist (signed in) sends a song for the library.
// The file goes straight from the phone to storage; the team listens to it
// and answers on WhatsApp.

// Some phones give an MP3 no type, or an old one: read it from the name.
const typeOf = (file: File) => (SONG_TYPES[file.type] ? file.type : /\.mp3$/i.test(file.name) ? "audio/mpeg" : /\.(m4a|mp4)$/i.test(file.name) ? "audio/mp4" : /\.aac$/i.test(file.name) ? "audio/aac" : /\.wav$/i.test(file.name) ? "audio/wav" : /\.ogg$/i.test(file.name) ? "audio/ogg" : "");

export default function ArtistForm() {
    const { t } = useLocale();
    const words = t.people.songs;
    const genres = t.people.post.genres;
    const { me, ready } = useMe();
    const picker = useRef<HTMLInputElement>(null);
    const [title, setTitle] = useState("");
    const [artist, setArtist] = useState("");
    const [genre, setGenre] = useState<string>("afro");
    const [link, setLink] = useState("");
    const [contact, setContact] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [consent, setConsent] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);
    const [trouble, setTrouble] = useState("");
    const [sent, setSent] = useState(false);

    const send = async () => {
        setTrouble("");
        if (!title.trim() || !(artist.trim() || me) || !consent) return setTrouble(words.errors.fields);
        if (!file || !typeOf(file)) return setTrouble(words.errors.file);
        if (file.size > MAX_SONG_BYTES) return setTrouble(words.errors.heavy);
        if (contact.replace(/\D/g, "").length < 8) return setTrouble(words.errors.contact);
        setProgress(0);
        const type = typeOf(file);
        const answer = await call<{ id: string; upload: { path: string; token: string } }>("/api/songs", "POST", {
            title,
            artist: artist.trim() || (me ? displayName(me) : ""),
            genre,
            link,
            contact,
            consent,
            type,
            size: file.size,
        });
        if (answer.ok !== true) {
            setProgress(null);
            const why = (answer as { why?: string }).why;
            return setTrouble(why === "link" ? words.errors.link : why === "contact" ? words.errors.contact : why === "many" ? words.errors.many : why === "closed" ? words.errors.closed : why === "heavy" ? words.errors.heavy : why === "media" ? words.errors.file : words.errors.failed);
        }
        try {
            await put(answer.upload.path, answer.upload.token, file, type, setProgress, "songs");
            setSent(true);
        } catch {
            setTrouble(words.errors.failed);
        }
        setProgress(null);
    };

    if (sent) {
        return (
            <div className="rounded-[1.6rem] border border-line bg-surface p-6 text-center md:p-8">
                <CheckCircle2 size={40} className="mx-auto text-open" />
                <p className="mt-3 text-[1.125rem] font-bold">{words.sent}</p>
                <button
                    type="button"
                    onClick={() => {
                        setSent(false);
                        setTitle("");
                        setFile(null);
                        setConsent(false);
                    }}
                    className="nt-btn mt-5 border border-line bg-surface"
                >
                    {words.another}
                </button>
            </div>
        );
    }

    if (ready && !me) {
        return (
            <div className="rounded-[1.6rem] border border-line bg-surface p-6 md:p-8">
                <p className="text-[1rem] leading-relaxed">{words.signIn}</p>
                <button type="button" onClick={() => withMe("generic", () => {})} className="nt-btn nt-btn-primary mt-4 w-full">
                    {words.formTitle}
                </button>
            </div>
        );
    }

    const label = "mb-2 block text-[0.875rem] font-semibold";
    return (
        <div className="rounded-[1.6rem] border border-line bg-surface p-5 md:p-8">
            <label htmlFor="song-title" className={label}>
                {words.songTitle}
            </label>
            <input id="song-title" value={title} onChange={(event) => setTitle(event.target.value.slice(0, 120))} className="nt-input" />

            <label htmlFor="song-artist" className={`${label} mt-5`}>
                {words.artist}
            </label>
            <input id="song-artist" value={artist} onChange={(event) => setArtist(event.target.value.slice(0, 160))} placeholder={me ? displayName(me) : ""} className="nt-input" />

            <p className={`${label} mt-5`}>{words.genre}</p>
            <div className="flex flex-wrap gap-2">
                {SONG_GENRES.map((key) => (
                    <button key={key} type="button" aria-pressed={genre === key} onClick={() => setGenre(key)} className="nt-chip h-9 text-[0.875rem]">
                        {genres[key]}
                    </button>
                ))}
            </div>

            <p className={`${label} mt-5`}>{words.file}</p>
            <button type="button" onClick={() => picker.current?.click()} className="flex w-full items-center gap-3 rounded-[1rem] border-2 border-dashed border-line-strong p-3.5 text-left transition hover:border-text-2">
                <span className="nt-sunset grid h-11 w-11 shrink-0 place-items-center rounded-[0.8rem] text-white">
                    <FileAudio size={20} />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-semibold">{file ? file.name : words.choose}</span>
                    <span className="block text-[0.75rem] text-muted">{file ? `${(file.size / 1048576).toFixed(1)} Mo` : words.fileHint}</span>
                </span>
            </button>
            <input ref={picker} type="file" accept="audio/*,.mp3,.m4a" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />

            <label htmlFor="song-link" className={`${label} mt-5`}>
                {words.link}
            </label>
            <input id="song-link" value={link} onChange={(event) => setLink(event.target.value.slice(0, 300))} placeholder={words.linkHint} inputMode="url" className="nt-input" />

            <label htmlFor="song-contact" className={`${label} mt-5`}>
                {words.contact}
            </label>
            <input id="song-contact" value={contact} onChange={(event) => setContact(event.target.value.slice(0, 30))} inputMode="tel" placeholder="6 XX XX XX XX" className="nt-input max-w-[16rem]" />
            <p className="mt-1.5 text-[0.75rem] text-muted">{words.contactHint}</p>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-[1rem] bg-surface-2 p-3.5">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#d9572b]" />
                <span className="text-[0.875rem] leading-relaxed">{words.consent}</span>
            </label>

            {progress !== null && (
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                    <div className="nt-sunset h-full rounded-full transition-[width] duration-200" style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }} />
                </div>
            )}
            {trouble && (
                <p role="alert" className="mt-3 text-[0.875rem] font-semibold text-closed">
                    {trouble}
                </p>
            )}
            <button type="button" onClick={send} disabled={progress !== null} className="nt-btn nt-btn-primary mt-5 w-full disabled:opacity-60">
                {progress !== null ? (
                    <>
                        <Loader2 size={17} className="animate-spin" />
                        {fill(words.sending, { percent: Math.round(progress * 100) })}
                    </>
                ) : (
                    words.send
                )}
            </button>
        </div>
    );
}
