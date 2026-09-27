import type {
    SupabaseClient,
} from "@supabase/supabase-js";

export async function searchSpots(
    supabase: SupabaseClient,
    query: string,
    options?: {
        city?: string;
        category?: string;
        limit?: number;
    }
) {
    const search =
        query.trim();

    const limit =
        options?.limit ?? 24;

    let request =
        supabase
            .from("nt_spots")
            .select("*")
            .eq(
                "status",
                "APPROVED"
            )
            .limit(limit);

    if (options?.city) {
        request =
            request.eq(
                "city",
                options.city
            );
    }

    if (options?.category) {
        request =
            request.eq(
                "category",
                options.category
            );
    }

    if (search) {
        const safe =
            search
                .replaceAll("%", "")
                .replaceAll("_", "");

        request =
            request.or(
                [
                    `name.ilike.%${safe}%`,
                    `description.ilike.%${safe}%`,
                    `category.ilike.%${safe}%`,
                    `city.ilike.%${safe}%`,
                    `neighborhood.ilike.%${safe}%`,
                ].join(",")
            );
    }

    const {
        data,
        error,
    } = await request;

    if (error) {
        throw error;
    }

    return data ?? [];
}