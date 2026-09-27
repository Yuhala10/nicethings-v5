import type { MetadataRoute } from "next";

// Installable app. It opens straight on the map: "/carte" goes through the
// proxy, which adds the visitor's language, then the map picks their city.
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "NiceThings — Cameroun",
        short_name: "NiceThings",
        description: "Où sortir, manger et chiller au Cameroun, avec l'itinéraire guidé.",
        start_url: "/carte",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0b0806",
        theme_color: "#0b0806",
        lang: "fr",
        categories: ["travel", "food", "lifestyle"],
        icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
    };
}
