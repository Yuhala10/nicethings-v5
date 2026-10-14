import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { readPostChanges, uniquePostSlug } from "./blog/admin";
import type { Block } from "./blog/blocks";
import { GUEST_TAG } from "./blog/guest";
import { cityBySlug } from "./cities";
import { cleanHandle, saveGuestCard } from "./guests";
import type { Invitation } from "./invitations";
import { getAllPlaces, getPlacesBySlugs } from "./places/server";
import { getSupabaseAdminClient } from "./supabase/admin";

// What a guest does with an invitation (server only): look for a place, add
// a picture, send the notebook. Nothing they send is published: a notebook
// becomes a draft article signed with their name, and a place the site does
// not have yet joins the queue of proposed places, marked as theirs.

const BUCKET = "blog-images";
export const MAX_GUEST_PLACES = 10;
export const MAX_GUEST_PHOTOS = 3; // per place
const MAX_PICTURES = 45; // per invitation, all notebooks together
const MAX_NOTEBOOKS = 5; // per invitation
const MAX_PICTURE_BYTES = 8 * 1024 * 1024;

const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const text = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/[\u0000-\u0008\u000b-\u001f]/g, "").trim().slice(0, max) : "");

// Places whose name holds what the guest typed, the fullest listings first.
export async function findGuestPlaces(query: string) {
    const wanted = plain(query).trim();
    if (wanted.length < 2) return [];
    const places = await getAllPlaces();
    return places
        .filter((place) => plain(place.name).includes(wanted))
        .sort((a, b) => Number(plain(b.name).startsWith(wanted)) - Number(plain(a.name).startsWith(wanted)) || Number(b.verified) - Number(a.verified) || Number(Boolean(b.cover)) - Number(Boolean(a.cover)))
        .slice(0, 6)
        .map((place) => ({ slug: place.slug, name: place.name, area: [place.neighborhood, cityBySlug(place.city)?.name].filter(Boolean).join(", ") }));
}

const folder = (invitation: Invitation) => `guests/${invitation.ref}`;
const publicBase = () => `${getSupabaseAdminClient().storage.from(BUCKET).getPublicUrl("").data.publicUrl.replace(/\/$/, "")}/`;

