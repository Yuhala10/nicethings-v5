import { NextResponse } from "next/server";
import { fail, requireAdmin } from "@/lib/admin-api";

// Who visits over the last N days: visitors, who came back, cities, pages,
// places and where visits come from. The counting is done in the database
// (nt_audience, database/migrations/002_analytics.sql).

const DAY = 86_400_000;
const CAMEROON_OFFSET = 3_600_000; // UTC+1, no daylight saving

type Day = { day: string; views: number; visitors: number; returned: number };

export async function GET(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const days = Math.min(90, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 30));

    // Whole days in Cameroon time, today included.
    const today = Math.floor((Date.now() + CAMEROON_OFFSET) / DAY) * DAY;
    const first = today - (days - 1) * DAY;

    const { data, error } = await db.rpc("nt_audience", { since: new Date(first - CAMEROON_OFFSET).toISOString() });
    if (error) {
        // The table or the function is not there yet: the page explains what to run.
        if (["PGRST202", "PGRST205", "42883", "42P01"].includes(error.code)) return NextResponse.json({ ok: true, setup: true });
        return fail(error);
    }

    // One entry per day, quiet days included, so the chart has no holes.
    const counted = new Map((data.perDay as Day[]).map((day) => [day.day, day]));
    const perDay = Array.from({ length: days }, (_, index) => {
        const day = new Date(first + index * DAY).toISOString().slice(0, 10);
        return counted.get(day) ?? { day, views: 0, visitors: 0, returned: 0 };
    });

    return NextResponse.json({ ok: true, ...data, perDay });
}
