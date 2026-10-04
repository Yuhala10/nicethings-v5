import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "./admin";

// Server side of owner accounts: who is signed in (checked with Supabase
// Auth, never trusted from the browser), then the service-role client for
// the actual reads and writes, always scoped to that person.

export async function ownerSessionClient() {
    const store = await cookies();
    return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        cookies: {
            getAll: () => store.getAll(),
            setAll: (list) => {
                try {
                    list.forEach(({ name, value, options }) => store.set(name, value, options));
                } catch {
                    // Called from a page render: cookies are refreshed by the next API call.
                }
            },
        },
    });
}

export type Owner = { id: string; email: string | null; name: string | null; avatar: string | null };

export async function currentOwner(): Promise<Owner | null> {
    const { data, error } = await (await ownerSessionClient()).auth.getUser();
    if (error || !data.user) return null;
    const meta = data.user.user_metadata ?? {};
    return {
        id: data.user.id,
        email: data.user.email ?? null,
        name: (meta.full_name as string) ?? (meta.name as string) ?? null,
        avatar: (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
    };
}

// For /api/pro/* routes: the signed-in owner and a server database client.
export async function requireOwner() {
    const owner = await currentOwner();
    if (!owner) {
        return { owner: null, db: null, denied: NextResponse.json({ ok: false, message: "Connecte-toi avec Google pour continuer." }, { status: 401 }) } as const;
    }
    return { owner, db: getSupabaseAdminClient(), denied: null } as const;
}
