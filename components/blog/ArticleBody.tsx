import Image from "next/image";
import { Lightbulb, Quote } from "lucide-react";
import { outline, type Block } from "@/lib/blog/blocks";
import type { Dictionary } from "@/lib/i18n";
import type { PlaceSummary } from "@/lib/places/types";
import PlaceCard from "../place/PlaceCard";
import ArticlePlace from "./ArticlePlace";
import Inline from "./Inline";

// Draws an article's blocks. Places come from the live catalogue, so
// prices, hours and "open now" are always current; a place that has been
// unpublished since simply disappears from the article.
export default function ArticleBody({ blocks, places, t }: { blocks: Block[]; places: Map<string, PlaceSummary>; t: Dictionary }) {
    const anchors = new Map(outline(blocks).map((item) => [item.index, item.id]));
    let placeNumber = 0;

    return (
        <div className="nt-article">
            {blocks.map((block, index) => {
                switch (block.type) {
                    case "p":
                        return (
                            <p key={index}>
                                <Inline text={block.text} />
                            </p>
                        );
                    case "h2":
                        return (
                            <h2 key={index} id={anchors.get(index)}>
                                <Inline text={block.text} />
                            </h2>
                        );
                    case "h3":
                        return (
                            <h3 key={index}>
                                <Inline text={block.text} />
                            </h3>
                        );
                    case "image":
                        return (
                            <figure key={index} className="my-8">
                                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-surface-2">
                                    <Image src={block.url} alt={block.alt} fill sizes="(min-width: 768px) 672px, 100vw" className="object-cover" />
                                </div>
                                {block.caption && <figcaption className="mt-2.5 px-1 text-center text-sm text-muted">{block.caption}</figcaption>}
                            </figure>
                        );
                    case "place": {
                        const place = places.get(block.slug);
                        if (!place) return null;
                        placeNumber += 1;
                        return <ArticlePlace key={index} place={place} note={block.note} number={placeNumber} />;
                    }
                    case "places": {
                        const list = block.slugs.map((slug) => places.get(slug)).filter((place): place is PlaceSummary => Boolean(place));
                        if (!list.length) return null;
                        return (
                            <section key={index} className="my-10">
                                {block.title && <h3 className="nt-serif mb-4 text-[1.7rem]">{block.title}</h3>}
                                <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3">
                                    {list.map((place) => (
                                        <PlaceCard key={place.slug} place={place} className="w-full" />
                                    ))}
                                </div>
                            </section>
                        );
                    }
                    case "quote":
                        return (
                            <blockquote key={index} className="relative my-10 rounded-[1.75rem] bg-surface-2 px-6 pt-10 pb-6 md:px-8">
                                <Quote size={30} className="absolute top-4 left-5 text-brand-500" />
                                <p className="nt-serif text-[1.75rem] leading-[1.2] text-text italic md:text-[2.1rem]">
                                    <Inline text={block.text} />
                                </p>
                                {block.cite && <footer className="mt-3 text-sm font-semibold text-muted">— {block.cite}</footer>}
                            </blockquote>
                        );
                    case "list": {
                        const List = block.ordered ? "ol" : "ul";
                        return (
                            <List key={index}>
                                {block.items.map((item, itemIndex) => (
                                    <li key={itemIndex}>
                                        <Inline text={item} />
                                    </li>
                                ))}
                            </List>
                        );
                    }
                    case "tip":
                        return (
                            <aside key={index} className="my-8 flex gap-4 rounded-[1.5rem] border border-brand-200/70 bg-brand-50 p-5 dark:border-brand-700/40 dark:bg-brand-700/10">
                                <span className="nt-sunset grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white">
                                    <Lightbulb size={20} />
                                </span>
                                <div>
                                    <p className="text-xs font-extrabold tracking-wider text-brand-600 uppercase">{t.blog.tip}</p>
                                    <p className="mt-1 leading-relaxed text-text-2">
                                        <Inline text={block.text} />
                                    </p>
                                </div>
                            </aside>
                        );
                }
            })}
        </div>
    );
}
