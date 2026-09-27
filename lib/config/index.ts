export const APP_CONFIG = {
    name: "NiceThings",

    tagline: "Discover something nice.",

    description:
        "Discover beautiful places, great food, hidden gems and experiences around you.",

    defaultLanguage: "en" as const,

    supportedLanguages: [
        "en",
        "fr",
    ] as const,

    defaultCity: "Douala",

    currency: "XAF",

    freeMode: true,

    features: {
        search: true,
        nearby: true,
        maps: true,
        savedSpots: true,
        reviews: true,
        arrivals: true,
        reports: true,
        submissions: true,
        admin: true,
        bilingual: true,
        pwa: true,
    },

    location: {
        defaultRadiusKm: 10,
        nearbyRadiusKm: 15,
        maximumRadiusKm: 50,
    },

    pagination: {
        spotsPerPage: 24,
        adminRowsPerPage: 50,
    },
} as const;

export type SupportedLanguage =
    (typeof APP_CONFIG.supportedLanguages)[number];

export const ROUTES = {
    home: "/",
    search: "/search",
    nearby: "/nearby",
    saved: "/saved",
    profile: "/profile",
    submit: "/submit",

    admin: "/admin",
    adminSpots: "/admin/spots",
    adminSubmissions: "/admin/submissions",
    adminReports: "/admin/reports",
} as const;