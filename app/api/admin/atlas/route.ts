import { NextResponse } from "next/server";
import { UUID_PATTERN, fail, readJson, requireAdmin } from "@/lib/admin-api";
import { runAtlas } from "@/lib/atlas/run";
import { decide, notInstalled, readSettings } from "@/lib/atlas/store";
import { refreshPlaces } from "@/lib/refresh";

// A shift compares thousands of places with the open map and goes over the
// platform: it needs more than the default few seconds.
export const maxDuration = 60;

// GET /api/admin/atlas — everything the Atlas page shows: the last shift,
// what waits for a decision, what Atlas did, and the problems it wrote down.
export async function GET() {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;

    try {
        const [settings, runs, proposed, recent, issues] = await Promise.all([
            readSettings(db),
            db.from("nt_atlas_runs").select("id,kind,status,stats,error,started_at,finished_at").order("started_at", { ascending: false }).limit(1),
            db.from("nt_atlas_actions").select("id,kind,spot_id,title,detail,evidence,before,after,created_at").eq("status", "proposed").order("created_at", { ascending: false }).limit(50),
            db.from("nt_atlas_actions").select("id,kind,spot_id,title,evidence,after,decided_at,created_at").eq("status", "applied").order("created_at", { ascending: false }).limit(30),
            db.from("nt_atlas_issues").select("id,area,severity,title,detail,evidence,times_seen,first_seen_at,last_seen_at").eq("status", "open").order("last_seen_at", { ascending: false }).limit(300),
        ]);
        for (const result of [runs, proposed, recent, issues]) {
            if (result.error) throw result.error;
        }

        // The places the actions are about, by name, for the links.
        const ids = [...new Set([...(proposed.data ?? []), ...(recent.data ?? [])].map((action) => action.spot_id).filter(Boolean))];
        const names = new Map<string, { name: string; slug: string | null }>();
        if (ids.length) {
            const spots = await db.from("nt_spots").select("id,name,slug").in("id", ids);
            if (spots.error) throw spots.error;
            for (const spot of spots.data ?? []) names.set(spot.id, { name: spot.name, slug: spot.slug });
        }
        const withPlace = <T extends { spot_id: string | null }>(rows: T[] | null) => (rows ?? []).map((row) => ({ ...row, place: row.spot_id ? names.get(row.spot_id) ?? null : null }));

        return NextResponse.json({
            ok: true,
            setup: false,
            paused: settings.paused,
            lastRun: runs.data?.[0] ?? null,
            proposed: withPlace(proposed.data),
            recent: withPlace(recent.data),
            issues: issues.data ?? [],
        });
    } catch (error) {
        // The database script has not been run yet: the page explains how.
        if (notInstalled(error)) return NextResponse.json({ ok: true, setup: true });
        return fail(error);
    }
}

// POST /api/admin/atlas { action, id? } — start a shift, pause or resume
// Atlas, settle one of its actions, or close one of its issues.
export async function POST(request: Request) {
    const { db, denied } = await requireAdmin();
    if (denied) return denied;
    const body = (await readJson(request)) ?? {};
    const action = typeof body.action === "string" ? body.action : "";
    const id = typeof body.id === "string" && UUID_PATTERN.test(body.id) ? body.id : null;

    try {
        if (action === "run") {
            const shift = await runAtlas(db, { kind: "manual", force: true });
            if (shift.ran && shift.changed) refreshPlaces();
            return NextResponse.json({ ok: true, shift });
        }

        if (action === "pause" || action === "resume") {
            const { error } = await db.from("nt_atlas_settings").update({ paused: action === "pause", updated_at: new Date().toISOString() }).eq("id", true);
            if (error) throw error;
            return NextResponse.json({ ok: true });
        }

        if ((action === "approve" || action === "decline" || action === "undo") && id) {
            const status = await decide(db, id, action);
            if (!status) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
            if (action !== "decline") refreshPlaces();
            return NextResponse.json({ ok: true, status });
        }

        if ((action === "issue-fixed" || action === "issue-dismiss") && id) {
            const { error } = await db
                .from("nt_atlas_issues")
                .update({ status: action === "issue-fixed" ? "fixed" : "dismissed", resolved_at: new Date().toISOString() })
                .eq("id", id);
            if (error) throw error;
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ ok: false, message: "Unknown action." }, { status: 400 });
    } catch (error) {
        return fail(error);
    }
}
