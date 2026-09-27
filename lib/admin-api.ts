import { NextResponse } from "next/server";
import { hasAdminSession } from "./admin-auth";
import { getSupabaseAdminClient } from "./supabase/admin";

// Shared plumbing for /api/admin/* routes.

export async function requireAdmin() {
    if (!(await hasAdminSession())) {
        return {
            db: null,
            denied: NextResponse.json(
                { ok: false, message: "Admin session required." },
                { status: 401 }
            ),
        } as const;
    }

    return { db: getSupabaseAdminClient(), denied: null } as const;
}

export function fail(error: unknown, status = 500) {
    // Failed HEAD/count requests come back with an empty message.
    const message =
        (error && typeof error === "object" && "message" in error
            ? String((error as { message: unknown }).message)
            : "") || "The database request failed. Please try again.";

    console.error("Admin API error:", error);

    return NextResponse.json({ ok: false, message }, { status });
}

export async function readJson(request: Request) {
    try {
        const body = await request.json();
        return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}

// Copies only the allowed keys from an untrusted body, so a request can never
// set columns such as rating, review_count or id.
export function pick(body: Record<string, unknown>, allowed: readonly string[]) {
    const result: Record<string, unknown> = {};

    for (const key of allowed) {
        if (key in body) {
            result[key] = body[key];
        }
    }

    return result;
}

export const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
