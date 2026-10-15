import { unstable_cache } from "next/cache";
import { notInstalled } from "./atlas/store";
import { isGuest } from "./blog/guest";
import { POSTS_TAG, getPost, getPosts, toPost, type Post, type PostSummary } from "./blog/server";
import { createInvitation, type Invitation, type Tier } from "./invitations";
import { slugify } from "./places/paths";
import { getSupabaseAdminClient } from "./supabase/admin";

// Guests' pages (server only): "Yaoundé, vu par …".
//
// Someone the team invited (lib/invitations.ts) sends a notebook of the
// places they love, and with it their guest's card: a photo of themselves,
// their account, one sentence about who they are (database script 009). The
// card stays private until the team publishes one of their notebooks; from
// then on it is their page, numbered in the order guests came out, with the
// hearts of the people who liked their places. Nothing about a person is
// shown that they did not send themselves and agree to.
//
// Two ranks (database script 010): guests of honour lead every list, in
// green and gold, numbered among themselves, with their own short address
// and three invitations of their own to give.

export const GUESTS_TAG = "guests";
export const GIFTS = 3; // invitations a guest of honour may give

export type GuestPick = { name: string; slug: string | null; photos: string[]; words: string };

export type Guest = {
    ref: string;
    tier: Tier;
    invitedBy: string | null; // ref of the guest of honour who invited them
    giftsGiven: number;
    slug: string;
    name: string;
    handle: string | null;
    link: string | null;
    portrait: string | null;
    intro: string | null;
    hearts: number;
    number: number | null; // the n° of a published guest, in the order they came out, within their rank
    city: string | null; // where most of their places are
    cover: string | null; // their portrait, else their first photo
    places: string[]; // every place of their published notebooks
    notebooks: PostSummary[]; // published, newest first
    since: string | null; // when their first notebook came out
};

type Row = {
    ref: string;
    slug: string;
    name: string;
    handle: string | null;
    link: string | null;
    portrait_url: string | null;
    intro: string | null;
    hearts: number | null;
    // From script 010; absent before it is run.
    tier?: string | null;
    invited_by?: string | null;
    gifts_given?: number | null;
};

const REF = /^carnet-([0-9a-f]{12})$/;
export const refOf = (post: { tags: string[] }) => post.tags.map((tag) => REF.exec(tag)?.[1]).find(Boolean) ?? null;

function toGuest(row: Row, notebooks: PostSummary[], number: number | null): Guest {
    const cities = new Map<string, number>();
    for (const post of notebooks) if (post.city) cities.set(post.city, (cities.get(post.city) ?? 0) + 1);
    const places = [...new Set(notebooks.flatMap((post) => post.places))];
    return {
        ref: row.ref,
        tier: row.tier === "honour" ? "honour" : "guest",
        invitedBy: row.invited_by ?? null,
        giftsGiven: row.gifts_given ?? 0,
        slug: row.slug,
        name: row.name,
        handle: row.handle,
        link: row.link,
        portrait: row.portrait_url,
        intro: row.intro,
        hearts: row.hearts ?? 0,
        number,
        city: [...cities].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
        cover: row.portrait_url ?? notebooks.find((post) => post.cover)?.cover ?? null,
        places,
        notebooks,
        since: notebooks.length ? notebooks.map((post) => post.publishedAt).sort()[0] : null,
    };
}

// Every guest with at least one published notebook, the first to come out
// first. Empty until database script 009 has been run.
async function loadGuests(): Promise<Guest[]> {
    const notebooks = (await getPosts()).filter(isGuest);
    const byRef = new Map<string, PostSummary[]>();
    for (const post of notebooks) {
        const ref = refOf(post);
        if (ref) byRef.set(ref, [...(byRef.get(ref) ?? []), post]);
    }
    if (!byRef.size) return [];
    const { data, error } = await getSupabaseAdminClient().from("nt_guests").select("*").in("ref", [...byRef.keys()]);
    if (error) {
        if (notInstalled(error)) return [];
        throw error;
    }
    const first = (ref: string) => (byRef.get(ref) ?? []).map((post) => post.publishedAt).sort()[0] ?? "";
    // Guests of honour first; each rank numbered in the order its guests came out.
    const rows = ((data ?? []) as Row[]).sort((a, b) => Number(b.tier === "honour") - Number(a.tier === "honour") || first(a.ref).localeCompare(first(b.ref)));
    const counted = { honour: 0, guest: 0 };
    return rows.map((row) => toGuest(row, byRef.get(row.ref) ?? [], ++counted[row.tier === "honour" ? "honour" : "guest"]));
}

export const getGuests = unstable_cache(loadGuests, ["guests:all:v1"], { revalidate: 300, tags: [POSTS_TAG, GUESTS_TAG] });

export async function getGuest(slug: string) {
    return (await getGuests().catch(() => [])).find((guest) => guest.slug === slug) ?? null;
}

