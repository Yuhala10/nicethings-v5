import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/i18n/config";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            // Link previews live under /api/share and must stay reachable for
            // Google Images, X, Facebook and LinkedIn.
            allow: ["/", "/api/share/"],
            // Admin, APIs, private owner pages and endless search pages are not content.
            disallow: [
                "/admin",
                "/admin-login",
                "/api/",
                "/fr/recherche",
                "/en/recherche",
                "/fr/y-aller/",
                "/en/y-aller/",
                "/fr/pro/revendiquer/",
                "/en/pro/revendiquer/",
                "/fr/pro/lieu/",
                "/en/pro/lieu/",
            ],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
