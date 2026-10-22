// The rules of NiceThings' song library (script 016), for the server and the
// browser alike (lib/songs.ts reads the database).

export const SONG_GENRES = ["afro", "makossa", "bikutsi", "coupe_decale", "amapiano", "ndombolo", "rap", "rnb", "gospel", "reggae", "dance", "funk", "chill", "other"] as const;
export type SongGenre = (typeof SONG_GENRES)[number];
export const SONG_LICENCES = ["artist", "cc_by", "pixabay"] as const;
export const SONG_TYPES: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/aac": "aac",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/webm": "webm",
};
export const MAX_SONG_BYTES = 15 * 1024 * 1024;
// Songs one member may send in a day.
export const SONGS_PER_DAY = 3;
// How much of a song an outing plays, from its best part.
export const SONG_CLIP_SECONDS = 75;
