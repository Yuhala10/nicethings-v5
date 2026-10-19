import { getSupabaseAdminClient } from "../supabase/admin";
import { normalizeHandle } from "./rules";
import { PROFILE_COLUMNS, connectionBlocked, connectionOf, lockAfter, noteAttempt, secretMatches, type ProfileRow } from "./server";

// Checks an @name with its PIN (or its rescue code), keeping count of
// wrong tries: per profile (it rests after five in a row) and per
// connection (no trying PINs on many names).

export type SignInResult = { ok: true; row: ProfileRow } | { ok: false; why: "wrong" | "locked" | "slow" | "suspended"; status: number; more?: Record<string, unknown> };

export async function checkSecret(request: Request, handleInput: unknown, secret: string, kind: "pin" | "recovery"): Promise<SignInResult> {
    const connection = connectionOf(request);
    if (await connectionBlocked(connection)) return { ok: false, why: "slow", status: 429 };

    const handle = normalizeHandle(typeof handleInput === "string" ? handleInput : "");
    const db = getSupabaseAdminClient();
    const found = await db.from("nt_profiles").select(`${PROFILE_COLUMNS},pin_hash,recovery_hash,failed_pins,locked_until`).eq("handle", handle).maybeSingle();
    if (found.error) throw found.error;
    const row = found.data as (ProfileRow & { pin_hash: string; recovery_hash: string | null; failed_pins: number; locked_until: string | null }) | null;

    if (!row) {
        await noteAttempt(connection, handle || null, false);
        return { ok: false, why: "wrong", status: 401 };
    }
    if (row.status !== "ACTIVE") return { ok: false, why: "suspended", status: 403 };
    if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) return { ok: false, why: "locked", status: 423, more: { until: row.locked_until } };

    const good = await secretMatches(secret, kind === "pin" ? row.pin_hash : row.recovery_hash);
    await noteAttempt(connection, handle, good);
    if (!good) {
        const fails = (row.failed_pins ?? 0) + 1;
        const lockedUntil = lockAfter(fails);
        await db.from("nt_profiles").update({ failed_pins: fails, locked_until: lockedUntil }).eq("id", row.id);
        if (lockedUntil) return { ok: false, why: "locked", status: 423, more: { until: lockedUntil } };
        return { ok: false, why: "wrong", status: 401, more: { left: 5 - (fails % 5) } };
    }
    if (row.failed_pins || row.locked_until) await db.from("nt_profiles").update({ failed_pins: 0, locked_until: null }).eq("id", row.id);
    return { ok: true, row };
}
