import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import ArticleView from "@/components/blog/ArticleView";
import { getPost, localised, toPost } from "@/lib/blog/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isLocale } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import { postShareImage } from "@/lib/share-image";

export const revalidate = 300;
export const dynamicParams = true;

export function generateStaticParams() {
    return [];
}

type Props = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang, slug } = await params;
    if (!isLocale(lang)) return {};
    const post = await getPost(slug).catch(() => null);
    if (!post) return {};
    const { title, excerpt, translated } = localised(post, lang);
    const image = postShareImage(post, lang);
    const languages = post.title.en
        ? { fr: paths.post("fr", slug), en: paths.post("en", slug), "x-default": paths.post("fr", slug) }
        : { fr: paths.post("fr", slug), "x-default": paths.post("fr", slug) };
    return {
        title,
        description: excerpt || undefined,
        // An untranslated English page points search engines to the French one.
        alternates: { canonical: translated ? paths.post(lang, slug) : paths.post("fr", slug), languages },
        // Lets Google show the cover in large and quote the text freely
        // (needed for Discover and for its AI answers).
        robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
        openGraph: {
            type: "article",
            title,
            description: excerpt || undefined,
            url: paths.post(lang, slug),
            publishedTime: post.publishedAt,
            modifiedTime: post.updatedAt,
            authors: [post.author],
            images: [image],
        },
        twitter: { card: "summary_large_image", images: [image.url] },
    };
}

// In preview (draft mode, team members only) drafts and scheduled articles
// are read straight from the database.
async function previewPost(slug: string) {
    if (!(await draftMode()).isEnabled || !(await hasAdminSession())) return null;
    const { data } = await getSupabaseAdminClient().from("nt_posts").select("*").eq("slug", slug).maybeSingle();
    return data ? { ...toPost(data), publishedAt: data.published_at ?? data.updated_at } : null;
}

export default async function ArticlePage({ params }: Props) {
    const { lang, slug } = await params;
    if (!isLocale(lang)) notFound();
    const preview = await previewPost(slug);
    const post = preview ?? (await getPost(slug).catch(() => null));
    if (!post) notFound();
    return <ArticleView post={post} lang={lang} preview={Boolean(preview)} />;
}
