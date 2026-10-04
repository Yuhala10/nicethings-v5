"use client";

import { createBrowserClient } from "@supabase/ssr";

// Owner accounts (Google sign-in) in the browser. The session lives in
// cookies so the server-side owner API can check who is asking.
function ownerAuth() {
    return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!).auth;
}

// Google sign-in, coming back to `next` (a path on this site) afterwards.
export async function signInWithGoogle(next: string) {
    const redirectTo = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await ownerAuth().signInWithOAuth({ provider: "google", options: { redirectTo, queryParams: { prompt: "select_account" } } });
    return error ? error.message : null;
}
