import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/i18n/config";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            // Admin, APIs and infinite search-result pages are not content.
            disallow: ["/admin", "/admin-login", "/api/", "/fr/recherche", "/en/recherche", "/fr/y-aller/", "/en/y-aller/"],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
