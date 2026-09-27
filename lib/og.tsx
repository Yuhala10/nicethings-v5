import { ImageResponse } from "next/og";

// Branded 1200×630 share card (WhatsApp, Facebook, X previews).
export const OG_SIZE = { width: 1200, height: 630 };

export function ogCard({ eyebrow, title, footer, tone = "#f97316" }: { eyebrow: string; title: string; footer: string; tone?: string }) {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "72px 80px",
                    background: "#faf9f7",
                    fontFamily: "sans-serif",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 999, background: tone }} />
                    <div style={{ fontSize: 32, fontWeight: 700, color: "#737373" }}>{eyebrow}</div>
                </div>
                <div
                    style={{
                        fontSize: title.length > 28 ? 76 : 96,
                        fontWeight: 800,
                        color: "#171717",
                        lineHeight: 1.05,
                        letterSpacing: "-0.03em",
                        display: "flex",
                    }}
                >
                    {title}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div style={{ fontSize: 30, color: "#404040" }}>{footer}</div>
                    <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: "#171717" }}>
                        Nice<span style={{ color: "#f97316" }}>Things</span>
                    </div>
                </div>
            </div>
        ),
        OG_SIZE
    );
}
