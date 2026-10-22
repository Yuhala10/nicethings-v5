"use client";

import { useRef, useState } from "react";
import { EyeOff, MessageCircle, Play, Plus, Trash2, Upload } from "lucide-react";
import { useTr } from "@/components/admin/i18n";
import { Empty, PageHeader, Skeleton, timeAgo, useAdminData, useAdminToast } from "@/components/admin/ui";
import { adminPatch, adminPost } from "@/lib/admin-client";
import { put } from "@/lib/media-upload";
import type { Person } from "@/lib/people/types";
import { MAX_SONG_BYTES, SONG_GENRES, SONG_LICENCES, SONG_TYPES } from "@/lib/song-rules";

// The song library (script 016): what artists sent waits here to be
// listened to, given the second its best part starts (the chorus), then put
// online. The team also adds songs NiceThings may use: Pixabay, Creative
// Commons BY (with their credit), or an artist's own sent another way.

type Song = {
    id: string;
    title: string;
    artist: string;
    genre: string;
    url: string;
    start_at: number;
    licence: string;
    licence_note: string | null;
    source_url: string | null;
    link: string | null;
    status: "PENDING" | "LIVE" | "HIDDEN";
    contact: string | null;
    uses: number;
    created_at: string;
    person: Person | null;
};

const LICENCE: Record<string, [string, string]> = {
    artist: ["Envoyée par l'artiste", "Sent by the artist"],
    cc_by: ["Creative Commons BY", "Creative Commons BY"],
    pixabay: ["Pixabay", "Pixabay"],
};

