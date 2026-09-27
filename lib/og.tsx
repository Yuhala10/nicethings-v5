import { ImageResponse } from "next/og";

// Branded 1200×630 share cards (WhatsApp, Facebook, X previews): a night
// sky with the sunset glow, and a bold colour card in the place's tone.
export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#0b0806";

function Brand() {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
                style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: "linear-gradient(135deg,#ff8a1f,#ff5b36 55%,#eb3a6f)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: 26,
                    fontWeight: 800,
                }}
            >
                N
            </div>
            <div style={{ display: "flex", fontSize: 36, fontWeight: 800, color: "white" }}>
                Nice<span style={{ color: "#ff7a3d" }}>Things</span>
            </div>
        </div>
    );
}

export function ogCard({
    eyebrow,
    title,
    footer,
    tone = "#ff5b36",
    tag,
}: {
    eyebrow: string;
    title: string;
    footer: string;
    tone?: string;
    tag?: string;
}) {
    const size = title.length > 34 ? 64 : title.length > 22 ? 78 : 96;
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    position: "relative",
                    background: INK,
                    fontFamily: "sans-serif",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        top: -260,
                        right: -180,
                        width: 760,
                        height: 760,
                        borderRadius: 999,
                        background: "radial-gradient(circle, rgba(255,91,54,0.55), rgba(235,58,111,0.18) 45%, rgba(11,8,6,0) 70%)",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: -300,
                        left: -200,
                        width: 700,
                        height: 700,
                        borderRadius: 999,
                        background: "radial-gradient(circle, rgba(124,58,237,0.35), rgba(11,8,6,0) 70%)",
                    }}
                />
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 64px", width: "100%" }}>
                    <Brand />
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            padding: "40px 44px",
                            borderRadius: 40,
                            background: `linear-gradient(135deg, ${tone}, ${tone}cc 55%, #1a0a05 140%)`,
                            boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
                        }}
                    >
                        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                            <div
                                style={{
                                    display: "flex",
                                    fontSize: 24,
                                    fontWeight: 700,
                                    color: "white",
                                    padding: "8px 18px",
                                    borderRadius: 999,
                                    background: "rgba(0,0,0,0.22)",
                                }}
                            >
                                {eyebrow}
                            </div>
                            {tag && (
                                <div
                                    style={{
                                        display: "flex",
                                        fontSize: 24,
                                        fontWeight: 700,
                                        color: "#17120e",
                                        padding: "8px 18px",
                                        borderRadius: 999,
                                        background: "rgba(255,255,255,0.92)",
                                    }}
                                >
                                    {tag}
                                </div>
                            )}
                        </div>
                        <div style={{ display: "flex", fontSize: size, fontWeight: 800, color: "white", lineHeight: 1.02, letterSpacing: "-0.03em" }}>
                            {title}
                        </div>
                        <div style={{ display: "flex", marginTop: 18, fontSize: 30, color: "rgba(255,255,255,0.88)" }}>{footer}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "rgba(255,255,255,0.6)" }}>
                        <span>nicethings.site</span>
                        <span>Carte · Itinéraire · Infos pratiques</span>
                    </div>
                </div>
            </div>
        ),
        OG_SIZE
    );
}
