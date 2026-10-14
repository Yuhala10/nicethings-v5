import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { DEFAULT_CITY, cityBySlug } from "./cities";
import { fill, getDictionary, type Locale } from "./i18n";
import { localised, type PostSummary } from "./blog/server";
import { TOPICS, isTopic, topicLabel } from "./blog/topics";
import { FOUNDER } from "./founder";
import { Brand, OG_SIZE, TEXT_FONT, TITLE_FONT, ogCard, ogFonts } from "./og";
import { categoryStyle, cuisineLabel } from "./places/display";
import type { PlaceDetail } from "./places/types";
import type { PollState } from "./polls";
import { CATEGORIES, tagLabel } from "./tags";

// Link previews (WhatsApp, Facebook, X). WhatsApp builds the preview on the
// sender's phone, often on mobile data: if the image is slow or heavy, the
// message leaves as a bare link. So previews are small JPEGs, made once and
// then served from Vercel's cache for a year. Their URL carries a version
// built from everything drawn on them, so an edit gives a fresh image.

const DESIGN = "5"; // bump when the drawings below change
const QUALITY = 80;

export const SHARE_CACHE = "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800";

function version(parts: unknown[]) {
    return createHash("sha1").update(JSON.stringify([DESIGN, ...parts])).digest("hex").slice(0, 10);
}

export function placeShareImage(place: PlaceDetail, lang: Locale) {
    const v = version([lang, place.name, place.category, place.cuisine, place.neighborhood, place.city, place.verified, place.photos[0]?.url ?? null]);
    return {
        url: `/api/share/place/${place.slug}?l=${lang}&v=${v}`,
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        alt: place.name,
        type: "image/jpeg",
    };
}

export function siteShareImage(lang: Locale) {
    return {
        url: `/api/share/site?l=${lang}&v=${version([lang])}`,
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        alt: "NiceThings — Cameroun",
        type: "image/jpeg",
    };
}

async function toJpeg(response: Promise<ImageResponse>) {
    return sharp(Buffer.from(await (await response).arrayBuffer())).jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
}

export async function siteShareJpeg(lang: Locale) {
    const t = getDictionary(lang);
    return toJpeg(
        ogCard({
            eyebrow: "Yaoundé · Douala · Kribi · +17",
            title: t.meta.tagline,
            footer: lang === "fr" ? "20 villes du Cameroun" : "20 cities in Cameroon",
        })
    );
}

function Check() {
    return (
        <svg width="26" height="26" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="12" fill="#1d9bf0" />
            <path d="M7 12.4l3.2 3.2L17.2 8.6" stroke="white" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

type PhotoCard = { chip: string; tone: string; title: string; subline: string; badge?: string };

// Text and shading drawn over a photo (transparent elsewhere).
async function photoOverlay({ chip, tone, title, subline, badge }: PhotoCard) {
    const size = title.length > 52 ? 50 : title.length > 34 ? 60 : title.length > 22 ? 76 : 92;

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    fontFamily: TEXT_FONT,
                    fontWeight: 500,
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 430,
                        background: "linear-gradient(to top, rgba(11,8,6,0.94) 0%, rgba(11,8,6,0.62) 45%, rgba(11,8,6,0) 100%)",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: 0,
                        height: 170,
                        background: "linear-gradient(to bottom, rgba(11,8,6,0.5) 0%, rgba(11,8,6,0) 100%)",
                    }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "40px 48px 0" }}>
                    <div style={{ display: "flex", padding: "10px 24px 10px 10px", borderRadius: 999, background: "rgba(11,8,6,0.55)" }}>
                        <Brand />
                    </div>
                    {badge && (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px 10px 12px", borderRadius: 999, background: "rgba(255,255,255,0.94)", color: "#17120e", fontSize: 24, fontWeight: 700 }}>
                            <Check />
                            {badge}
                        </div>
                    )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", padding: "0 56px 48px" }}>
                    <div style={{ display: "flex" }}>
                        <div style={{ display: "flex", padding: "8px 18px", borderRadius: 999, background: tone, color: "white", fontSize: 24, fontWeight: 700 }}>
                            {chip}
                        </div>
                    </div>
                    <div style={{ display: "flex", marginTop: 16, fontFamily: TITLE_FONT, fontSize: size, fontWeight: 800, color: "white", lineHeight: 1.04, letterSpacing: "-0.03em" }}>
                        {title}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14 }}>
                        <div style={{ display: "flex", fontSize: 30, color: "rgba(255,255,255,0.9)" }}>{subline}</div>
                        <div style={{ display: "flex", fontSize: 22, color: "rgba(255,255,255,0.65)" }}>nicethings.site</div>
                    </div>
                </div>
            </div>
        ),
        { ...OG_SIZE, fonts: await ogFonts() }
    );
}

