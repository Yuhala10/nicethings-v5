export const APP_CONFIG = {
    name: "NiceThings",
    shortName: "NiceThings",

    description:
        "Discover nice places, food, drinks and experiences around you.",

    defaultLanguage: "en" as const,

    supportedLanguages: ["en", "fr"] as const,

    currency: "XAF",

    // NiceThings is FREE for the current MVP.
    isFree: true,

    location: {
        defaultRadiusMeters: 5000,
        maximumRadiusMeters: 50000,
    },
} as const;

export type SupportedLanguage =
    (typeof APP_CONFIG.supportedLanguages)[number];