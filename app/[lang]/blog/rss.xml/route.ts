import { paths } from "@/lib/places/paths";
import { getPosts, localised } from "@/lib/blog/server";
import { SITE_URL, getDictionary, isLocale } from "@/lib/i18n";

export const revalidate = 3600;

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// RSS feed of the latest articles, for readers and news aggregators.
export async function GET(_request: Request, { params }: { params: Promise<{ lang: string }> }) {
    const { lang: raw } = await params;
    const lang = isLocale(raw) ? raw : "fr";
    const t = getDictionary(lang);
    const posts = (await getPosts().catch(() => [])).slice(0, 30);

    const items = posts
        .map((post) => {
            const { title, excerpt } = localised(post, lang);
            const url = `${SITE_URL}${paths.post(lang, post.slug)}`;
            return `<item><title>${escape(title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>${
                excerpt ? `<description>${escape(excerpt)}</description>` : ""
            }${post.cover ? `<enclosure url="${escape(post.cover)}" type="image/jpeg" length="0"/>` : ""}</item>`;
        })
        .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escape(t.blog.metaTitle)}</title><link>${SITE_URL}/${lang}/blog</link><description>${escape(
        t.blog.lead
    )}</description><language>${lang === "fr" ? "fr-CM" : "en-CM"}</language>${items}</channel></rss>`;

    return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=600, s-maxage=3600" } });
}
