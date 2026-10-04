import { NextResponse } from "next/server";
import { ownerSessionClient } from "@/lib/supabase/owner";

// Google sends the visitor back here after sign-in; the one-time code is
// swapped for a session cookie, then they continue where they were.
export async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const wanted = url.searchParams.get("next") ?? "/fr/pro";
    // Only paths on this site, never another domain.
    const next = /^\/(fr|en)(\/[\w\-/]*)?$/.test(wanted) ? wanted : "/fr/pro";

    if (code) {
        const { error } = await (await ownerSessionClient()).auth.exchangeCodeForSession(code);
        if (!error) return NextResponse.redirect(new URL(next, url.origin));
        console.error("Owner sign-in failed:", error.message);
    }
    return NextResponse.redirect(new URL(`${next}?login=failed`, url.origin));
}