// A photo cropped on its most interesting part, under the text. null when
// the photo cannot be fetched, so callers fall back to the colour card.
async function photoJpeg(url: string, card: PhotoCard) {
    try {
        const photo = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!photo.ok) throw new Error(`Photo ${photo.status}`);
        const overlay = Buffer.from(await (await photoOverlay(card)).arrayBuffer());
        return await sharp(Buffer.from(await photo.arrayBuffer()))
            .rotate()
            .resize(OG_SIZE.width, OG_SIZE.height, { fit: "cover", position: sharp.strategy.attention })
            .composite([{ input: overlay }])
            .jpeg({ quality: QUALITY, mozjpeg: true })
            .toBuffer();
    } catch (error) {
        console.error("Share photo failed, using the card:", error);
        return null;
    }
}

// ---- The card of a place ---------------------------------------------------
// What a shared place looks like in a conversation, drawn like the cards of
// the site: the photo on one side and, on paper beside it, the kind of
// place, its name in the serif, the tick, where it is, and a button that
// says the card can be tapped. Few things, drawn large: a messaging app
// shows this picture a few centimetres wide. Prices and hours are left to
// the words the app prints under it (the page's own title and description).

const PAPER = "#faf7f2";
const INK = "#15110e";
const SOFT = "#6f665d";
const BRAND = "#c0471b";
const SERIF_FONT = "Instrument Serif";
const PHOTO_WIDTH = 640; // of the card's 1200

let serif: Promise<Buffer> | undefined;
async function cardFonts() {
    serif ??= readFile(join(process.cwd(), "assets/fonts", "InstrumentSerif-Regular.ttf"));
    return [...(await ogFonts()), { name: SERIF_FONT, data: await serif, weight: 400 as const, style: "normal" as const }];
}

type PlaceCard = { kicker: string; title: string; area: string; badge?: string; cta: string; tone: string };

// The kind of place as the site's cards say it: what a restaurant serves, else the category.
export function placeKicker(place: PlaceDetail, lang: Locale) {
    return (place.category === "Restaurant" && cuisineLabel(place.cuisine, lang, 2)) || tagLabel(CATEGORIES, place.category, lang);
}

