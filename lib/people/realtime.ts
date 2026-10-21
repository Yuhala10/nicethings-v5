"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

// The instant signals of messages (lib/people/chats.ts): a phone listens
// on names only it was given, and hears "something changed, look again".
// Nothing of the messages travels this way. The connection is made only
// for a member who opens messages, so a visitor downloads none of it.

let client: Promise<SupabaseClient> | null = null;

function realtime() {
    client ??= import("@supabase/supabase-js").then(({ createClient }) =>
        createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    );
    return client;
}

export type Listening = { send: (event: string, payload: Record<string, unknown>) => void; stop: () => void };

// Listens on `topic` for the given events; `onLive` says whether the line
// is up (when it is not, the caller asks more often instead).
export function listen(topic: string, events: Record<string, (payload: Record<string, unknown>) => void>, onLive?: (live: boolean) => void): Listening {
    let stopped = false;
    let channel: ReturnType<SupabaseClient["channel"]> | null = null;
    realtime()
        .then((supabase) => {
            if (stopped) return;
            channel = supabase.channel(topic, { config: { broadcast: { self: false } } });
            for (const [event, handler] of Object.entries(events)) channel.on("broadcast", { event }, (message) => handler((message.payload ?? {}) as Record<string, unknown>));
            channel.subscribe((status) => onLive?.(status === "SUBSCRIBED"));
        })
        .catch(() => onLive?.(false));
    return {
        send(event, payload) {
            channel?.send({ type: "broadcast", event, payload }).catch(() => {});
        },
        stop() {
            stopped = true;
            const open = channel;
            if (open) realtime().then((supabase) => supabase.removeChannel(open)).catch(() => {});
        },
    };
}
