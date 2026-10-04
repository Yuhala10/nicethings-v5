"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicClaim } from "@/lib/claims/server";

export type OwnerPlace = { slug: string; name: string; category: string; city: string | null; neighborhood: string | null; status?: string };
export type OwnerOverview = {
    user: { id: string; email: string | null; name: string | null; avatar: string | null } | null;
    places: { role: string; since: string; place: OwnerPlace | null }[];
    claims: (PublicClaim & { place: OwnerPlace | null })[];
    setup?: boolean;
};

// The signed-in owner, their places and claims (or user: null).
export function useOwner() {
    const [data, setData] = useState<OwnerOverview | null>(null);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        try {
            const response = await fetch("/api/pro/me", { cache: "no-store" });
            const body = await response.json();
            setData(body.ok ? body : { user: null, places: [], claims: [] });
        } catch {
            setData({ user: null, places: [], claims: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void reload();
    }, [reload]);

    return { data, loading, reload };
}

// JSON calls to /api/pro/*: throws the server's message on failure.
export async function proCall<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/pro/${path}`, {
        ...init,
        headers: init.body instanceof FormData ? init.headers : { "Content-Type": "application/json", ...init.headers },
        cache: "no-store",
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) throw new Error(body?.message ?? "Oups, réessaie.");
    return body as T;
}