// Everything but the photo: clear where the photo shows, paper under the words.
async function placeCardOverlay({ kicker, title, area, badge, cta, tone }: PlaceCard, plain: boolean) {
    const size = title.length > 44 ? 50 : title.length > 30 ? 58 : title.length > 20 ? 68 : title.length > 12 ? 80 : 96;

    return new ImageResponse(
        (
            <div style={{ width: "100%", height: "100%", display: "flex", fontFamily: TEXT_FONT, fontWeight: 500 }}>
                <div
                    style={{
                        width: PHOTO_WIDTH,
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        // A place without a photo: its category's colour and its initial.
                        background: plain ? `linear-gradient(135deg, ${tone}, ${tone}cc 55%, #1a0a05 140%)` : "transparent",
                    }}
                >
                    {plain && <div style={{ display: "flex", fontFamily: SERIF_FONT, fontWeight: 400, fontSize: 360, lineHeight: 1, color: "rgba(255,255,255,0.92)" }}>{title.trim().charAt(0).toLocaleUpperCase()}</div>}
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", background: PAPER, color: INK, padding: "42px 46px 44px" }}>
                    <div style={{ display: "flex", fontFamily: TITLE_FONT, fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em" }}>
                        Nice<span style={{ color: BRAND }}>Things</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: "0.09em", color: BRAND }}>{kicker}</div>
                        <div style={{ display: "flex", marginTop: 10, fontFamily: SERIF_FONT, fontWeight: 400, fontSize: size, lineHeight: 1.02, letterSpacing: "-0.01em" }}>{title}</div>
                        {badge && (
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18, fontSize: 28, fontWeight: 700 }}>
                                <svg width="32" height="32" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="12" fill="#1d9bf0" />
                                    <path d="M7 12.4l3.2 3.2L17.2 8.6" stroke="white" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {badge}
                            </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, fontSize: 30, color: SOFT }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={SOFT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            {area}
                        </div>
                    </div>
                    <div style={{ display: "flex" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 30px", borderRadius: 999, background: BRAND, color: "white", fontSize: 30, fontWeight: 700 }}>
                            {cta}
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14" />
                                <path d="m12 5 7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        ),
        { ...OG_SIZE, fonts: await cardFonts() }
    );
}

export async function placeShareJpeg(place: PlaceDetail, lang: Locale) {
    const t = getDictionary(lang);
    const city = (cityBySlug(place.city) ?? DEFAULT_CITY).name;
    const card: PlaceCard = {
        kicker: placeKicker(place, lang).toLocaleUpperCase(lang),
        title: place.name,
        area: [place.neighborhood, city].filter(Boolean).join(", "),
        badge: place.verified ? t.trust.verifiedTitle : undefined,
        cta: t.poll.seePlace,
        tone: categoryStyle(place.category).tone,
    };

    let photo: Buffer | null = null;
    const cover = place.photos[0]?.url;
    if (cover) {
        try {
            const fetched = await fetch(cover, { signal: AbortSignal.timeout(8000) });
            if (!fetched.ok) throw new Error(`Photo ${fetched.status}`);
            // Cropped on its most interesting part.
            photo = await sharp(Buffer.from(await fetched.arrayBuffer()))
                .rotate()
                .resize(PHOTO_WIDTH, OG_SIZE.height, { fit: "cover", position: sharp.strategy.attention })
                .toBuffer();
        } catch (error) {
            console.error("Share photo failed, using the colour:", error);
        }
    }
    const overlay = Buffer.from(await (await placeCardOverlay(card, !photo)).arrayBuffer());
    return sharp({ create: { ...OG_SIZE, channels: 3, background: PAPER } })
        .composite([...(photo ? [{ input: photo, top: 0, left: 0 }] : []), { input: overlay, top: 0, left: 0 }])
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toBuffer();
}

// ---- The card of a vote ----------------------------------------------------
// "On se voit où ?" dropped in a group chat: the places proposed side by
// side, each with its number, and on paper beside them the question, their
// names and a button to vote. The votes themselves are not drawn: the card
// is made once and must stay true.

export function pollShareImage(poll: PollState, lang: Locale) {
    const v = version(["poll", lang, poll.code, poll.title, poll.options.map((option) => [option.place.name, option.place.cover])]);
    return {
        url: `/api/share/poll/${poll.code}?l=${lang}&v=${v}`,
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        alt: poll.title ?? getDictionary(lang).poll.eyebrow,
        type: "image/jpeg",
    };
}

type Tile = { left: number; top: number; width: number; height: number };

// Where each place's picture goes in the photo side of the card, for one to four places.
function pollTiles(count: number): Tile[] {
    const gap = 4;
    const half = (PHOTO_WIDTH - gap) / 2;
    const tall = OG_SIZE.height;
    const short = (OG_SIZE.height - gap) / 2;
    if (count <= 1) return [{ left: 0, top: 0, width: PHOTO_WIDTH, height: tall }];
    if (count === 2) return [0, 1].map((column) => ({ left: column * (half + gap), top: 0, width: half, height: tall }));
    if (count === 3) return [{ left: 0, top: 0, width: half, height: tall }, ...[0, 1].map((row) => ({ left: half + gap, top: row * (short + gap), width: half, height: short }))];
    return [0, 1, 2, 3].map((index) => ({ left: (index % 2) * (half + gap), top: Math.floor(index / 2) * (short + gap), width: half, height: short }));
}

async function pollOverlay(poll: PollState, tiles: Tile[], plain: boolean[], lang: Locale) {
    const t = getDictionary(lang);
    const title = poll.title ?? t.poll.title;
    const size = title.length > 34 ? 52 : title.length > 22 ? 62 : title.length > 12 ? 74 : 88;
    const short = (name: string) => (name.length > 26 ? `${name.slice(0, 25).trimEnd()}…` : name);
    const options = poll.options.slice(0, tiles.length);

    return new ImageResponse(
        (
            <div style={{ width: "100%", height: "100%", display: "flex", fontFamily: TEXT_FONT, fontWeight: 500 }}>
                <div style={{ width: PHOTO_WIDTH, height: "100%", display: "flex", position: "relative" }}>
                    {tiles.map((tile, index) => (
                        <div
                            key={index}
                            style={{
                                position: "absolute",
                                left: tile.left,
                                top: tile.top,
                                width: tile.width,
                                height: tile.height,
                                display: "flex",
                                padding: 18,
                                // A place without a photo keeps its category's colour.
                                background: plain[index] ? `linear-gradient(135deg, ${categoryStyle(options[index].place.category).tone}, #1a0a05 150%)` : "transparent",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 54, height: 54, borderRadius: 999, background: "rgba(255,255,255,0.95)", color: INK, fontSize: 30, fontWeight: 700 }}>{index + 1}</div>
                        </div>
                    ))}
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", background: PAPER, color: INK, padding: "42px 46px 44px" }}>
                    <div style={{ display: "flex", fontFamily: TITLE_FONT, fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em" }}>
                        Nice<span style={{ color: BRAND }}>Things</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: "0.09em", color: BRAND }}>{t.poll.eyebrow.toLocaleUpperCase(lang)}</div>
                        <div style={{ display: "flex", marginTop: 10, fontFamily: SERIF_FONT, fontWeight: 400, fontSize: size, lineHeight: 1.02, letterSpacing: "-0.01em" }}>{title}</div>
                        <div style={{ display: "flex", flexDirection: "column", marginTop: 20, gap: 8 }}>
                            {options.map((option, index) => (
                                <div key={option.place.slug} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28 }}>
                                    <div style={{ display: "flex", width: 26, fontWeight: 700, color: BRAND }}>{index + 1}</div>
                                    <div style={{ display: "flex", fontWeight: 700 }}>{short(option.place.name)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: "flex" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 30px", borderRadius: 999, background: BRAND, color: "white", fontSize: 30, fontWeight: 700 }}>
                            {t.poll.cardCta}
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14" />
                                <path d="m12 5 7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        ),
        { ...OG_SIZE, fonts: await cardFonts() }
    );
}

export async function pollShareJpeg(poll: PollState, lang: Locale) {
    const tiles = pollTiles(Math.min(poll.options.length, 4));
    const photos = await Promise.all(
        tiles.map(async (tile, index) => {
            const cover = poll.options[index].place.cover;
            if (!cover) return null;
            try {
                const fetched = await fetch(cover, { signal: AbortSignal.timeout(8000) });
                if (!fetched.ok) throw new Error(`Photo ${fetched.status}`);
                return await sharp(Buffer.from(await fetched.arrayBuffer()))
                    .rotate()
                    .resize(Math.round(tile.width), Math.round(tile.height), { fit: "cover", position: sharp.strategy.attention })
                    .toBuffer();
            } catch (error) {
                console.error("Vote photo failed, using the colour:", error);
                return null;
            }
        })
    );
    const overlay = Buffer.from(await (await pollOverlay(poll, tiles, photos.map((photo) => photo === null), lang)).arrayBuffer());
    return sharp({ create: { ...OG_SIZE, channels: 3, background: PAPER } })
        .composite([...photos.flatMap((photo, index) => (photo ? [{ input: photo, top: Math.round(tiles[index].top), left: Math.round(tiles[index].left) }] : [])), { input: overlay, top: 0, left: 0 }])
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toBuffer();
}

// ---- The card of a personal invitation -------------------------------------
// What a guest receives: their own name, set like a printed invitation, in
// ink with a champagne line. No photo: the name is the picture.

const CHAMPAGNE = "#d9bc8c";

export function invitationShareImage(name: string, lang: Locale) {
    return {
        url: `/api/share/invitation?n=${encodeURIComponent(name)}&l=${lang}&v=${version(["invitation", lang, name])}`,
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        alt: name,
        type: "image/jpeg",
    };
}

export async function invitationShareJpeg(name: string, lang: Locale) {
    const t = getDictionary(lang);
    const size = name.length > 26 ? 84 : name.length > 18 ? 104 : name.length > 11 ? 128 : 156;
    return toJpeg(
        Promise.resolve(
            new ImageResponse(
                (
                    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: INK, color: PAPER, fontFamily: TEXT_FONT, fontWeight: 500, overflow: "hidden" }}>
                        <div style={{ position: "absolute", top: -320, right: -220, width: 820, height: 820, borderRadius: 999, background: "radial-gradient(circle, rgba(192,71,27,0.34), rgba(21,17,14,0) 68%)" }} />
                        <div style={{ position: "absolute", bottom: -380, left: -260, width: 760, height: 760, borderRadius: 999, background: "radial-gradient(circle, rgba(217,188,140,0.16), rgba(21,17,14,0) 68%)" }} />
                        {/* The frame of a printed card. */}
                        <div style={{ position: "absolute", top: 26, left: 26, right: 26, bottom: 26, borderRadius: 30, border: `2px solid ${CHAMPAGNE}`, opacity: 0.55 }} />
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "70px 84px 64px" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: "0.32em", color: CHAMPAGNE }}>{t.invitation.label.toLocaleUpperCase(lang)}</div>
                                <div style={{ display: "flex", marginTop: 22, width: 90, height: 2, background: CHAMPAGNE, opacity: 0.7 }} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <div style={{ display: "flex", textAlign: "center", fontFamily: SERIF_FONT, fontWeight: 400, fontSize: size, lineHeight: 1, letterSpacing: "-0.015em" }}>{name}</div>
                                <div style={{ display: "flex", marginTop: 22, fontFamily: SERIF_FONT, fontWeight: 400, fontSize: 46, color: CHAMPAGNE }}>{t.invitation.invites}</div>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                                <div style={{ display: "flex", fontFamily: TITLE_FONT, fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em" }}>
                                    Nice<span style={{ color: "#ff7a3d" }}>Things</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 30px", borderRadius: 999, background: PAPER, color: INK, fontSize: 30, fontWeight: 700 }}>
                                    {t.invitation.open}
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14" />
                                        <path d="m12 5 7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                ),
                { ...OG_SIZE, fonts: await cardFonts() }
            )
        )
    );
}

export function postShareImage(post: PostSummary, lang: Locale) {
    const { title } = localised(post, lang);
    const v = version([lang, title, post.topic, post.cover, post.readingMinutes]);
    return {
        url: `/api/share/post/${post.slug}?l=${lang}&v=${v}`,
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        alt: title,
        type: "image/jpeg",
    };
}

// An article: its cover under the title, or the colour card.
export async function postShareJpeg(post: PostSummary, lang: Locale) {
    const t = getDictionary(lang);
    const card = {
        chip: `${t.blog.title} · ${topicLabel(post.topic, lang)}`,
        tone: isTopic(post.topic) ? TOPICS[post.topic].tone : "#ff5b36",
        title: localised(post, lang).title,
        subline: fill(t.blog.readTime, { n: post.readingMinutes }),
    };
    const photo = post.cover ? await photoJpeg(post.cover, card) : null;
    return photo ?? toJpeg(ogCard({ eyebrow: card.chip, title: card.title, footer: card.subline, tone: card.tone }));
}

export function founderShareImage(lang: Locale) {
    return {
        url: `/api/share/founder?l=${lang}&v=${version([lang, FOUNDER.name, FOUNDER.role[lang], FOUNDER.pull[lang]])}`,
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        alt: `${FOUNDER.name}, ${FOUNDER.role[lang]}`,
        type: "image/jpeg",
    };
}

// The founder's card: his name and his line, in words only (no picture of
// him is shown anywhere, by his choice).
export function founderShareJpeg(lang: Locale) {
    return toJpeg(ogCard({ eyebrow: FOUNDER.role[lang], title: FOUNDER.name, footer: FOUNDER.pull[lang].join(" "), tone: "#c0471b" }));
}

// ---- A guest's page ------------------------------------------------------------
// "Yaoundé, vu par …", set like their invitation: ink, a champagne frame,
// their photo. Two sizes: the card a conversation shows when their page is
// shared, and the tall picture they post as a story (their link goes on it
// as a sticker, so the address is written large enough to copy).

export type GuestCardFacts = { slug: string; name: string; handle: string | null; number: number | null; city: string | null; cover: string | null };

const STORY_SIZE = { width: 1080, height: 1920 };
const GUEST_PHOTO_WIDTH = 520; // of the card's 1200

function guestVersion(guest: GuestCardFacts, lang: Locale) {
    return version(["guest", lang, guest.name, guest.handle, guest.number, guest.city, guest.cover]);
}

export function guestShareImage(guest: GuestCardFacts, lang: Locale) {
    return {
        url: `/api/share/guest/${guest.slug}?l=${lang}&v=${guestVersion(guest, lang)}`,
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        alt: guest.name,
        type: "image/jpeg",
    };
}

export function guestStoryImage(guest: GuestCardFacts, lang: Locale) {
    return `/api/share/guest/${guest.slug}?l=${lang}&f=story&v=${guestVersion(guest, lang)}`;
}

function guestWords(guest: GuestCardFacts, lang: Locale) {
    const t = getDictionary(lang);
    const city = cityBySlug(guest.city)?.name ?? t.guestPage.country;
    return {
        city: fill(t.guestPage.cityLine, { city }),
        by: fill(t.guestPage.byLine, { name: guest.name }),
        seal: [t.guest.seal, guest.number ? fill(t.guestPage.number, { number: String(guest.number).padStart(2, "0") }) : null].filter(Boolean).join(" · ").toLocaleUpperCase(lang),
    };
}

async function guestPhoto(url: string | null, width: number, height: number) {
    if (!url) return null;
    try {
        const fetched = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!fetched.ok) throw new Error(`Photo ${fetched.status}`);
        return await sharp(Buffer.from(await fetched.arrayBuffer())).rotate().resize(width, height, { fit: "cover", position: sharp.strategy.attention }).toBuffer();
    } catch (error) {
        console.error("Guest photo failed, using the initial:", error);
        return null;
    }
}

export async function guestShareJpeg(guest: GuestCardFacts, lang: Locale) {
    const t = getDictionary(lang);
    const words = guestWords(guest, lang);
    const size = words.by.length > 30 ? 54 : words.by.length > 22 ? 64 : words.by.length > 15 ? 76 : 90;
    const photo = await guestPhoto(guest.cover, GUEST_PHOTO_WIDTH, OG_SIZE.height);
    const overlay = new ImageResponse(
        (
            <div style={{ width: "100%", height: "100%", display: "flex", fontFamily: TEXT_FONT, fontWeight: 500 }}>
                <div style={{ width: GUEST_PHOTO_WIDTH, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: photo ? "transparent" : `linear-gradient(135deg, #2a2019, ${INK})` }}>
                    {!photo && <div style={{ display: "flex", fontFamily: SERIF_FONT, fontWeight: 400, fontSize: 340, lineHeight: 1, color: CHAMPAGNE }}>{guest.name.trim().charAt(0).toLocaleUpperCase()}</div>}
                </div>
                <div style={{ flex: 1, display: "flex", position: "relative", background: INK, color: PAPER, overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: -260, right: -260, width: 640, height: 640, borderRadius: 999, background: "radial-gradient(circle, rgba(192,71,27,0.32), rgba(21,17,14,0) 68%)" }} />
                    <div style={{ position: "absolute", top: 22, left: 22, right: 22, bottom: 22, borderRadius: 24, border: `2px solid ${CHAMPAGNE}`, opacity: 0.5 }} />
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", padding: "52px 56px 50px" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ display: "flex", fontFamily: TITLE_FONT, fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em" }}>
                                Nice<span style={{ color: "#ff7a3d" }}>Things</span>
                            </div>
                            <div style={{ display: "flex", marginTop: 14, fontSize: 19, fontWeight: 700, letterSpacing: "0.2em", color: CHAMPAGNE }}>{words.seal}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ display: "flex", fontFamily: SERIF_FONT, fontWeight: 400, fontSize: 52, lineHeight: 1, color: CHAMPAGNE }}>{words.city}</div>
                            <div style={{ display: "flex", marginTop: 8, fontFamily: SERIF_FONT, fontWeight: 400, fontSize: size, lineHeight: 1.02, letterSpacing: "-0.01em" }}>{words.by}</div>
                            {guest.handle && <div style={{ display: "flex", marginTop: 16, fontSize: 28, color: "rgba(250,247,242,0.7)" }}>{guest.handle}</div>}
                        </div>
                        <div style={{ display: "flex" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 28px", borderRadius: 999, background: PAPER, color: INK, fontSize: 28, fontWeight: 700 }}>
                                {t.guestPage.cardCta}
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14" />
                                    <path d="m12 5 7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ),
        { ...OG_SIZE, fonts: await cardFonts() }
    );
    const drawn = Buffer.from(await overlay.arrayBuffer());
    return sharp({ create: { ...OG_SIZE, channels: 3, background: INK } })
        .composite([...(photo ? [{ input: photo, top: 0, left: 0 }] : []), { input: drawn, top: 0, left: 0 }])
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toBuffer();
}

export async function guestStoryJpeg(guest: GuestCardFacts, lang: Locale, address: string) {
    const t = getDictionary(lang);
    const words = guestWords(guest, lang);
    const size = words.by.length > 30 ? 92 : words.by.length > 22 ? 108 : words.by.length > 15 ? 124 : 140;
    const photoHeight = 1240;
    const photo = await guestPhoto(guest.cover, STORY_SIZE.width, photoHeight);
    const overlay = new ImageResponse(
        (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", fontFamily: TEXT_FONT, fontWeight: 500, color: PAPER }}>
                {/* The photo fades into the ink where the words begin. */}
                <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 300, background: "linear-gradient(to bottom, rgba(21,17,14,0.75), rgba(21,17,14,0))" }} />
                <div style={{ position: "absolute", left: 0, right: 0, top: photoHeight - 520, height: 520, background: `linear-gradient(to bottom, rgba(21,17,14,0), ${INK})` }} />
                {!photo && <div style={{ position: "absolute", left: 0, right: 0, top: 260, display: "flex", justifyContent: "center", fontFamily: SERIF_FONT, fontWeight: 400, fontSize: 620, lineHeight: 1, color: CHAMPAGNE, opacity: 0.85 }}>{guest.name.trim().charAt(0).toLocaleUpperCase()}</div>}
                <div style={{ position: "absolute", top: 34, left: 34, right: 34, bottom: 34, borderRadius: 40, border: `3px solid ${CHAMPAGNE}`, opacity: 0.55 }} />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 96 }}>
                    <div style={{ display: "flex", fontFamily: TITLE_FONT, fontSize: 52, fontWeight: 800, letterSpacing: "-0.03em" }}>
                        Nice<span style={{ color: "#ff7a3d" }}>Things</span>
                    </div>
                    <div style={{ display: "flex", marginTop: 18, padding: "10px 26px", borderRadius: 999, border: `2px solid ${CHAMPAGNE}`, fontSize: 26, fontWeight: 700, letterSpacing: "0.2em", color: CHAMPAGNE, background: "rgba(21,17,14,0.45)" }}>{words.seal}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 80px 120px", textAlign: "center" }}>
                    <div style={{ display: "flex", fontFamily: SERIF_FONT, fontWeight: 400, fontSize: 86, lineHeight: 1, color: CHAMPAGNE }}>{words.city}</div>
                    <div style={{ display: "flex", marginTop: 10, fontFamily: SERIF_FONT, fontWeight: 400, fontSize: size, lineHeight: 1, letterSpacing: "-0.01em", textAlign: "center" }}>{words.by}</div>
                    <div style={{ display: "flex", marginTop: 34, fontSize: 40, color: "rgba(250,247,242,0.75)" }}>{t.guestPage.storyLine}</div>
                    <div style={{ display: "flex", marginTop: 54, padding: "22px 40px", borderRadius: 999, background: PAPER, color: INK, fontSize: 34, fontWeight: 700 }}>{address}</div>
                </div>
            </div>
        ),
        { ...STORY_SIZE, fonts: await cardFonts() }
    );
    const drawn = Buffer.from(await overlay.arrayBuffer());
    return sharp({ create: { ...STORY_SIZE, channels: 3, background: INK } })
        .composite([...(photo ? [{ input: photo, top: 0, left: 0 }] : []), { input: drawn, top: 0, left: 0 }])
        .jpeg({ quality: 86, mozjpeg: true })
        .toBuffer();
}
