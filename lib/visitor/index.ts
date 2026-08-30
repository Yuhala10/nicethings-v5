import type {
    SupabaseClient,
} from "@supabase/supabase-js";

import type {
    Language,
} from "../supabase/types";

export async function getCurrentUser(
    supabase: SupabaseClient
) {
    const {
        data,
        error,
    } =
        await supabase.auth.getUser();

    if (error) {
        return null;
    }

    return data.user ?? null;
}

export async function getCurrentVisitor(
    supabase: SupabaseClient
) {
    const user =
        await getCurrentUser(
            supabase
        );

    if (!user) {
        return null;
    }

    const {
        data,
        error,
    } =
        await supabase
            .from("nt_visitors")
            .select(
                "id, preferred_language"
            )
            .eq("id", user.id)
            .maybeSingle();

    if (error) {
        console.error(
            "Failed to load visitor:",
            error
        );

        return null;
    }

    return data;
}

export async function updateVisitorLanguage(
    supabase: SupabaseClient,
    language: Language
) {
    const user =
        await getCurrentUser(
            supabase
        );

    if (!user) {
        throw new Error(
            "Authentication required."
        );
    }

    const {
        error,
    } =
        await supabase
            .from("nt_visitors")
            .update({
                preferred_language:
                    language,
            })
            .eq("id", user.id);

    if (error) {
        throw error;
    }
}