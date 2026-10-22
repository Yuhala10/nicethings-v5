"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { SongView } from "./people/types";

// The songs one can put on an outing (GET /api/songs), read once per visit
// and shared by every picker on the page.

type State = { songs: SongView[]; ready: boolean; closed: boolean };
const EMPTY: State = { songs: [], ready: false, closed: false };
let state = EMPTY;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function loadSongs() {
    loading ??= fetch("/api/songs")
        .then((response) => response.json() as Promise<{ ok?: boolean; closed?: boolean; songs?: SongView[] }>)
        .then((answer) => {
            state = { songs: answer.songs ?? [], ready: true, closed: Boolean(answer.closed) };
            for (const listener of listeners) listener();
        })
        .catch(() => {
            loading = null;
        });
    return loading;
}

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export function useSongs() {
    useEffect(() => {
        void loadSongs();
    }, []);
    return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}
