import type { Metadata, Viewport } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import "./admin.css";

// Root layout for the private team console. The public site has its own
// root layout under app/[lang] so it can set <html lang> per language. Same
// two typefaces as the site: DM Sans to work in, Instrument Serif for titles.

const body = DM_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const editorial = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-editorial", display: "swap" });

export const metadata: Metadata = {
    title: { default: "Espace équipe", template: "%s · NiceThings équipe" },
    robots: { index: false, follow: false },
    icons: { icon: "/brand/icon.svg" },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: "#faf7f2",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="fr" className={`${body.variable} ${editorial.variable}`}>
            <body>{children}</body>
        </html>
    );
}
