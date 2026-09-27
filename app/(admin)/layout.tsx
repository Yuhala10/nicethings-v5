import type { Metadata, Viewport } from "next";
import "./admin.css";

// Root layout for the private admin area. The public site has its own root
// layout under app/[lang] so it can set <html lang> per language.

export const metadata: Metadata = {
    title: { default: "Admin", template: "%s — NiceThings Admin" },
    robots: { index: false, follow: false },
    icons: { icon: "/brand/icon.svg" },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    themeColor: "#111111",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="fr">
            <body>{children}</body>
        </html>
    );
}
