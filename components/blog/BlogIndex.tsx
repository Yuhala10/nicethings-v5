"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { PostSummary } from "@/lib/blog/server";
import { TOPICS, type Topic } from "@/lib/blog/topics";
import { useLocale } from "../site/LocaleProvider";

// Topic chips and a search box over the article pins. Filtering happens in
// the browser: the list is small and the page stays static and instant.
export default function BlogIndex({ posts, cards }: { posts: PostSummary[]; cards: Record<string, React.ReactNode> }) {
    const { locale, t } = useLocale();
    const [topic, setTopic] = useState<Topic | null>(null);
    const [query, setQuery] = useState("");

    const topics = useMemo(() => (Object.keys(TOPICS) as Topic[]).filter((key) => posts.some((post) => post.topic === key)), [posts]);
    const words = query.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/).filter(Boolean);
    const shown = posts.filter((post) => {
        if (topic && post.topic !== topic) return false;
        if (!words.length) return true;
        const haystack = [post.title.fr, post.title.en, post.excerpt.fr, post.excerpt.en, ...post.tags]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "");
        return words.every((word) => haystack.includes(word));
    });

    return (
        <>
            <div className="sticky top-0 z-30 -mx-4 mb-6 bg-bg/85 px-4 py-3 backdrop-blur-xl md:top-16 md:-mx-6 md:px-6">
                <div className="flex items-center gap-2">
                    <label className="relative min-w-0 flex-1 md:max-w-xs">
                        <span className="sr-only">{t.blog.search}</span>
                        <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={t.blog.search}
                            className="nt-input h-11 rounded-full pr-10 pl-10"
                        />
                        {query && (
                            <button type="button" onClick={() => setQuery("")} className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted" aria-label={t.common.close}>
                                <X size={16} />
                            </button>
                        )}
                    </label>
                </div>
                {topics.length > 1 && (
                    <div className="nt-scroll-x mt-3 flex gap-2">
                        <button type="button" className="nt-chip" aria-pressed={topic === null} onClick={() => setTopic(null)}>
                            {t.blog.all}
                        </button>
                        {topics.map((key) => (
                            <button key={key} type="button" className="nt-chip" aria-pressed={topic === key} onClick={() => setTopic(topic === key ? null : key)}>
                                <span className="h-2 w-2 rounded-full" style={{ background: TOPICS[key].tone }} />
                                {TOPICS[key][locale]}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {shown.length === 0 ? (
                <p className="rounded-3xl bg-surface-2 px-6 py-14 text-center font-semibold text-muted">{t.blog.noResults}</p>
            ) : (
                <div className="nt-masonry columns-2 sm:columns-3 lg:columns-4">
                    {shown.map((post) => (
                        <div key={post.id}>{cards[post.id]}</div>
                    ))}
                </div>
            )}
        </>
    );
}
