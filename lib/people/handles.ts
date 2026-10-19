import { getSupabaseAdminClient } from "../supabase/admin";
import { handleProblem, normalizeHandle, type HandleProblem } from "./rules";

// Is an @name free? It is taken by a profile, or by a guest of honour
// (whose nicethings.site/@name address must keep leading to them).
export async function handleTaken(handle: string) {
    const db = getSupabaseAdminClient();
    const [profile, guest] = await Promise.all([
        db.from("nt_profiles").select("id").eq("handle", handle).maybeSingle(),
        db.from("nt_guests").select("ref").eq("slug", handle).maybeSingle(),
    ]);
    if (profile.error) throw profile.error;
    return Boolean(profile.data || (!guest.error && guest.data));
}

// Free names close to the one wanted: "darren" → "darren237", "darren_cm"…
export async function suggestHandles(wanted: string, area?: string | null) {
    const base = normalizeHandle(wanted).replace(/[._]+$/, "").slice(0, 14) || "camer";
    const place = area ? normalizeHandle(area).replace(/[._]/g, "").slice(0, 8) : "";
    const ideas = [`${base}237`, `${base}_cm`, place && `${base}_${place}`, `${base}.${new Date().getFullYear() % 100}`, `le_${base}`, `${base}${Math.floor(10 + Math.random() * 89)}`, `${base}_vrai`, `${base}x`]
        .filter((idea): idea is string => Boolean(idea))
        .map((idea) => idea.slice(0, 20))
        .filter((idea) => !handleProblem(idea));
    const unique = [...new Set(ideas)];
    if (!unique.length) return [];
    const db = getSupabaseAdminClient();
    const [profiles, guests] = await Promise.all([db.from("nt_profiles").select("handle").in("handle", unique), db.from("nt_guests").select("slug").in("slug", unique)]);
    const used = new Set([...(profiles.data ?? []).map((row) => row.handle as string), ...(guests.data ?? []).map((row) => row.slug as string)]);
    return unique.filter((idea) => !used.has(idea)).slice(0, 3);
}

export async function checkHandle(value: unknown, area?: string | null): Promise<{ handle: string; problem: HandleProblem | null; suggestions: string[] }> {
    const handle = normalizeHandle(typeof value === "string" ? value : "");
    const problem = handleProblem(handle);
    if (problem) return { handle, problem, suggestions: problem === "reserved" ? await suggestHandles(handle, area) : [] };
    if (await handleTaken(handle)) return { handle, problem: "taken", suggestions: await suggestHandles(handle, area) };
    return { handle, problem: null, suggestions: [] };
}
