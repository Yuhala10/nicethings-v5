/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        // Place photos live in Supabase Storage.
        remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
        formats: ["image/avif", "image/webp"],
    },
    poweredByHeader: false,
    // The About page has one address in both languages; "/en/about" is what
    // English speakers type.
    redirects() {
        return [{ source: "/:lang(fr|en)/about", destination: "/:lang/a-propos", permanent: true }];
    },
    // Fonts read from disk when drawing link previews (lib/og.tsx).
    outputFileTracingIncludes: {
        "/api/share/**": ["./assets/fonts/**/*"],
    },
};

export default nextConfig;
