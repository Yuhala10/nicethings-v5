import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { notInstalled } from "@/lib/atlas/store";
import { getPlace } from "@/lib/places/server";
import { MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, POST_BUCKET, POST_TYPES, UUID } from "@/lib/posts";
import { checkLevel } from "@/lib/people/notices";
import { followingOf, hasOutingSound, loadOutings } from "@/lib/people/outings";
import { countUse, hasOutingSong, liveSong } from "@/lib/songs";
import { isSound } from "@/lib/sounds";
import { refreshPerson } from "@/lib/people/pages";
import { COMPANIES, MAX_OUTING_BODY, MAX_OUTING_PHOTOS, MAX_PRICE, MOODS, OUTINGS_PER_DAY, needsReading, normalizeHandle, postsAtOnce } from "@/lib/people/rules";
import { currentProfile, deny, readBody, requireProfile, toPerson, statsOf } from "@/lib/people/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// "Ma sortie": an outing at a real place. Its files go straight from the
// phone to storage (a one-time permission each, like the walls); the outing
// stays a draft until they are there, then goes online, or waits for the
// team when its author is new ("Nouveau") or it carries a link or a number.

const NOW = { expire: 0 };
const whole = (value: unknown, max: number) => {
    const number = Math.round(Number(value));
    return Number.isFinite(number) && number > 0 && number <= max ? number : null;
};

// ?id=… one outing · ?place=slug · ?handle=name · ?following=1 (their friends')
export async function GET(request: Request) {
    const query = new URL(request.url).searchParams;
    try {
        const viewer = await currentProfile().catch(() => null);
        const db = getSupabaseAdminClient();
        let outings;
        if (query.get("id") && UUID.test(query.get("id")!)) {
            outings = await loadOutings({ ids: [query.get("id")!], viewer: viewer?.id ?? null, withPending: true });
            outings = outings.filter((outing) => outing.status === "PUBLISHED" || outing.mine);
        } else if (query.get("place")) {
            const place = await getPlace(query.get("place")!).catch(() => null);
            if (!place) return deny("invalid", 404);
            outings = await loadOutings({ spotId: place.id, viewer: viewer?.id ?? null, limit: 24 });
        } else if (query.get("handle")) {
            const found = await db.from("nt_profiles").select("id").eq("handle", normalizeHandle(query.get("handle")!)).maybeSingle();
            if (!found.data) return deny("invalid", 404);
            const mine = viewer?.id === found.data.id;
            outings = await loadOutings({ profileId: found.data.id as string, viewer: viewer?.id ?? null, withPending: mine, limit: 60 });
        } else if (query.get("following")) {
            if (!viewer) return deny("signin", 401);
            outings = await loadOutings({ profiles: [...(await followingOf(viewer.id)), viewer.id], viewer: viewer.id, limit: 40 });
        } else {
            return deny("invalid", 400);
        }
        return NextResponse.json({ ok: true, outings }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
        if (notInstalled(error)) return deny("closed", 503);
        console.error("Outings not read:", error);
        return deny("failed", 502);
    }
}

// A new outing: checked, written as a draft, and the permissions to send its files.
export async function POST(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const body = await readBody(request);
    const place = typeof body.place === "string" && body.place.length <= 200 ? await getPlace(body.place).catch(() => null) : null;
    if (!place) return deny("place", 422);

    const files = Array.isArray(body.media) ? (body.media as Record<string, unknown>[]).slice(0, MAX_OUTING_PHOTOS) : [];
    const typed = files.map((file) => ({ file, type: typeof file.type === "string" ? POST_TYPES[file.type] : undefined }));
    if (!typed.length || typed.some((item) => !item.type)) return deny("media", 422);
    const videos = typed.filter((item) => item.type!.kind === "video");
    // Up to four photos, or one video alone.
    if (videos.length > 1 || (videos.length === 1 && typed.length > 1)) return deny("media", 422);
    for (const { file, type } of typed) {
        const size = Number(file.size);
        if (!Number.isFinite(size) || size <= 0 || size > (type!.kind === "video" ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES)) return deny("heavy", 413);
        if (type!.kind === "video" && !(Number(file.duration) > 0 && Number(file.duration) <= MAX_VIDEO_SECONDS + 1)) return deny("long", 422);
    }

    const db = getSupabaseAdminClient();
    try {
        const since = new Date(Date.now() - 86_400_000).toISOString();
        const today = await db.from("nt_outings").select("id", { count: "exact", head: true }).eq("profile_id", profile.id).gte("created_at", since);
        if (today.error) throw today.error;
        if ((today.count ?? 0) >= OUTINGS_PER_DAY) return deny("many", 429);

        const price = Math.round(Number(body.pricePaid));
        const text = typeof body.body === "string" ? body.body.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_OUTING_BODY) : "";
        // A real song (script 016) or one of NiceThings' soundtracks, with photos.
        const song = !videos.length && body.song && (await hasOutingSong()) ? await liveSong(body.song) : null;
        const outing = await db
            .from("nt_outings")
            .insert({
                profile_id: profile.id,
                spot_id: place.id,
                mood: (MOODS as readonly string[]).includes(body.mood as string) ? body.mood : null,
                price_paid: Number.isFinite(price) && price > 0 && price <= MAX_PRICE ? price : null,
                company: (COMPANIES as readonly string[]).includes(body.company as string) ? body.company : null,
                body: text || null,
                // A soundtrack goes with photos (a video keeps its own sound).
                ...(song ? { song_id: song.id } : isSound(body.sound) && !videos.length && (await hasOutingSound()) && { sound: body.sound }),
            })
            .select("id")
            .single();
        if (outing.error) throw outing.error;
        if (song) await countUse(song.id);

        const storage = db.storage.from(POST_BUCKET);
        const uploads = [];
        for (const [index, { file, type }] of typed.entries()) {
            const name = randomUUID();
            const mediaPath = `outings/${outing.data.id}/${name}.${type!.ext}`;
            const posterPath = type!.kind === "video" && file.poster === true ? `outings/${outing.data.id}/${name}-poster.jpg` : null;
            const row = await db.from("nt_outing_media").insert({
                outing_id: outing.data.id,
                kind: type!.kind,
                media_path: mediaPath,
                poster_path: posterPath,
                width: whole(file.width, 10000),
                height: whole(file.height, 10000),
                duration: type!.kind === "video" ? Math.round(Number(file.duration) * 10) / 10 : null,
                sort: index,
            });
            if (row.error) throw row.error;
            const media = await storage.createSignedUploadUrl(mediaPath);
            if (media.error) throw media.error;
            const poster = posterPath ? await storage.createSignedUploadUrl(posterPath) : null;
            if (poster?.error) throw poster.error;
            uploads.push({ media: { path: mediaPath, token: media.data.token }, poster: poster && posterPath ? { path: posterPath, token: poster.data.token } : null });
        }
        return NextResponse.json({ ok: true, id: outing.data.id, uploads });
    } catch (error) {
        if (notInstalled(error)) return deny("closed", 503);
        console.error("Outing not created:", error);
        return deny("failed", 502);
    }
}

