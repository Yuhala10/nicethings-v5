// The names of NiceThings' outing soundtracks, for the server and the
// browser alike (the music itself is played by lib/soundtracks.ts, in the
// browser only: a server cannot call into a "use client" file).

export const SOUNDS = ["makossa", "bikutsi", "afro", "chill", "soiree"] as const;
export type Sound = (typeof SOUNDS)[number];
export const isSound = (value: unknown): value is Sound => typeof value === "string" && (SOUNDS as readonly string[]).includes(value);
