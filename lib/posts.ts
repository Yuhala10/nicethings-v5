// The wall of a place: photos and short videos sent by people who were
// there. Shared by the page, the upload and the team console.
//
// A video is heavy for a phone on mobile data and for the storage the site
// lives on, so the limits are deliberate: short clips, modest files, and a
// still picture for each video so the wall shows at once and a video is
// only fetched when it comes on screen.

import type { Person } from "./people/types";

export const POST_BUCKET = "spot-posts";

export const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 45;
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // after the phone has resized it
export const MAX_CAPTION = 140;
// How many a single visitor may send in a day, approved or not.
export const POSTS_PER_DAY = 6;

// What may be sent, and the file ending it is kept under.
export const POST_TYPES: Record<string, { kind: "photo" | "video"; ext: string }> = {
    "image/jpeg": { kind: "photo", ext: "jpg" },
    "image/webp": { kind: "photo", ext: "webp" },
    "image/png": { kind: "photo", ext: "png" },
    "video/mp4": { kind: "video", ext: "mp4" },
    "video/quicktime": { kind: "video", ext: "mov" },
    "video/webm": { kind: "video", ext: "webm" },
};

export type WallPost = {
    id: string;
    kind: "photo" | "video";
    url: string;
    poster: string | null; // still picture of a video
    width: number | null;
    height: number | null;
    duration: number | null; // seconds, videos only
    caption: string | null;
    likes: number;
    comments: number;
    // Who sent it, when it was sent from a profile.
    author: Person | null;
};

export function postUrl(path: string) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${POST_BUCKET}/${path}`;
}

type Row = { id: string; kind: string; media_path: string; poster_path: string | null; width: number | null; height: number | null; duration: number | string | null; caption: string | null; likes: number | null; comments?: number | null };

export const POST_COLUMNS = "id,kind,media_path,poster_path,width,height,duration,caption,likes";
// Once profiles are open (script 011): who sent it and how many comments.
export const POST_PEOPLE_COLUMNS = `${POST_COLUMNS},comments,profile_id`;

export function toWallPost(row: Row, author: Person | null = null): WallPost {
    return {
        id: row.id,
        kind: row.kind === "video" ? "video" : "photo",
        url: postUrl(row.media_path),
        poster: row.poster_path ? postUrl(row.poster_path) : null,
        width: row.width ?? null,
        height: row.height ?? null,
        duration: row.duration == null ? null : Number(row.duration),
        caption: row.caption ?? null,
        likes: row.likes ?? 0,
        comments: row.comments ?? 0,
        author,
    };
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
