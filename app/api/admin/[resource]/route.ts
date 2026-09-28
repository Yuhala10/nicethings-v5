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

    // Page through everything: the database returns at most 1000 rows a call.
    const data: Record<string, unknown>[] = [];
    for (let from = 0; ; from += 1000) {
        const page = await db
            .from(ADMIN_RESOURCES[resource].table)
            .select("*")
            .order("created_at", { ascending: false })
            .range(from, from + 999);
        if (page.error) return fail(page.error);
        data.push(...(page.data ?? []));
        if (!page.data || page.data.length < 1000) break;
    }

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
