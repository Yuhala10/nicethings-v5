import { randomUUID } from "node:crypto";
import { NextResponse, userAgent } from "next/server";
import { looksAutomated } from "@/lib/analytics";
import { notInstalled } from "@/lib/atlas/store";
import { cleanText } from "@/lib/feedback";
import { currentProfile } from "@/lib/people/server";
import { getPlace } from "@/lib/places/server";
import { MAX_CAPTION, MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, POSTS_PER_DAY, POST_BUCKET, POST_TYPES, UUID } from "@/lib/posts";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// A visitor sends a photo or a short video for a place's wall.
//
// The file itself never passes through this server (a video is far too
// heavy for it): this route checks the request, writes a line that waits
// for the team's approval, and hands back a one-time permission to put the
// file straight into storage. Nothing shows on the site until someone on
// the team has looked at it.

const whole = (value: unknown, max: number) => {
    const number = Math.round(Number(value));
    return Number.isFinite(number) && number > 0 && number <= max ? number : null;
};

export async function POST(request: Request) {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false, why: "invalid" }, { status: 400 });
    }
    const agent = userAgent(request);
    if (agent.isBot || looksAutomated(agent.ua) || body.website) return NextResponse.json({ ok: false, why: "invalid" }, { status: 400 });

    const slug = cleanText(body.slug, 200);
    const visitor = typeof body.v === "string" && UUID.test(body.v) ? body.v.toLowerCase() : null;
    const type = typeof body.type === "string" ? POST_TYPES[body.type] : undefined;
    const size = Number(body.size);
    if (!slug || !visitor || !type || !Number.isFinite(size) || size <= 0) return NextResponse.json({ ok: false, why: "invalid" }, { status: 400 });
    if (size > (type.kind === "video" ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES)) return NextResponse.json({ ok: false, why: "heavy" }, { status: 413 });
    const duration = type.kind === "video" ? Number(body.duration) : null;
    if (duration !== null && (!Number.isFinite(duration) || duration <= 0 || duration > MAX_VIDEO_SECONDS + 1)) return NextResponse.json({ ok: false, why: "long" }, { status: 422 });

    const place = await getPlace(slug).catch(() => null);
    if (!place) return NextResponse.json({ ok: false, why: "invalid" }, { status: 404 });

    const db = getSupabaseAdminClient();
    try {
        const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
        const sent = await db.from("nt_spot_posts").select("id", { count: "exact", head: false }).eq("visitor_id", visitor).gte("created_at", since).limit(POSTS_PER_DAY + 1);
        if (sent.error) throw sent.error;
        if ((sent.data?.length ?? 0) >= POSTS_PER_DAY) return NextResponse.json({ ok: false, why: "many" }, { status: 429 });

        const name = randomUUID();
        const mediaPath = `${place.id}/${name}.${type.ext}`;
        const posterPath = type.kind === "video" && body.poster === true ? `${place.id}/${name}-poster.jpg` : null;
        // Sent while signed in: the wall will show who it is from.
        const profile = await currentProfile().catch(() => null);
        const row: Record<string, unknown> = {
            spot_id: place.id,
            visitor_id: visitor,
            kind: type.kind,
            media_path: mediaPath,
            poster_path: posterPath,
            width: whole(body.width, 10000),
            height: whole(body.height, 10000),
            duration: duration === null ? null : Math.round(duration * 10) / 10,
            caption: cleanText(body.caption, MAX_CAPTION),
        };
        const saved = await db
            .from("nt_spot_posts")
            .insert(profile ? { ...row, profile_id: profile.id } : row)
            .select("id")
            .single();
        if (saved.error) throw saved.error;

        const storage = db.storage.from(POST_BUCKET);
        const media = await storage.createSignedUploadUrl(mediaPath);
        if (media.error) throw media.error;
        const poster = posterPath ? await storage.createSignedUploadUrl(posterPath) : null;
        if (poster?.error) throw poster.error;
        return NextResponse.json({
            ok: true,
            id: saved.data.id,
            media: { path: mediaPath, token: media.data.token },
            poster: poster ? { path: posterPath, token: poster.data.token } : null,
        });
    } catch (error) {
        // The database script has not been run yet: the wall is simply not open.
        if (notInstalled(error)) return NextResponse.json({ ok: false, why: "closed" }, { status: 503 });
        console.error("Post not accepted:", error);
        return NextResponse.json({ ok: false, why: "failed" }, { status: 502 });
    }
}

// The phone says the file has arrived: only then does the line show up in
// the team's queue.
export async function PATCH(request: Request) {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }
    const id = typeof body.id === "string" && UUID.test(body.id) ? body.id : null;
    const visitor = typeof body.v === "string" && UUID.test(body.v) ? body.v.toLowerCase() : null;
    if (!id || !visitor) return NextResponse.json({ ok: false }, { status: 400 });
    const { error } = await getSupabaseAdminClient().from("nt_spot_posts").update({ uploaded_at: new Date().toISOString() }).eq("id", id).eq("visitor_id", visitor).eq("status", "PENDING");
    if (error) {
        console.error("Post not confirmed:", error);
        return NextResponse.json({ ok: false }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
}
