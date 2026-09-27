import { NextResponse } from "next/server";
import { fail, pick, readJson, requireAdmin, UUID_PATTERN } from "../../../../../lib/admin-api";
import { ADMIN_RESOURCES, isAdminResource } from "../../../../../lib/admin-resources";

type Context = {
    params: Promise<{ resource: string; id: string }>;
};

export async function PATCH(request: Request, context: Context) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;

    const { resource, id } = await context.params;
    if (!isAdminResource(resource) || !UUID_PATTERN.test(id)) {
        return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
    }

    const body = await readJson(request);
    if (!body) {
        return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
    }

    const config = ADMIN_RESOURCES[resource];
    const changes = pick(body, config.patchable);

    if (Object.keys(changes).length === 0) {
        return NextResponse.json({ ok: false, message: "Nothing to update." }, { status: 400 });
    }

    if (
        "status" in changes &&
        !(config.statuses as readonly unknown[]).includes(changes.status)
    ) {
        return NextResponse.json({ ok: false, message: "Invalid status." }, { status: 400 });
    }

    const { data, error } = await db
        .from(config.table)
        .update(changes)
        .eq("id", id)
        .select("*")
        .maybeSingle();

    if (error) return fail(error, 400);
    if (!data) {
        return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, row: data });
}
