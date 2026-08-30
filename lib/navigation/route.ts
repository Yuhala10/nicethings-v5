export const ROUTES = {
    HOME: "/",
    SEARCH: "/search",
    NEARBY: "/nearby",
    SAVED: "/saved",
    PROFILE: "/profile",
    SUBMIT: "/submit",
    ADMIN: "/admin",

    spot: (slug: string) => `/spots/${slug}`,
} as const;