"use client";

import { createBrowserClient } from "@supabase/ssr";

// Owner accounts (Google sign-in) in the browser. The session lives in
// cookies so the server-side owner API can check who is asking.
function ownerAuth() {
    return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!).auth;
}

// Whether Google sign-in is switched on for the project. Asked before
// leaving the page: the sign-in itself only fails once the browser is
// already on the provider's side, on a raw error screen.
async function googleEnabled() {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } });
        const settings = (await response.json()) as { external?: { google?: boolean } };
        return settings.external?.google !== false;
    } catch {
        return true; // cannot tell: let the sign-in try
    }
}

// Google sign-in, coming back to `next` (a path on this site) afterwards.
export async function signInWithGoogle(next: string) {
    if (!(await googleEnabled())) return "provider is not enabled";
    const redirectTo = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await ownerAuth().signInWithOAuth({ provider: "google", options: { redirectTo, queryParams: { prompt: "select_account" } } });
    return error ? error.message : null;
}
