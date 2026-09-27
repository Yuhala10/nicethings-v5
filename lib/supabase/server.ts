import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

export async function getSupabaseServerClient() {
    const cookieStore = await cookies();

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

    return createServerClient<Database>(
        url,
        anonKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },

                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(
                            ({ name, value, options }) => {
                                cookieStore.set(
                                    name,
                                    value,
                                    options
                                );
                            }
                        );
                    } catch {
                        /*
                         * Server Components cannot always
                         * write cookies. Middleware handles
                         * session refresh when required.
                         */
                    }
                },
            },
        }
    );
}