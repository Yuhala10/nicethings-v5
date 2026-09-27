/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        // Place photos live in Supabase Storage.
        remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
        formats: ["image/avif", "image/webp"],
    },
    poweredByHeader: false,
};

export default nextConfig;
