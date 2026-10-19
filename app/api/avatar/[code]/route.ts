import { renderAvatar } from "@/lib/people/avatar-render";

// One avatar, drawn from its code. The same code always gives the same
// picture, so browsers and the CDN keep it for good.
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const svg = renderAvatar(code.replace(/\.svg$/, ""));
    if (!svg) return new Response("Not found", { status: 404 });
    return new Response(svg, {
        headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=31536000, immutable",
            // An SVG served on its own must not run anything.
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
            "X-Content-Type-Options": "nosniff",
        },
    });
}