export async function guestsForPlace(slug: string) {
    return (await getGuests().catch(() => [])).filter((guest) => guest.places.includes(slug));
}

// A guest's page as the team previews it before anything is out: their
// card and every notebook they sent, drafts included.
export async function previewGuest(slug: string): Promise<{ guest: Guest; posts: Post[] } | null> {
    const db = getSupabaseAdminClient();
    const { data, error } = await db.from("nt_guests").select("*").eq("slug", slug).maybeSingle();
    if (error || !data) return null;
    const row = data as Row;
    const sent = await db.from("nt_posts").select("*").contains("tags", [`carnet-${row.ref}`]).order("created_at", { ascending: false });
    if (sent.error) throw sent.error;
    const posts = (sent.data ?? []).map((item) => toPost(item));
    const all = await getGuests().catch(() => []);
    const published = all.find((guest) => guest.ref === row.ref);
    const rank = row.tier === "honour" ? "honour" : "guest";
    return { guest: toGuest(row, posts, published?.number ?? all.filter((guest) => guest.tier === rank).length + 1), posts };
}

// The full notebooks of a published guest, newest first.
export async function guestPosts(guest: Guest) {
    return (await Promise.all(guest.notebooks.map((post) => getPost(post.slug).catch(() => null)))).filter((post): post is Post => Boolean(post));
}

// A notebook read back as the guest wrote it (lib/invitations-server.ts):
// each place under its name, with their photos and their words. A notebook
// the team reworked still reads, section by section.
export function picksOf(posts: Post[], guest: Pick<Guest, "link">): GuestPick[] {
    const picks: GuestPick[] = [];
    for (const post of posts) {
        let current: GuestPick | null = null;
        for (const block of post.body.fr) {
            if (block.type === "h2") {
                current = { name: block.text, slug: null, photos: [], words: "" };
                picks.push(current);
            } else if (!current) {
                continue;
            } else if (block.type === "image") {
                current.photos.push(block.url);
            } else if (block.type === "place") {
                current.slug ??= block.slug;
            } else if (block.type === "p" && !current.words && !(guest.link && block.text.includes(guest.link)) && !/^Retrouve /.test(block.text)) {
                current.words = block.text;
            }
        }
    }
    const seen = new Set<string>();
    return picks.filter((pick) => {
        const key = pick.slug ?? pick.name.toLowerCase();
        if (seen.has(key) || !(pick.photos.length || pick.words || pick.slug)) return false;
        seen.add(key);
        return true;
    });
}

// ---- The guest's own numbers (their private page) --------------------------
// Counted from the anonymous audience log (people only, never the team):
// how many opened their page, and how many of those then opened one of
// their places. Plus hearts and the kind words the team let through.

export type Reach = { visitors: number; opened: number; hearts: number; words: number };

export async function guestReach(guest: Guest): Promise<Reach> {
    const db = getSupabaseAdminClient();
    const pages = [`/fr/invites/${guest.slug}`, `/en/invites/${guest.slug}`];
    const seen = await db.from("nt_events").select("visitor_id").in("path", pages).limit(20000);
    const viewers = [...new Set((seen.data ?? []).map((row) => row.visitor_id as string))];

    let opened = 0;
    if (viewers.length && guest.places.length) {
        const went = new Set<string>();
        // A few hundred people at a time: their ids travel in the request.
        for (let start = 0; start < Math.min(viewers.length, 1200); start += 150) {
            const chunk = viewers.slice(start, start + 150);
            const rows = await db.from("nt_events").select("visitor_id").in("visitor_id", chunk).in("place", guest.places).limit(5000);
            for (const row of rows.data ?? []) went.add(row.visitor_id as string);
        }
        opened = went.size;
    }

    const ids = guest.notebooks.map((post) => post.id);
    const words = ids.length ? await db.from("nt_post_comments").select("id", { count: "exact", head: true }).in("post_id", ids).eq("status", "APPROVED") : null;
    return { visitors: viewers.length, opened, hearts: guest.hearts, words: words?.count ?? 0 };
}

// ---- What a guest sends -----------------------------------------------------

