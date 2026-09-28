import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./admin.css";

// Root layout for the private team console. The public site has its own
// root layout under app/[lang] so it can set <html lang> per language.

const body = DM_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const heading = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-heading", display: "swap" });

export const metadata: Metadata = {
    title: { default: "Espace équipe", template: "%s · NiceThings équipe" },
    robots: { index: false, follow: false },
    icons: { icon: "/brand/icon.svg" },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: "#17120e",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="fr" className={`${body.variable} ${heading.variable}`}>
            <body>{children}</body>
        </html>
    );
}
