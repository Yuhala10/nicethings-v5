import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import { LocaleProvider } from "@/components/site/LocaleProvider";
import SiteChrome from "@/components/site/SiteChrome";
import { LOCALES, SITE_URL, getDictionary, isLocale } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import { siteShareImage } from "@/lib/share-image";
import "./site.css";

const body = DM_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const heading = Bricolage_Grotesque({
    subsets: ["latin"],
    weight: ["600", "700", "800"],
    variable: "--font-heading",
    display: "swap",
});

export function generateStaticParams() {
    return LOCALES.map((lang) => ({ lang }));
}


type Props = {
    children: React.ReactNode;
    params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    const t = getDictionary(lang);

    return {
        metadataBase: new URL(SITE_URL),
        title: { default: t.meta.defaultTitle, template: `%s · NiceThings` },
        description: t.meta.defaultDescription,
        applicationName: "NiceThings",
        alternates: {
            canonical: `/${lang}`,
            languages: { fr: "/fr", en: "/en", "x-default": "/fr" },
        },
        openGraph: {
            type: "website",
            siteName: "NiceThings",
            locale: lang === "fr" ? "fr_CM" : "en_CM",
            alternateLocale: lang === "fr" ? ["en_CM"] : ["fr_CM"],
            title: t.meta.defaultTitle,
            description: t.meta.defaultDescription,
            images: [siteShareImage(lang)],
        },
        twitter: { card: "summary_large_image", images: [siteShareImage(lang).url] },
        icons: {
            icon: [{ url: "/brand/icon.svg", type: "image/svg+xml" }, { url: "/favicon.ico" }],
            apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
        },
        manifest: "/manifest.webmanifest",
        appleWebApp: { capable: true, title: "NiceThings", statusBarStyle: "default" },
        formatDetection: { telephone: false },
        category: "travel",
        // Search Console / Bing Webmaster ownership, set in Vercel when ready.
        verification: {
            google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
            other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } : undefined,
        },
    };
}

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#faf9f7" },
        { media: "(prefers-color-scheme: dark)", color: "#0e0e0e" },
    ],
};

export default async function SiteLayout({ children, params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    const dictionary = getDictionary(lang);

    // Lets Google show a NiceThings search box in results.
    const websiteJsonLd = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "NiceThings",
        url: `${SITE_URL}/${lang}`,
        inLanguage: lang === "fr" ? "fr-CM" : "en-CM",
        potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}${paths.map(lang)}?q={search_term_string}`,
            "query-input": "required name=search_term_string",
        },
    };

    return (
        <html lang={lang} className={`${body.variable} ${heading.variable}`} suppressHydrationWarning>
            <body>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify([
                            websiteJsonLd,
                            {
                                "@context": "https://schema.org",
                                "@type": "Organization",
                                name: "NiceThings",
                                url: SITE_URL,
                                logo: `${SITE_URL}/icons/icon-512.png`,
                                areaServed: { "@type": "City", name: "Yaoundé", addressCountry: "CM" },
                            },
                        ]),
                    }}
                />
                <LocaleProvider locale={lang} dictionary={dictionary}>
                    <SiteChrome>{children}</SiteChrome>
                </LocaleProvider>
            </body>
        </html>
    );
}