// "@renafidolly", from "renafidolly", "@renafidolly" or the address of their profile.
export function cleanHandle(value: unknown) {
    if (typeof value !== "string") return null;
    let text = value.trim();
    const fromLink = /^https?:\/\/[^/]+\/(?:@)?([A-Za-z0-9._]{2,30})\/?(?:[?#].*)?$/.exec(text);
    if (fromLink) text = fromLink[1];
    text = text.replace(/^@+/, "");
    return /^[A-Za-z0-9._]{2,30}$/.test(text) ? `@${text}` : null;
}

export function cleanLink(value: unknown) {
    const text = typeof value === "string" ? value.trim().slice(0, 200) : "";
    return /^https:\/\/[^\s"'<>]+$/.test(text) ? text : null;
}

async function freeSlug(wanted: string, ref: string) {
    const db = getSupabaseAdminClient();
    const base = slugify(wanted).slice(0, 40) || "invite";
    const { data, error } = await db.from("nt_guests").select("ref,slug").like("slug", `${base}%`);
    if (error) throw error;
    const taken = new Set((data ?? []).filter((row) => row.ref !== ref).map((row) => row.slug as string));
    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

export type GuestCardInput = { name: string; handle: string | null; link: string | null; portrait: string | null; intro: string | null };

// Keeps the card a guest sent with their notebook. Its address is set the
// first time (from their account's name, else their own) and kept after.
// Before script 009 is run, the notebook still goes through without it.
export async function saveGuestCard(invitation: Invitation, card: GuestCardInput) {
    const db = getSupabaseAdminClient();
    const held = await db.from("nt_guests").select("slug").eq("ref", invitation.ref).maybeSingle();
    if (held.error) {
        if (notInstalled(held.error)) return null;
        throw held.error;
    }
    const slug = (held.data?.slug as string | undefined) ?? (await freeSlug(card.handle?.slice(1) ?? card.name, invitation.ref));
    const now = new Date().toISOString();
    const row = { ref: invitation.ref, slug, name: card.name, handle: card.handle, link: card.link, portrait_url: card.portrait, intro: card.intro, consent_at: now, updated_at: now };
    // The rank and the giver come from the signed invitation, never from what was typed.
    let saved = await db.from("nt_guests").upsert({ ...row, tier: invitation.tier, invited_by: invitation.by }, { onConflict: "ref" });
    // Before script 010, the card is kept without them.
    if (saved.error && /tier|invited_by/.test(saved.error.message)) saved = await db.from("nt_guests").upsert(row, { onConflict: "ref" });
    if (saved.error) throw saved.error;
    return slug;
}

// The card behind an invitation, published or not (for the guest's own page).
export async function guestOfInvitation(invitation: Invitation) {
    const { data, error } = await getSupabaseAdminClient().from("nt_guests").select("*").eq("ref", invitation.ref).maybeSingle();
    if (error || !data) return null;
    const published = (await getGuests().catch(() => [])).find((guest) => guest.ref === invitation.ref) ?? null;
    return { card: data as Row, published };
}

// The guest of honour behind an invitation they gave (their name and page).
export async function giverOf(invitation: Invitation) {
    if (!invitation.by) return null;
    const all = await getGuests().catch(() => []);
    const live = all.find((guest) => guest.ref === invitation.by);
    if (live) return { name: live.name, slug: live.slug as string | null, cover: live.cover };
    const { data } = await getSupabaseAdminClient().from("nt_guests").select("name,portrait_url").eq("ref", invitation.by).maybeSingle();
    return data ? { name: data.name as string, slug: null, cover: (data.portrait_url as string | null) ?? null } : null;
}

// A guest of honour gives one of their three invitations, once their page is
// out. Answers the new invitation's code, or why not.
export async function giveInvitation(invitation: Invitation, name: string) {
    if (invitation.tier !== "honour") return { ok: false as const, why: "rank" };
    const live = (await getGuests().catch(() => [])).find((guest) => guest.ref === invitation.ref);
    if (!live) return { ok: false as const, why: "not-live" };
    const db = getSupabaseAdminClient();
    const { data, error } = await db.from("nt_guests").select("gifts_given").eq("ref", invitation.ref).maybeSingle();
    if (error) throw error;
    const given = (data?.gifts_given as number | undefined) ?? 0;
    if (given >= GIFTS) return { ok: false as const, why: "none-left" };
    // Counted only if nobody gave one at the same moment.
    const counted = await db.from("nt_guests").update({ gifts_given: given + 1 }).eq("ref", invitation.ref).eq("gifts_given", given).select("gifts_given");
    if (counted.error) throw counted.error;
    if (!counted.data?.length) return { ok: false as const, why: "busy" };
    return { ok: true as const, code: createInvitation(name, { by: invitation.ref }), left: GIFTS - given - 1 };
}

// A guest of honour by their page's address (for nicethings.site/@name).
export async function honourBySlug(slug: string) {
    return (await getGuests().catch(() => [])).find((guest) => guest.tier === "honour" && guest.slug === slug) ?? null;
}

// What an invitation's card shows besides the name (lib/share-image.tsx):
// its rank, and the guest of honour who gave it.
export async function invitationLook(invitation: Invitation) {
    let giver: { ref: string; name: string } | null = null;
    if (invitation.by) {
        const { data } = await getSupabaseAdminClient().from("nt_guests").select("name,tier").eq("ref", invitation.by).maybeSingle();
        if (data && data.tier === "honour") giver = { ref: invitation.by, name: data.name as string };
    }
    return { tier: invitation.tier, giver };
}