// The files are there: online now, or waiting for the team.
// { id, action: "edit", body, mood, sound, song, company, pricePaid }: its author
// changes what was said about it (the photos and the place stay).
export async function PATCH(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const body = await readBody(request);
    const id = typeof body.id === "string" && UUID.test(body.id) ? body.id : null;
    if (!id) return deny("invalid", 400);
    const db = getSupabaseAdminClient();
    if (body.action === "edit") {
        const found = await db.from("nt_outings").select((await hasOutingSong()) ? "id,status,body,song_id" : "id,status,body").eq("id", id).eq("profile_id", profile.id).maybeSingle<{ id: string; status: string; body: string | null; song_id?: string | null }>();
        if (found.error) return deny("failed", 502);
        if (!found.data || found.data.status === "DRAFT" || found.data.status === "HIDDEN") return deny("invalid", 404);
        const text = typeof body.body === "string" ? body.body.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_OUTING_BODY) : ((found.data.body as string | null) ?? "");
        const price = Math.round(Number(body.pricePaid));
        const hasVideo = await db.from("nt_outing_media").select("outing_id", { count: "exact", head: true }).eq("outing_id", id).eq("kind", "video");
        const withSong = await hasOutingSong();
        const song = withSong && !hasVideo.count && body.song ? await liveSong(body.song) : null;
        // New words with a link or a number go past the team first.
        const reread = needsReading(text) && text !== found.data.body && !(profile.role === "team" || profile.role === "founder");
        const change: Record<string, unknown> = {
            body: text || null,
            mood: (MOODS as readonly string[]).includes(body.mood as string) ? body.mood : null,
            company: (COMPANIES as readonly string[]).includes(body.company as string) ? body.company : null,
            price_paid: Number.isFinite(price) && price > 0 && price <= MAX_PRICE ? price : null,
            ...(reread && { status: "PENDING" }),
            ...((await hasOutingSound()) && { sound: !song && isSound(body.sound) && !hasVideo.count ? body.sound : null }),
            ...(withSong && { song_id: song?.id ?? null }),
        };
        const saved = await db.from("nt_outings").update(change).eq("id", id);
        if (saved.error) return deny("failed", 502);
        if (song && song.id !== found.data.song_id) await countUse(song.id);
        revalidateTag("kwat", NOW);
        refreshPerson(profile.handle);
        const [outing] = await loadOutings({ ids: [id], viewer: profile.id, withPending: true });
        return NextResponse.json({ ok: true, outing, status: reread ? "PENDING" : found.data.status });
    }
    const found = await db.from("nt_outings").select("id,body,status").eq("id", id).eq("profile_id", profile.id).maybeSingle();
    if (found.error) return deny("failed", 502);
    if (!found.data || found.data.status !== "DRAFT") return deny("invalid", 404);

    const person = toPerson(profile, (await statsOf([profile.id])).get(profile.id));
    const atOnce = postsAtOnce(person) && !needsReading((found.data.body as string | null) ?? "");
    const saved = await db.from("nt_outings").update({ status: atOnce ? "PUBLISHED" : "PENDING", published_at: atOnce ? new Date().toISOString() : null }).eq("id", id);
    if (saved.error) return deny("failed", 502);
    if (atOnce) {
        revalidateTag("kwat", NOW);
        refreshPerson(profile.handle);
        await checkLevel(profile.id);
    }
    return NextResponse.json({ ok: true, status: atOnce ? "PUBLISHED" : "PENDING" });
}

// Taking an outing back, its files with it.
export async function DELETE(request: Request) {
    const { profile, denied } = await requireProfile(request);
    if (denied) return denied;
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !UUID.test(id)) return deny("invalid", 400);
    const db = getSupabaseAdminClient();
    const files = await db.from("nt_outing_media").select("media_path,poster_path,outing_id").eq("outing_id", id);
    const gone = await db.from("nt_outings").delete().eq("id", id).eq("profile_id", profile.id).select("id").maybeSingle();
    if (gone.error) return deny("failed", 502);
    if (gone.data) {
        const paths = (files.data ?? []).flatMap((file) => [file.media_path as string, file.poster_path as string | null]).filter((path): path is string => Boolean(path));
        if (paths.length) await db.storage.from(POST_BUCKET).remove(paths);
        revalidateTag("kwat", NOW);
        refreshPerson(profile.handle);
    }
    return NextResponse.json({ ok: true });
}