// Keeps a guest's picture. It is decoded and written again, so nothing but
// the picture survives (no location data, no hidden content).
export async function saveGuestPicture(invitation: Invitation, file: File) {
    if (file.size > MAX_PICTURE_BYTES) return { ok: false as const, why: "heavy" };
    const db = getSupabaseAdminClient();
    const held = await db.storage.from(BUCKET).list(folder(invitation), { limit: MAX_PICTURES + 1 });
    if (held.error) throw held.error;
    if ((held.data?.length ?? 0) >= MAX_PICTURES) return { ok: false as const, why: "many" };

    let jpeg: Buffer;
    try {
        jpeg = await sharp(Buffer.from(await file.arrayBuffer()))
            .rotate()
            .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 84, mozjpeg: true })
            .toBuffer();
    } catch {
        return { ok: false as const, why: "unreadable" };
    }
    const path = `${folder(invitation)}/${randomUUID()}.jpg`;
    const upload = await db.storage.from(BUCKET).upload(path, jpeg, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
    if (upload.error) throw upload.error;
    return { ok: true as const, url: db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

type Entry = { slug: string | null; fresh: { name: string; city: string; where: string } | null; photos: string[]; words: string };

// A notebook as the guest sent it, checked; null when it cannot be one.
export function readNotebook(invitation: Invitation, body: Record<string, unknown>) {
    const mine = `${publicBase()}${folder(invitation)}/`;
    const entries: Entry[] = [];
    for (const raw of Array.isArray(body.places) ? body.places.slice(0, MAX_GUEST_PLACES) : []) {
        if (!raw || typeof raw !== "object") continue;
        const item = raw as Record<string, unknown>;
        const slug = typeof item.slug === "string" && /^[a-z0-9-]{1,200}$/.test(item.slug) ? item.slug : null;
        const given = item.fresh && typeof item.fresh === "object" ? (item.fresh as Record<string, unknown>) : null;
        const city = given ? cityBySlug(typeof given.city === "string" ? given.city : null) : null;
        const fresh = given && city && text(given.name, 120).length >= 2 ? { name: text(given.name, 120), city: city.slug, where: text(given.where, 200) } : null;
        // Only pictures that came in through this very invitation.
        const photos = (Array.isArray(item.photos) ? item.photos : []).filter((url): url is string => typeof url === "string" && url.startsWith(mine) && /^[\w./:-]+\.jpg$/.test(url)).slice(0, MAX_GUEST_PHOTOS);
        const words = text(item.words, 900);
        if ((slug || fresh) && (words || photos.length)) entries.push({ slug: fresh ? null : slug, fresh, photos, words });
    }
    if (entries.length === 0 || body.agree !== true) return null;
    const link = text(body.link, 200);
    // Their guest's card: a photo of them (sent through this invitation too),
    // their account, one sentence about who they are.
    const portrait = typeof body.portrait === "string" && body.portrait.startsWith(mine) && /^[\w./:-]+\.jpg$/.test(body.portrait) ? body.portrait : null;
    return {
        name: text(body.name, 60).replace(/\s+/g, " ") || invitation.name,
        link: /^https:\/\/[^\s"'<>]+$/.test(link) ? link : null,
        handle: cleanHandle(body.handle),
        portrait,
        intro: text(body.intro, 160).replace(/\s+/g, " ") || null,
        title: text(body.title, 120).replace(/\s+/g, " "),
        entries,
    };
}

// Turns a notebook into a draft article signed with the guest's name, and
// proposes the places the site does not have yet. Returns false when this
// invitation has already sent as many notebooks as it may.
export async function saveNotebook(invitation: Invitation, notebook: NonNullable<ReturnType<typeof readNotebook>>) {
    const db = getSupabaseAdminClient();
    const mark = `carnet-${invitation.ref}`;
    const sent = await db.from("nt_posts").select("id", { count: "exact", head: false }).contains("tags", [mark]).limit(MAX_NOTEBOOKS + 1);
    if (sent.error) throw sent.error;
    if ((sent.data?.length ?? 0) >= MAX_NOTEBOOKS) return false;

    const known = await getPlacesBySlugs(notebook.entries.flatMap((entry) => (entry.slug ? [entry.slug] : [])));
    const title = notebook.title || `Les adresses de ${notebook.name}`;
    const blocks: Block[] = [];
    let cover: { url: string; alt: string } | null = null;
    let firstCity: string | null = null;
    for (const entry of notebook.entries) {
        const place = entry.slug ? known.find((item) => item.slug === entry.slug) : null;
        const name = place?.name ?? entry.fresh?.name;
        if (!name) continue; // a place that has left the site since
        firstCity ??= place?.city ?? entry.fresh?.city ?? null;
        blocks.push({ type: "h2", text: name });
        for (const url of entry.photos) {
            const alt = `${name}, photo de ${notebook.name}`;
            cover ??= { url, alt };
            blocks.push({ type: "image", url, alt, caption: `Photo : ${notebook.name}` });
        }
        if (entry.words) blocks.push({ type: "p", text: entry.words });
        if (place) blocks.push({ type: "place", slug: place.slug, note: "" });
    }
    if (blocks.length === 0) return false;
    if (notebook.link) blocks.push({ type: "p", text: `Retrouve ${notebook.name} : [${notebook.link.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "")}](${notebook.link})` });

    const columns = readPostChanges({ title_fr: title, body_fr: blocks, body_en: [], author: notebook.name, tags: [GUEST_TAG, mark], topic: "guide", city: firstCity, cover_url: cover?.url ?? null, cover_alt: cover?.alt ?? null, status: "DRAFT" });
    const saved = await db.from("nt_posts").insert({ ...columns, slug: await uniquePostSlug(db, title) });
    if (saved.error) throw saved.error;

    // Their card, which becomes their page once the team publishes a notebook.
    try {
        await saveGuestCard(invitation, { name: notebook.name, handle: notebook.handle, link: notebook.link, portrait: notebook.portrait, intro: notebook.intro });
    } catch (error) {
        console.error("Guest card not saved:", error);
    }

    // Places the site does not have yet go to the team's queue, marked as the guest's.
    const proposed = notebook.entries.flatMap((entry) => (entry.fresh ? [entry] : []));
    if (proposed.length) {
        const queued = await db.from("nt_spot_submissions").insert(
            proposed.map((entry) => ({
                name: entry.fresh!.name,
                category: null,
                city: cityBySlug(entry.fresh!.city)?.name ?? "Yaoundé",
                landmark: entry.fresh!.where || null,
                description: [`Proposé par ${notebook.name}, invité(e) de NiceThings (carnet « ${title} »).`, entry.words].filter(Boolean).join("\n").slice(0, 900),
                status: "PENDING",
            }))
        );
        // The notebook itself is saved: a proposal that did not go through is not worth failing for.
        if (queued.error) console.error("Guest places not proposed:", queued.error);
    }
    return true;
}
