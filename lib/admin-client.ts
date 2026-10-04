// Browser-side helpers for the admin screens. Every admin read and write goes
// through /api/admin/*, which checks the admin session on the server; the
// admin screens never talk to Supabase directly.

import { adminLang } from "@/components/admin/i18n";
import { translateAdminMessage } from "./admin-messages";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`/api/admin/${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...init?.headers,
        },
        cache: "no-store",
    });

    const body = await response.json().catch(() => null);

    if (response.status === 401 && typeof window !== "undefined") {
        // A full page load: the sign-in page lives under another root layout.
        window.location.assign(`/admin-login?next=${encodeURIComponent(window.location.pathname)}`);
    }

    if (!response.ok || !body?.ok) {
        const lang = adminLang();
        throw new Error(body?.message ? translateAdminMessage(body.message, lang) : lang === "en" ? `Request failed (${response.status}).` : `La requête a échoué (${response.status}).`);
    }

    return body as T;
}

export function adminGet<T>(path: string) {
    return request<T>(path);
}

export function adminPatch<T = { row: unknown }>(path: string, changes: Record<string, unknown>) {
    return request<T>(path, {
        method: "PATCH",
        body: JSON.stringify(changes),
    });
}

export function adminPost<T = { row: unknown }>(path: string, payload: Record<string, unknown>) {
    return request<T>(path, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}
