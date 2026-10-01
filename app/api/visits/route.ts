import { NextResponse, userAgent } from "next/server";
import { UUID_PATTERN } from "@/lib/admin-api";
import { hasAdminSession } from "@/lib/admin-auth";
import { describePath, visitSource } from "@/lib/analytics";
import { publicWriteClient } from "@/lib/feedback";
import { getPlacesBySlugs } from "@/lib/places/server";

// Anonymous audience log: one row per page seen (kind of page, city,
// language, device, where the visit came from) under a random id kept in
// the browser. No IP address, no position. Feeds the admin "Audience" page.
// Robots and the team (anyone signed in to the console) are not counted.
export async function POST(request: Request) {
    const done = () => new NextResponse(null, { status: 204 });

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return done();
    }
    const visitor = typeof body.v === "string" && UUID_PATTERN.test(body.v) ? body.v.toLowerCase() : null;
    const path = typeof body.path === "string" ? body.path.slice(0, 300) : "";
    const seen = describePath(path);
    if (!visitor || !seen) return done();

    const agent = userAgent(request);
    if (agent.isBot || (await hasAdminSession().catch(() => false))) return done();

    // Place pages have no city in their URL: take it from the catalogue.
    let city = seen.city;
    if (!city && seen.place) city = (await getPlacesBySlugs([seen.place]).catch(() => []))[0]?.city ?? null;

    const { error } = await publicWriteClient()
        .from("nt_events")
        .insert({
            visitor_id: visitor,
            page: seen.page,
            path,
            city,
            place: seen.place,
            lang: seen.lang,
            source: body.first === true ? visitSource({ tag: body.tag, referrer: body.ref, installed: body.app }) : null,
            device: agent.device.type === "mobile" || agent.device.type === "tablet" ? "mobile" : "desktop",
        });
    if (error) console.error("Visit log failed:", error);
    return done();
}
