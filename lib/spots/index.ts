import type {
    SupabaseClient,
} from "@supabase/supabase-js";

export async function getApprovedSpots(
    supabase: SupabaseClient,
    options?: {
        city?: string;
        category?: string;
        featured?: boolean;
        limit?: number;
    }
) {
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

    if (
        typeof options?.featured ===
        "boolean"
    ) {
        request =
            request.eq(
                "featured",
                options.featured
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

export async function getSpotBySlug(
    supabase: SupabaseClient,
    slug: string
) {
    const {
        data,
        error,
    } =
        await supabase
            .from("nt_spots")
            .select("*")
            .eq("slug", slug)
            .eq(
                "status",
                "APPROVED"
            )
            .maybeSingle();

    if (error) {
        throw error;
    }

    return data;
}

export async function getSpotPhotos(
    supabase: SupabaseClient,
    spotId: string
) {
    const {
        data,
        error,
    } =
        await supabase
            .from("nt_spot_photos")
            .select("*")
            .eq(
                "spot_id",
                spotId
            )
            .order(
                "sort_order",
                {
                    ascending: true,
                }
            );

    if (error) {
        throw error;
    }

    return data ?? [];
}

export async function getSpotMenu(
    supabase: SupabaseClient,
    spotId: string
) {
    const {
        data,
        error,
    } =
        await supabase
            .from("nt_spot_menu")
            .select("*")
            .eq(
                "spot_id",
                spotId
            );

    if (error) {
        throw error;
    }

    return data ?? [];
}