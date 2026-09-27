import type {
    Metadata,
    Viewport,
} from "next";

import "./globals.css";

import ConsentModal from "../components/consent/ConsentModal";
import VisitorBootstrap from "../components/visitor/VisitorBootstrap";
import { LanguageProvider } from "../components/i18n/LanguageProvider";

export const metadata: Metadata = {
    title: {
        default:
            "NiceThings — Discover something nice",
        template:
            "%s — NiceThings",
    },

    description:
        "Discover beautiful places, great food, hidden gems and experiences around you.",

    applicationName:
        "NiceThings",

    keywords: [
        "NiceThings",
        "Cameroon",
        "Douala",
        "Yaoundé",
        "restaurants",
        "cafés",
        "food",
        "places",
        "local discovery",
    ],

    manifest:
        "/manifest.webmanifest",

    icons: {
        icon: [
            { url: "/brand/nicethings-icon.png", sizes: "1254x1254", type: "image/png" },
            { url: "/favicon.ico" },
        ],
        apple: "/brand/nicethings-icon.png",
    },

    appleWebApp: {
        capable: true,
        statusBarStyle:
            "black-translucent",
        title: "NiceThings",
    },

    formatDetection: {
        telephone: true,
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: "#111111",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                <LanguageProvider>
                    {children}
                    <VisitorBootstrap />
                    <ConsentModal />
                </LanguageProvider>
            </body>
        </html>
    );
}