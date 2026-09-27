import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only client with the secret key. It bypasses Row Level Security, so
// it must only be used inside API routes that have already checked the admin
// session (see lib/admin-api.ts). The key has no NEXT_PUBLIC_ prefix, so it
// is never bundled into browser code.

let client: SupabaseClient | undefined;

export function getSupabaseAdminClient() {
    if (typeof window !== "undefined") {
        throw new Error("The Supabase admin client cannot be used in the browser.");
    }

    if (client) return client;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
    }

    if (!serviceKey) {
        throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
    }

    client = createClient(url, serviceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    return client;
}
