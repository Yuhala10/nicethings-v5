import { ImageResponse } from "next/og";
import sharp from "sharp";
import { cityBySlug } from "../cities";
import { getDictionary, type Locale } from "../i18n";
import { OG_SIZE, TEXT_FONT, TITLE_FONT } from "../og";
import { qrPath } from "../qr";
import { SERIF_FONT, cardFonts } from "../share-image";
import { renderAvatar } from "./avatar-render";
import { cardUrl, cardVersion } from "./card-version";
import { PIONEERS } from "./rules";
import type { ProfilePage } from "./pages";

// A member's card: the link preview of their profile (1200 × 630), and the
// tall card they post as a WhatsApp status or a story (1080 × 1920), with a
// QR code that leads to their page. Like a membership card: their face,
// their name, their number, their ranks, what they gave. The founder and the
// neighbourhood legends get green and gold; everyone else the night and
// champagne.

const STORY = { width: 1080, height: 1920 };

const short = (text: string) => {
    const flat = text.replace(/\s+/g, " ").trim();
    return flat.length > 110 ? `${flat.slice(0, 109)}…` : flat;
};

function colours(page: ProfilePage) {
    const gold = page.person.role === "founder" || page.person.level >= 4;
    return gold
        ? { ink: "#0a3326", deep: "#06231a", paper: "#fbf6e9", accent: "#e2c065", glow: "rgba(226,192,101,0.28)" }
        : { ink: "#15110e", deep: "#0b0806", paper: "#faf7f2", accent: "#d9bc8c", glow: "rgba(192,71,27,0.34)" };
}

