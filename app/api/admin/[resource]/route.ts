import { NextResponse } from "next/server";
import { fail, requireAdmin } from "../../../../lib/admin-api";
import { ADMIN_RESOURCES, isAdminResource } from "../../../../lib/admin-resources";

type Context = {
    params: Promise<{ resource: string }>;
};

export async function GET(_request: Request, context: Context) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;

    const { resource } = await context.params;
    if (!isAdminResource(resource)) {
        return NextResponse.json({ ok: false, message: "Unknown resource." }, { status: 404 });
    }

    const { data, error } = await db
        .from(ADMIN_RESOURCES[resource].table)
        .select("*")
        .order("created_at", { ascending: false });

    if (error) return fail(error);

    if (resource !== "reports") {
        return NextResponse.json({ ok: true, rows: data ?? [] });
    }

    // Reports are shown with the name of the place they are about.
    const spotIds = Array.from(
        new Set((data ?? []).map((row) => row.spot_id).filter(Boolean))
    );

    let spots: unknown[] = [];

    if (spotIds.length > 0) {
        const result = await db
            .from("nt_spots")
            .select("id,name,slug,city,neighborhood,status")
            .in("id", spotIds);

        if (result.error) return fail(result.error);
        spots = result.data ?? [];
    }

    return NextResponse.json({ ok: true, rows: data ?? [], spots });
}
