import type { MetadataRoute } from "next";

// Installable app. start_url is "/" so the proxy opens it in the visitor's
// language (saved choice, then phone language, then French).
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "NiceThings — Yaoundé",
        short_name: "NiceThings",
        description: "Où sortir, manger et chiller à Yaoundé, selon ton budget et ton quartier.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#faf9f7",
        theme_color: "#faf9f7",
        lang: "fr",
        categories: ["travel", "food", "lifestyle"],
        icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
    };
}