// Their face as a round picture: their photo, or their avatar drawn here.
async function faceCircle(face: string, size: number) {
    let source: Buffer;
    if (face.startsWith("/api/avatar/")) {
        source = Buffer.from(renderAvatar(face.slice("/api/avatar/".length)) ?? "");
    } else {
        const fetched = await fetch(face, { signal: AbortSignal.timeout(8000) });
        if (!fetched.ok) throw new Error(`Face ${fetched.status}`);
        source = Buffer.from(await fetched.arrayBuffer());
    }
    const mask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`);
    return sharp(source, { density: 300 }).rotate().resize(size, size, { fit: "cover" }).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

function words(page: ProfilePage, lang: Locale) {
    const t = getDictionary(lang).people;
    const { person, stats } = page;
    const ranks = [
        person.role === "founder" ? t.roles.founder : person.role === "team" ? t.roles.team : null,
        t.levels[person.level],
        person.memberNo <= PIONEERS ? t.pioneer : null,
    ].filter((rank): rank is string => Boolean(rank));
    return {
        t,
        name: person.name?.trim() || `@${person.handle}`,
        handle: `@${person.handle}`,
        number: `N° ${String(person.memberNo).padStart(4, "0")}`,
        where: [person.area, cityBySlug(person.city)?.name].filter(Boolean).join(", "),
        ranks,
        figures: [
            [stats.reviews, t.stats.reviews],
            [stats.photos, t.stats.photos],
            [stats.cheers, t.stats.cheers],
        ] as const,
    };
}

function Wordmark({ size }: { size: number }) {
    return (
        <div style={{ display: "flex", fontFamily: TITLE_FONT, fontSize: size, fontWeight: 800, letterSpacing: "-0.03em" }}>
            Nice<span style={{ color: "#ff7a3d" }}>Things</span>
        </div>
    );
}

function Chips({ ranks, accent, ink, size }: { ranks: string[]; accent: string; ink: string; size: number }) {
    return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: size * 0.5 }}>
            {ranks.map((rank, index) => (
                <div
                    key={rank}
                    style={{
                        display: "flex",
                        padding: `${size * 0.32}px ${size * 0.8}px`,
                        borderRadius: 999,
                        fontSize: size,
                        fontWeight: 700,
                        background: index === 0 ? accent : "transparent",
                        color: index === 0 ? ink : accent,
                        border: `2px solid ${accent}`,
                    }}
                >
                    {rank}
                </div>
            ))}
        </div>
    );
}


// The tick after the name, drawn for the card (blue; gold for the founder).
function Tick({ page, size }: { page: ProfilePage; size: number }) {
    if (!page.person.verified) return null;
    const gold = page.person.role === "founder";
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ marginLeft: size * 0.3, flexShrink: 0 }}>
            <circle cx="12" cy="12" r="11" fill={gold ? "#e2c065" : "#0095f6"} />
            <path d="M7.6 12.3l3 3 5.8-6.2" fill="none" stroke={gold ? "#3b2a07" : "#ffffff"} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// ---------------------------------------------------------------- link preview

export async function personShareJpeg(page: ProfilePage, lang: Locale) {
    const c = colours(page);
    const w = words(page, lang);
    const nameSize = w.name.length > 22 ? 58 : w.name.length > 15 ? 70 : 84;
    const FACE = 318;
    const face = await faceCircle(page.person.face, FACE).catch(() => null);

    const overlay = new ImageResponse(
        (
            <div style={{ width: "100%", height: "100%", display: "flex", fontFamily: TEXT_FONT, fontWeight: 500, color: c.paper, background: c.ink, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -280, left: -200, width: 760, height: 760, borderRadius: 999, background: `radial-gradient(circle, ${c.glow}, rgba(0,0,0,0) 68%)` }} />
                <div style={{ position: "absolute", top: 22, left: 22, right: 22, bottom: 22, borderRadius: 28, border: `2px solid ${c.accent}`, opacity: 0.45 }} />
                {/* The ring the face sits in. */}
                <div style={{ position: "absolute", top: 147, left: 63, width: FACE + 16, height: FACE + 16, borderRadius: 999, border: `5px solid ${c.accent}` }} />
                {!face && <div style={{ position: "absolute", top: 155, left: 71, width: FACE, height: FACE, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF_FONT, fontSize: 200, color: c.accent, background: c.deep }}>{w.name.replace("@", "").charAt(0).toUpperCase()}</div>}
                <div style={{ position: "absolute", top: 0, left: 450, right: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 64px 54px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <Wordmark size={30} />
                        <div style={{ display: "flex", marginTop: 12, fontSize: 19, fontWeight: 700, letterSpacing: "0.22em", color: c.accent }}>{`${w.t.card.member} · ${w.number}`.toLocaleUpperCase(lang)}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", alignItems: "center", fontFamily: SERIF_FONT, fontSize: nameSize, lineHeight: 1.02, letterSpacing: "-0.01em" }}>
                            {w.name}
                            <Tick page={page} size={Math.round(nameSize * 0.55)} />
                        </div>
                        <div style={{ display: "flex", marginTop: 8, fontSize: 28, color: "rgba(250,247,242,0.7)" }}>{[page.person.name ? w.handle : null, w.where].filter(Boolean).join(" · ")}</div>
                        <div style={{ display: "flex", marginTop: 22 }}>
                            <Chips ranks={w.ranks} accent={c.accent} ink={c.ink} size={22} />
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", gap: 34 }}>
                            {w.figures.map(([value, label]) => (
                                <div key={label} style={{ display: "flex", flexDirection: "column" }}>
                                    <div style={{ display: "flex", fontFamily: SERIF_FONT, fontSize: 48, lineHeight: 1 }}>{String(value)}</div>
                                    <div style={{ display: "flex", marginTop: 4, fontSize: 18, color: "rgba(250,247,242,0.6)" }}>{label}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 24px", borderRadius: 999, background: c.paper, color: c.ink, fontSize: 24, fontWeight: 700 }}>
                            {w.t.card.see}
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
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
    const drawn = Buffer.from(await overlay.arrayBuffer());
    return sharp(drawn)
        .composite(face ? [{ input: face, top: 155, left: 71 }] : [])
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
}

// ---------------------------------------------------------------- story card

export async function personStoryJpeg(page: ProfilePage, lang: Locale, address: string, link: string) {
    const c = colours(page);
    const w = words(page, lang);
    const nameSize = w.name.length > 22 ? 84 : w.name.length > 15 ? 100 : 118;
    const FACE = 440;
    const FACE_TOP = 330;
    const FACE_LEFT = (STORY.width - FACE) / 2;
    const face = await faceCircle(page.person.face, FACE).catch(() => null);
    const qr = qrPath(link);
    const top = page.top.slice(0, 3);

    const overlay = new ImageResponse(
        (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: TEXT_FONT, fontWeight: 500, color: c.paper, background: `linear-gradient(180deg, ${c.ink} 0%, ${c.deep} 100%)`, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 80, left: 140, width: 800, height: 800, borderRadius: 999, background: `radial-gradient(circle, ${c.glow}, rgba(0,0,0,0) 66%)` }} />
                <div style={{ position: "absolute", top: 34, left: 34, right: 34, bottom: 34, borderRadius: 44, border: `3px solid ${c.accent}`, opacity: 0.5 }} />
                <div style={{ position: "absolute", top: FACE_TOP - 14, left: FACE_LEFT - 14, width: FACE + 28, height: FACE + 28, borderRadius: 999, border: `7px solid ${c.accent}` }} />
                {!face && <div style={{ position: "absolute", top: FACE_TOP, left: FACE_LEFT, width: FACE, height: FACE, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF_FONT, fontSize: 280, color: c.accent, background: c.deep }}>{w.name.replace("@", "").charAt(0).toUpperCase()}</div>}

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 104 }}>
                    <Wordmark size={54} />
                    <div style={{ display: "flex", marginTop: 20, padding: "10px 28px", borderRadius: 999, border: `2px solid ${c.accent}`, fontSize: 26, fontWeight: 700, letterSpacing: "0.22em", color: c.accent }}>{`${w.t.card.member} · ${w.number}`.toLocaleUpperCase(lang)}</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: FACE + 120, padding: "0 90px", textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", fontFamily: SERIF_FONT, fontSize: nameSize, lineHeight: 1, letterSpacing: "-0.01em" }}>
                        {w.name}
                        <Tick page={page} size={Math.round(nameSize * 0.5)} />
                    </div>
                    <div style={{ display: "flex", marginTop: 14, fontSize: 38, color: "rgba(250,247,242,0.72)" }}>{[page.person.name ? w.handle : null, w.where].filter(Boolean).join(" · ")}</div>
                    <div style={{ display: "flex", marginTop: 30, justifyContent: "center" }}>
                        <Chips ranks={w.ranks} accent={c.accent} ink={c.ink} size={30} />
                    </div>
                    <div style={{ display: "flex", gap: 90, marginTop: 52 }}>
                        {w.figures.map(([value, label]) => (
                            <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <div style={{ display: "flex", fontFamily: SERIF_FONT, fontSize: 92, lineHeight: 1 }}>{String(value)}</div>
                                <div style={{ display: "flex", marginTop: 6, fontSize: 28, color: "rgba(250,247,242,0.6)" }}>{label}</div>
                            </div>
                        ))}
                    </div>
                    {/* No top 3 yet: their own words, or the site's. */}
                    {top.length === 0 && (
                        <div style={{ display: "flex", marginTop: 70, maxWidth: 820, fontFamily: SERIF_FONT, fontSize: 52, lineHeight: 1.12, fontStyle: "italic", color: c.accent, textAlign: "center", justifyContent: "center" }}>
                            {page.bio ? (lang === "fr" ? `« ${short(page.bio)} »` : `“${short(page.bio)}”`) : getDictionary(lang).welcome.lines[2]}
                        </div>
                    )}
                    {top.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 54 }}>
                            <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: "0.22em", color: c.accent }}>{w.t.card.top.toLocaleUpperCase(lang)}</div>
                            {top.map((place, index) => (
                                <div key={place.slug} style={{ display: "flex", marginTop: 12, fontSize: 38, fontWeight: 700 }}>
                                    <span style={{ color: c.accent, marginRight: 16, fontFamily: SERIF_FONT, fontWeight: 400 }}>{index + 1}</span>
                                    {place.name.length > 30 ? `${place.name.slice(0, 29)}…` : place.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* At the bottom: the QR code and the address. */}
                <div style={{ position: "absolute", left: 90, right: 90, bottom: 96, display: "flex", alignItems: "center", gap: 36, padding: 26, borderRadius: 32, background: "rgba(250,247,242,0.08)", border: `2px solid rgba(250,247,242,0.14)` }}>
                    <div style={{ display: "flex", padding: 10, borderRadius: 20, background: "#ffffff" }}>
                        <svg width="190" height="190" viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges">
                            <path d={qr.path} fill="#15110e" />
                        </svg>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                        <div style={{ display: "flex", fontSize: 34, fontWeight: 700, lineHeight: 1.2 }}>{w.t.card.scan}</div>
                        <div style={{ display: "flex", marginTop: 14, fontSize: 32, color: c.accent }}>{address}</div>
                    </div>
                </div>
            </div>
        ),
        { ...STORY, fonts: await cardFonts() }
    );
    const drawn = Buffer.from(await overlay.arrayBuffer());
    return sharp(drawn)
        .composite(face ? [{ input: face, top: FACE_TOP, left: FACE_LEFT }] : [])
        .jpeg({ quality: 88, mozjpeg: true })
        .toBuffer();
}

export function personShareImage(page: ProfilePage, lang: Locale) {
    return {
        url: cardUrl(page.person.handle, lang, cardVersion(page)),
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        alt: `${getDictionary(lang).people.card.member} · @${page.person.handle}`,
        type: "image/jpeg",
    };
}