function SongCard({ song, busy, onStatus, onStart, onDelete }: { song: Song; busy: boolean; onStatus: (status: Song["status"]) => void; onStart: (seconds: number) => void; onDelete: () => void }) {
    const tr = useTr();
    const player = useRef<HTMLAudioElement>(null);
    const [start, setStart] = useState(String(Math.round(song.start_at)));
    const phone = (song.contact ?? "").replace(/\D/g, "");
    return (
        <li className="a-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-[1rem] font-bold">{song.title}</p>
                    <p className="truncate text-[0.875rem] text-muted">
                        {song.artist} · {song.genre} · {tr(...(LICENCE[song.licence] ?? ["", ""]))}
                        {song.licence_note ? ` (${song.licence_note})` : ""}
                    </p>
                    <p className="mt-0.5 text-[0.75rem] text-muted">
                        {song.person ? `@${song.person.handle} · ` : ""}
                        {timeAgo(song.created_at)} · {song.uses} {tr("sortie(s)", "outing(s)")}
                    </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                    {phone && (
                        <a href={`https://wa.me/${phone.length === 9 ? `237${phone}` : phone}`} target="_blank" rel="noopener noreferrer" className="a-btn a-btn-soft" aria-label="WhatsApp">
                            <MessageCircle size={15} />
                        </a>
                    )}
                    {song.source_url && (
                        <a href={song.source_url} target="_blank" rel="noopener noreferrer" className="a-btn a-btn-soft text-[0.75rem]">
                            {tr("Source", "Source")}
                        </a>
                    )}
                </div>
            </div>
            <audio ref={player} src={song.url} controls preload="none" className="mt-3 w-full" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-[0.8125rem] font-semibold">
                    {tr("Le meilleur moment commence à", "Best part starts at")}
                    <input value={start} onChange={(event) => setStart(event.target.value.replace(/[^\d.]/g, "").slice(0, 6))} inputMode="decimal" className="a-input w-20" /> s
                </label>
                <button
                    type="button"
                    className="a-btn a-btn-soft"
                    onClick={() => {
                        const audio = player.current;
                        if (!audio) return;
                        audio.currentTime = Number(start) || 0;
                        void audio.play();
                    }}
                >
                    <Play size={14} /> {tr("Écouter d'ici", "Play from here")}
                </button>
                {Number(start) !== Math.round(song.start_at) && (
                    <button type="button" className="a-btn a-btn-soft" disabled={busy} onClick={() => onStart(Number(start) || 0)}>
                        {tr("Garder", "Keep")}
                    </button>
                )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                {song.status !== "LIVE" && (
                    <button type="button" className="a-btn a-btn-primary" disabled={busy} onClick={() => onStatus("LIVE")}>
                        {tr("Mettre en ligne", "Put online")}
                    </button>
                )}
                {song.status !== "HIDDEN" && (
                    <button type="button" className="a-btn a-btn-soft" disabled={busy} onClick={() => onStatus("HIDDEN")}>
                        <EyeOff size={14} /> {tr("Cacher", "Hide")}
                    </button>
                )}
                <button type="button" className="a-btn a-btn-danger" disabled={busy} onClick={onDelete}>
                    <Trash2 size={14} /> {tr("Supprimer", "Delete")}
                </button>
            </div>
        </li>
    );
}

function AddSong({ onAdded }: { onAdded: () => void }) {
    const tr = useTr();
    const toast = useAdminToast();
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [fields, setFields] = useState({ title: "", artist: "", genre: "afro", licence: "pixabay", licence_note: "", source_url: "", link: "", start_at: "0" });
    const [progress, setProgress] = useState<number | null>(null);
    const set = (key: keyof typeof fields) => (event: { target: { value: string } }) => setFields((now) => ({ ...now, [key]: event.target.value }));

    const add = async () => {
        const type = file ? (SONG_TYPES[file.type] ? file.type : /\.mp3$/i.test(file.name) ? "audio/mpeg" : "") : "";
        if (!file || !type || !fields.title.trim() || !fields.artist.trim()) return toast(tr("Il faut le fichier (MP3/M4A), le titre et l'artiste.", "The file (MP3/M4A), title and artist are needed."), true);
        if (file.size > MAX_SONG_BYTES) return toast(tr("Plus de 15 Mo.", "Over 15 MB."), true);
        if (fields.licence !== "artist" && !fields.source_url.trim()) return toast(tr("Indique la page d'où vient la chanson (sa licence).", "Give the page the song comes from (its licence)."), true);
        setProgress(0);
        try {
            const made = await adminPost<{ id: string; upload: { path: string; token: string } }>("songs", { action: "create", ...fields, start_at: Number(fields.start_at) || 0, type, size: file.size });
            await put(made.upload.path, made.upload.token, file, type, setProgress, "songs");
            await adminPatch("songs", { id: made.id, status: "LIVE" });
            toast(tr("Chanson en ligne", "Song online"));
            setFile(null);
            setFields((now) => ({ ...now, title: "", artist: "", licence_note: "", source_url: "", link: "", start_at: "0" }));
            setOpen(false);
            onAdded();
        } catch (error) {
            toast((error as Error).message, true);
        }
        setProgress(null);
    };

    if (!open) {
        return (
            <button type="button" className="a-btn a-btn-primary" onClick={() => setOpen(true)}>
                <Plus size={15} /> {tr("Ajouter une chanson", "Add a song")}
            </button>
        );
    }
    return (
        <div className="a-card mb-8 p-5">
            <p className="text-[0.875rem] leading-relaxed text-muted">
                {tr(
                    "Seulement une chanson que NiceThings a le droit d'utiliser : Pixabay (pixabay.com/music, téléchargée à la main), Creative Commons BY (pas « NC »), ou envoyée par son artiste.",
                    "Only a song NiceThings may use: Pixabay (pixabay.com/music, downloaded by hand), Creative Commons BY (not “NC”), or sent by its artist.",
                )}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input type="file" accept="audio/*,.mp3,.m4a" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="a-input md:col-span-2" />
                <input value={fields.title} onChange={set("title")} placeholder={tr("Titre", "Title")} className="a-input" />
                <input value={fields.artist} onChange={set("artist")} placeholder={tr("Artiste (et featurings)", "Artist (and featurings)")} className="a-input" />
                <select value={fields.genre} onChange={set("genre")} className="a-input">
                    {SONG_GENRES.map((genre) => (
                        <option key={genre} value={genre}>
                            {genre}
                        </option>
                    ))}
                </select>
                <select value={fields.licence} onChange={set("licence")} className="a-input">
                    {SONG_LICENCES.map((licence) => (
                        <option key={licence} value={licence}>
                            {tr(...LICENCE[licence])}
                        </option>
                    ))}
                </select>
                <input value={fields.licence_note} onChange={set("licence_note")} placeholder={tr("Ligne de licence (ex. CC BY 4.0)", "Licence line (e.g. CC BY 4.0)")} className="a-input" />
                <input value={fields.source_url} onChange={set("source_url")} placeholder={tr("Page d'origine (licence)", "Source page (licence)")} className="a-input" />
                <input value={fields.link} onChange={set("link")} placeholder={tr("Où l'écouter en entier (facultatif)", "Where to hear it in full (optional)")} className="a-input" />
                <input value={fields.start_at} onChange={set("start_at")} inputMode="decimal" placeholder={tr("Meilleur moment (s)", "Best part (s)")} className="a-input" />
            </div>
            <div className="mt-4 flex gap-2">
                <button type="button" className="a-btn a-btn-primary" disabled={progress !== null} onClick={add}>
                    <Upload size={15} /> {progress !== null ? `${Math.round(progress * 100)} %` : tr("Envoyer et mettre en ligne", "Upload and put online")}
                </button>
                <button type="button" className="a-btn a-btn-soft" onClick={() => setOpen(false)}>
                    {tr("Annuler", "Cancel")}
                </button>
            </div>
        </div>
    );
}

export default function MusicPage() {
    const tr = useTr();
    const toast = useAdminToast();
    const [busy, setBusy] = useState<string | null>(null);
    const songs = useAdminData<{ setup: boolean; songs: Song[] }>("songs");
    const list = songs.data?.songs ?? [];

    const run = async (song: Song, work: () => Promise<unknown>, done: string) => {
        setBusy(song.id);
        try {
            await work();
            toast(done);
            await songs.reload();
        } catch (error) {
            toast((error as Error).message, true);
        }
        setBusy(null);
    };

    const sections: [Song["status"], string][] = [
        ["PENDING", tr("À écouter", "To listen to")],
        ["LIVE", tr("En ligne", "Online")],
        ["HIDDEN", tr("Cachées", "Hidden")],
    ];

    return (
        <div>
            <PageHeader
                title={tr("Musique", "Music")}
                subtitle={tr("Les chansons que les membres mettent sur leurs sorties. Écoute chaque chanson envoyée avant de la mettre en ligne.", "The songs members put on their outings. Listen to every song sent before putting it online.")}
                actions={songs.data && !songs.data.setup ? <AddSong onAdded={() => void songs.reload()} /> : null}
            />
            {songs.loading && !songs.data ? (
                <Skeleton className="h-40" />
            ) : songs.data?.setup ? (
                <Empty title={tr("Lance le script 016", "Run script 016")} body={tr("database/migrations/016_songs.sql dans l'éditeur SQL de Supabase.", "database/migrations/016_songs.sql in the Supabase SQL editor.")} />
            ) : !list.length ? (
                <Empty title={tr("Pas encore de chanson", "No song yet")} />
            ) : (
                sections.map(([status, title]) => {
                    const here = list.filter((song) => song.status === status);
                    if (!here.length) return null;
                    return (
                        <section key={status} className="mb-8">
                            <h2 className="mb-3 text-[1rem] font-bold">
                                {title} <span className="text-muted">({here.length})</span>
                            </h2>
                            <ul className="grid gap-3 lg:grid-cols-2">
                                {here.map((song) => (
                                    <SongCard
                                        key={song.id}
                                        song={song}
                                        busy={busy === song.id}
                                        onStatus={(next) => run(song, () => adminPatch("songs", { id: song.id, status: next }), next === "LIVE" ? tr("En ligne", "Online") : tr("Cachée", "Hidden"))}
                                        onStart={(seconds) => run(song, () => adminPatch("songs", { id: song.id, start_at: seconds }), tr("Gardé", "Kept"))}
                                        onDelete={() => {
                                            if (!window.confirm(tr("Supprimer cette chanson (et son fichier) ?", "Delete this song (and its file)?"))) return;
                                            void run(song, () => adminPost("songs", { action: "delete", id: song.id }), tr("Supprimée", "Deleted"));
                                        }}
                                    />
                                ))}
                            </ul>
                        </section>
                    );
                })
            )}
        </div>
    );
}
