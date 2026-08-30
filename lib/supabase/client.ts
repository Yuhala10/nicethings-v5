import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getSupabaseBrowserClient() {
    if (client) return client;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url) {
        throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_URL environment variable."
        );
    }

    if (!anonKey) {
        throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable."
        );
    }

    client = createBrowserClient<Database>(url, anonKey);

    return client;
}

export default getSupabaseBrowserClient;