import Image from "next/image";
import Link from "next/link";
import { Clock3, Newspaper } from "lucide-react";
import { localised, type PostSummary } from "@/lib/blog/server";
import { TOPICS, isTopic, topicLabel } from "@/lib/blog/topics";
import { cityBySlug } from "@/lib/cities";
import { fill, getDictionary, type Locale } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";

// Pinterest rhythm: covers take one of a few heights, picked from the slug
// so a card always looks the same.
const SHAPES = ["aspect-[3/4]", "aspect-[4/5]", "aspect-square", "aspect-[2/3]", "aspect-[4/5]"];
function shapeOf(slug: string) {
    let hash = 0;
    for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    return SHAPES[Math.abs(hash) % SHAPES.length];
}

// An article as a pin: picture first, then the title.
export default function PostCard({ post, locale, priority = false }: { post: PostSummary; locale: Locale; priority?: boolean }) {
    const t = getDictionary(locale);
    const { title, excerpt } = localised(post, locale);
    const tone = isTopic(post.topic) ? TOPICS[post.topic].tone : "#ff5b36";
    const city = cityBySlug(post.city)?.name;

    return (
        <Link href={paths.post(locale, post.slug)} className="group nt-pressable block">
            <div className={`relative overflow-hidden rounded-[1.6rem] bg-surface-2 ${shapeOf(post.slug)}`}>
                {post.cover ? (
                    <Image
                        src={post.cover}
                        alt={post.coverAlt ?? title}
                        fill
                        sizes="(min-width: 1024px) 300px, (min-width: 640px) 33vw, 50vw"
                        className="object-cover transition duration-700 group-hover:scale-[1.04]"
                        priority={priority}
                    />
                ) : (
                    <div className="absolute inset-0 grid place-items-center" style={{ background: `linear-gradient(150deg, ${tone}, ${tone}aa 60%, #17120e)` }}>
                        <Newspaper size={42} strokeWidth={1.4} className="text-white/85" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
                <span
                    className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-[0.7rem] font-extrabold tracking-wide text-white uppercase shadow-sm"
                    style={{ background: tone }}
                >
                    {topicLabel(post.topic, locale)}
                </span>
            </div>
            <div className="px-1 pt-3">
                <h3 className="font-display text-[1.02rem] leading-snug font-extrabold text-text group-hover:text-brand-600">{title}</h3>
                {excerpt && <p className="mt-1 line-clamp-2 text-[0.85rem] leading-relaxed text-muted">{excerpt}</p>}
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
                    <Clock3 size={13} />
                    {fill(t.blog.readTime, { n: post.readingMinutes })}
                    {city && <span>· {city}</span>}
                </p>
            </div>
        </Link>
    );
}
