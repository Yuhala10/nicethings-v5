import { createHash } from "node:crypto";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { DEFAULT_CITY, cityBySlug } from "./cities";
import { fill, getDictionary, type Locale } from "./i18n";
import { localised, type PostSummary } from "./blog/server";
import { TOPICS, isTopic, topicLabel } from "./blog/topics";
import { FOUNDER } from "./founder";
import { Brand, OG_SIZE, TEXT_FONT, TITLE_FONT, ogCard, ogFonts } from "./og";
import { categoryStyle } from "./places/display";
import type { PlaceDetail } from "./places/types";
import { CATEGORIES, tagLabel } from "./tags";

// Link previews (WhatsApp, Facebook, X). WhatsApp builds the preview on the
// sender's phone, often on mobile data: if the image is slow or heavy, the
// message leaves as a bare link. So previews are small JPEGs, made once and
// then served from Vercel's cache for a year. Their URL carries a version
// built from everything drawn on them, so an edit gives a fresh image.

const DESIGN = "4"; // bump when the drawings below change
const QUALITY = 80;

export const SHARE_CACHE = "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800";

function version(parts: unknown[]) {
    return createHash("sha1").update(JSON.stringify([DESIGN, ...parts])).digest("hex").slice(0, 10);
}

export function placeShareImage(place: PlaceDetail, lang: Locale) {
    const v = version([lang, place.name, place.category, place.neighborhood, place.city, place.verified, place.photos[0]?.url ?? null]);
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

// The place's first photo under its name. Places without a photo keep the
// branded colour card.
export async function placeShareJpeg(place: PlaceDetail, lang: Locale) {
    const t = getDictionary(lang);
    const city = (cityBySlug(place.city) ?? DEFAULT_CITY).name;
    const card = {
        chip: tagLabel(CATEGORIES, place.category, lang),
        tone: categoryStyle(place.category).tone,
        title: place.name,
        subline: [place.neighborhood, city].filter(Boolean).join(" · "),
        badge: place.verified ? t.trust.verifiedTitle : undefined,
    };
    const cover = place.photos[0]?.url;
    const photo = cover ? await photoJpeg(cover, card) : null;
    return photo ?? toJpeg(ogCard({ eyebrow: card.chip, tag: card.badge, title: card.title, footer: card.subline, tone: card.tone }));
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
        url: `/api/share/founder?l=${lang}&v=${version([lang, FOUNDER.name, FOUNDER.role[lang], FOUNDER.pull[lang], FOUNDER.photo])}`,
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        alt: `${FOUNDER.name}, ${FOUNDER.role[lang]}`,
        type: "image/jpeg",
    };
}

// The founder's card: his name on ink and the studio portrait whole on the
// right. (Cropping a standing portrait to a wide card loses the face.)
const PORTRAIT_WIDTH = Math.round((OG_SIZE.height * 3) / 4);

async function founderOverlay(lang: Locale) {
    return new ImageResponse(
        (
            <div style={{ width: "100%", height: "100%", display: "flex", fontFamily: TEXT_FONT, fontWeight: 500 }}>
                <div
                    style={{
                        position: "absolute",
                        left: OG_SIZE.width - PORTRAIT_WIDTH,
                        top: 0,
                        width: 240,
                        height: "100%",
                        background: "linear-gradient(to right, rgba(11,8,6,1) 0%, rgba(11,8,6,0) 100%)",
                    }}
                />
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: OG_SIZE.width - PORTRAIT_WIDTH + 40, padding: "56px 0 52px 64px" }}>
                    <Brand />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex" }}>
                            <div style={{ display: "flex", padding: "8px 18px", borderRadius: 999, background: "#c0471b", color: "white", fontSize: 24, fontWeight: 700 }}>
                                {FOUNDER.role[lang]}
                            </div>
                        </div>
                        <div style={{ display: "flex", marginTop: 18, fontFamily: TITLE_FONT, fontSize: 88, fontWeight: 800, color: "white", lineHeight: 1, letterSpacing: "-0.03em" }}>
                            {FOUNDER.name}
                        </div>
                        <div style={{ display: "flex", marginTop: 22, fontSize: 28, lineHeight: 1.3, color: "rgba(255,255,255,0.82)" }}>{FOUNDER.pull[lang].join(" ")}</div>
                    </div>
                    <div style={{ display: "flex", fontSize: 24, color: "rgba(255,255,255,0.6)" }}>nicethings.site</div>
                </div>
            </div>
        ),
        { ...OG_SIZE, fonts: await ogFonts() }
    );
}

// `origin` is the site answering the request: the portrait is one of its own
// files.
export async function founderShareJpeg(lang: Locale, origin: string) {
    try {
        const photo = await fetch(`${origin}${FOUNDER.photo}`, { signal: AbortSignal.timeout(8000) });
        if (!photo.ok) throw new Error(`Photo ${photo.status}`);
        const portrait = await sharp(Buffer.from(await photo.arrayBuffer())).resize(PORTRAIT_WIDTH, OG_SIZE.height, { fit: "cover" }).toBuffer();
        const overlay = Buffer.from(await (await founderOverlay(lang)).arrayBuffer());
        return await sharp({ create: { width: OG_SIZE.width, height: OG_SIZE.height, channels: 3, background: "#0b0806" } })
            .composite([{ input: portrait, left: OG_SIZE.width - PORTRAIT_WIDTH, top: 0 }, { input: overlay }])
            .jpeg({ quality: QUALITY, mozjpeg: true })
            .toBuffer();
    } catch (error) {
        console.error("Founder share photo failed, using the card:", error);
        return toJpeg(ogCard({ eyebrow: FOUNDER.role[lang], title: FOUNDER.name, footer: FOUNDER.pull[lang].join(" "), tone: "#c0471b" }));
    }
}
