import { NextResponse, type NextRequest } from "next/server";
import { honourBySlug } from "@/lib/guests";
import { DEFAULT_LOCALE, LOCALE_COOKIE, SITE_URL, isLocale, type Locale } from "@/lib/i18n";
import { paths, slugify } from "@/lib/places/paths";
import { normalizeHandle } from "@/lib/people/rules";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// nicethings.site/@theirname: the short address of a guest of honour, or of
// anyone's profile (next.config.mjs sends /@… here). It leads to their page,
// in the visitor's language. A name nobody has leads to the guests' page,
// where anyone can ask for an invitation.

function preferred(request: NextRequest): Locale {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    if (isLocale(saved)) return saved;
    for (const part of (request.headers.get("accept-language") ?? "").split(",")) {
        const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
        if (isLocale(code)) return code;
    }
    return DEFAULT_LOCALE;
}

async function profileOf(handle: string) {
    if (!handle) return null;
    const { data } = await getSupabaseAdminClient().from("nt_profiles").select("handle").eq("handle", handle).eq("status", "ACTIVE").maybeSingle();
    return (data?.handle as string | undefined) ?? null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
    const { handle } = await params;
    const lang = preferred(request);
    const typed = decodeURIComponent(handle).replace(/^@+/, "");
    const slug = slugify(typed).slice(0, 60);
    const guest = slug ? await honourBySlug(slug).catch(() => null) : null;
    if (guest) return NextResponse.redirect(`${SITE_URL}${paths.guest(lang, guest.slug)}`, 307);
    const profile = await profileOf(normalizeHandle(typed)).catch(() => null);
    return NextResponse.redirect(`${SITE_URL}${profile ? paths.person(lang, profile) : paths.guests(lang)}`, 307);
}
