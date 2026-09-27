// Browser-side helpers for the admin screens. Every admin read and write goes
// through /api/admin/*, which checks the admin session on the server; the
// admin screens never talk to Supabase directly.

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
        window.location.href = `/admin-login?next=${encodeURIComponent(window.location.pathname)}`;
    }

    if (!response.ok || !body?.ok) {
        throw new Error(body?.message ?? `Request failed (${response.status}).`);
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
