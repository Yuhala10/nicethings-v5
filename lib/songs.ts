import { unstable_cache } from "next/cache";
import { notInstalled } from "@/lib/atlas/store";
import type { SongView } from "@/lib/people/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// NiceThings' library of real songs (script 016), for outings, like on
// TikTok. Only songs NiceThings may use: sent by their artist (who confirm
// it is theirs), or under a licence that allows it (Creative Commons BY,
// Pixabay), each with its credit. The team listens to each one first.

export const SONG_BUCKET = "songs";
export { MAX_SONG_BYTES, SONG_GENRES, SONG_LICENCES, SONG_TYPES, SONGS_PER_DAY } from "./song-rules";

export const songUrl = (path: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${SONG_BUCKET}/${path}`;

const COLUMNS = "id,title,artist,genre,file_path,start_at,link,licence,licence_note,source_url";
type Row = { id: string; title: string; artist: string; genre: string; file_path: string; start_at: number; link: string | null; licence: string; licence_note: string | null; source_url: string | null };

const toSong = (row: Row): SongView => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    genre: row.genre,
    url: songUrl(row.file_path),
    start: Number(row.start_at) || 0,
    link: row.link,
    credit: row.licence === "artist" ? null : (row.licence_note ?? (row.licence === "pixabay" ? "Pixabay" : "CC BY")),
    source: row.source_url,
});

// The songs one can choose, the most used first; null before script 016.
const library = unstable_cache(
    async () => {
        const { data, error } = await getSupabaseAdminClient().from("nt_songs").select(COLUMNS).eq("status", "LIVE").order("uses", { ascending: false }).order("created_at", { ascending: false }).limit(300);
        // Not kept while the table is missing, so the library opens as soon as 016 is run.
        if (error) throw error;
        return ((data ?? []) as Row[]).map(toSong);
    },
    ["songs:v1"],
    { revalidate: 120, tags: ["songs"] },
);

export async function loadLibrary(): Promise<SongView[] | null> {
    try {
        return await library();
    } catch (error) {
        if (notInstalled(error)) return null;
        throw error;
    }
}

// The songs of some outings (any status: a song taken down later stays on
// the outings that have it only while it is LIVE).
export async function songsByIds(ids: string[]): Promise<Map<string, SongView>> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return new Map();
    const { data, error } = await getSupabaseAdminClient().from("nt_songs").select(COLUMNS).in("id", unique).eq("status", "LIVE");
    if (error) return new Map();
    return new Map(((data ?? []) as Row[]).map((row) => [row.id, toSong(row)]));
}

// A song one may put on an outing now, or null.
export async function liveSong(id: unknown): Promise<SongView | null> {
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return null;
    return (await songsByIds([id])).get(id) ?? null;
}

// One more outing with it (the artists see how far their song goes).
export async function countUse(id: string) {
    const db = getSupabaseAdminClient();
    const read = await db.from("nt_songs").select("uses").eq("id", id).maybeSingle();
    if (read.data) await db.from("nt_songs").update({ uses: (Number(read.data.uses) || 0) + 1 }).eq("id", id);
}

// With script 016, an outing's song. Until it is run, asked again every
// minute, so songs switch on by themselves once it is.
let songColumn: { check: Promise<boolean>; at: number; yes: boolean } | null = null;
export function hasOutingSong() {
    if (!songColumn || (!songColumn.yes && Date.now() - songColumn.at > 60_000)) {
        const entry = { check: Promise.resolve(false), at: Date.now(), yes: false };
        entry.check = Promise.resolve(getSupabaseAdminClient().from("nt_outings").select("song_id").limit(1)).then((read) => (entry.yes = !read.error));
        songColumn = entry;
    }
    return songColumn.check;
}
