"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, MessageCircle, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { fill } from "@/lib/i18n";
import { call, useMe, withMe } from "@/lib/people/client";
import type { CommentView, Person } from "@/lib/people/types";
import type { WallPost } from "@/lib/posts";
import { Face, PersonLine, displayName } from "../people/Person";
import Sheet from "../people/Sheet";
import Talk from "../people/Talk";
import { visitorId } from "../site/Analytics";
import { useLocale } from "../site/LocaleProvider";
import AddPost from "./AddPost";

// The wall of a place: photos and short videos from people who were there,
// approved by the team. A mosaic where the first picture leads and the
// others take different sizes; a video starts by itself (without sound)
// when it comes on screen and stops when it leaves; a tap opens any of them
// full screen, growing out of its tile, and a swipe down brings the visitor
// back to the place.

const LIKED_KEY = "nt_liked_posts";

// The shape each tile takes, by its place in the wall.
const SHAPES = ["col-span-2 row-span-2", "row-span-2", "", "", "col-span-2", "", "row-span-2", "", "col-span-2", ""];
const shapeOf = (index: number, total: number) => (total === 1 ? "col-span-2 row-span-2 sm:col-span-3" : total === 2 ? "row-span-2" : SHAPES[index % SHAPES.length]);

const clock = (seconds: number | null) => (seconds ? `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}` : null);

// A video in the wall: nothing is fetched until it is on screen.
function WallVideo({ post, still }: { post: WallPost; still: boolean }) {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        const video = ref.current;
        if (!video || still || typeof IntersectionObserver === "undefined") return;
        const watcher = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
                        if (!video.getAttribute("src")) video.src = post.url;
                        video.play().catch(() => {});
                    } else {
                        video.pause();
                    }
                }
            },
            { threshold: [0, 0.6] }
        );
        watcher.observe(video);
        return () => watcher.disconnect();
    }, [post.url, still]);

    // Without a still picture, the first frame stands in for it.
    return (
        <video
            ref={ref}
            muted
            loop
            playsInline
            preload={post.poster ? "none" : "metadata"}
            poster={post.poster ?? undefined}
            src={post.poster ? undefined : `${post.url}#t=0.1`}
            className="h-full w-full object-cover"
        />
    );
}

function LikeButton({ liked, count, onToggle, label, large = false }: { liked: boolean; count: number; onToggle: () => void; label: string; large?: boolean }) {
    return (
        <button
            type="button"
            onClick={(event) => {
                event.stopPropagation();
                onToggle();
            }}
            aria-pressed={liked}
            aria-label={label}
            className={`inline-flex items-center gap-1.5 rounded-full bg-black/45 font-semibold text-white backdrop-blur-md transition active:scale-90 ${large ? "h-11 px-4 text-[0.875rem]" : "h-9 px-3 text-[0.75rem]"}`}
        >
            <Heart size={large ? 18 : 15} className={liked ? "nt-pop fill-brand-500 text-brand-500" : ""} />
            {count > 0 && <span className="tabular-nums">{count}</span>}
        </button>
    );
}

export default function PostWall({ slug, placeName, posts }: { slug: string; placeName: string; posts: WallPost[] }) {
    const { t } = useLocale();
    const [liked, setLiked] = useState<Set<string>>(new Set());
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [open, setOpen] = useState<number | null>(null);
    const [still, setStill] = useState(false);
    const { locale } = useLocale();
    const { me } = useMe();
    // What the viewer learns about each post it shows: who liked it, its comments.
    const [social, setSocial] = useState<Record<string, { likers: Person[]; comments: CommentView[] }>>({});
    const [talking, setTalking] = useState(false);
    const [talkCounts, setTalkCounts] = useState<Record<string, number>>({});

    // What this browser already liked, and whether videos should stay still
    // (data saver, or a visitor who asked for less motion).
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            try {
                setLiked(new Set(JSON.parse(localStorage.getItem(LIKED_KEY) ?? "[]") as string[]));
            } catch {}
            const saver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
            setStill(saver || window.matchMedia("(prefers-reduced-motion: reduce)").matches);
        });
        return () => cancelAnimationFrame(frame);
    }, []);

    const toggle = (post: WallPost) => withMe("like", () => give(post));

    const give = (post: WallPost) => {
        const on = !liked.has(post.id);
        const next = new Set(liked);
        if (on) next.add(post.id);
        else next.delete(post.id);
        setLiked(next);
        try {
            localStorage.setItem(LIKED_KEY, JSON.stringify([...next].slice(-500)));
        } catch {}
        const before = counts[post.id] ?? post.likes;
        setCounts((current) => ({ ...current, [post.id]: Math.max(0, before + (on ? 1 : -1)) }));
        fetch("/api/posts/like", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: post.id, v: visitorId(), on }), keepalive: true })
            .then((response) => (response.ok ? response.json() : null))
            .then((answer: { likes?: number } | null) => {
                if (typeof answer?.likes === "number") setCounts((current) => ({ ...current, [post.id]: answer.likes as number }));
            })
            .catch(() => {});
    };

    const close = useCallback(() => setOpen(null), []);
    const step = useCallback((by: number) => setOpen((current) => (current === null ? current : (current + by + posts.length) % posts.length)), [posts.length]);

    // While something is shown full screen: the page behind stays put, and
    // the keyboard works as expected.
    useEffect(() => {
        if (open === null) return;
        const root = document.documentElement;
        const before = root.style.overflow;
        root.style.overflow = "hidden";
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") close();
            if (event.key === "ArrowRight") step(1);
            if (event.key === "ArrowLeft") step(-1);
        };
        window.addEventListener("keydown", onKey);
        return () => {
            root.style.overflow = before;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, close, step]);

    const current = open === null ? null : posts[open];
    const currentId = current?.id;

    // Opening a post: who liked it and what was said under it.
    useEffect(() => {
        if (!currentId) return;
        let gone = false;
        call<{ comments: CommentView[]; likers?: Person[]; liked?: boolean }>(`/api/talk?target=wall&id=${currentId}`, "GET").then((answer) => {
            if (gone || answer.ok === false) return;
            setSocial((known) => ({ ...known, [currentId]: { likers: answer.likers ?? [], comments: answer.comments } }));
            if (answer.liked === true) setLiked((set) => (set.has(currentId) ? set : new Set([...set, currentId])));
        });
        return () => {
            gone = true;
        };
    }, [currentId, me?.id]);

    const likers = current ? (social[current.id]?.likers ?? []) : [];
    const likeCount = current ? (counts[current.id] ?? current.likes) : 0;
    const commentCount = current ? (talkCounts[current.id] ?? social[current.id]?.comments.filter((comment) => !comment.pending).length ?? current.comments) : 0;
    const named = likers.slice(0, 2).map((person) => `@${person.handle}`).join(", ");
    const likedBy = likers.length
        ? likeCount > Math.min(2, likers.length)
            ? fill(t.people.talk.likedByMore, { names: named, count: likeCount - Math.min(2, likers.length) })
            : fill(t.people.talk.likedBy, { names: named })
        : null;

    return (
        <div>
            <p className="max-w-2xl text-[1rem] leading-relaxed text-text-2">{posts.length ? t.wall.lead : t.wall.empty}</p>

            {posts.length > 0 && (
                <ul className="mt-5 grid grid-flow-dense auto-rows-[8.75rem] grid-cols-2 gap-2 sm:auto-rows-[11rem] sm:grid-cols-3 md:gap-3">
                    {posts.map((post, index) => (
                        <li key={post.id} className={`relative ${shapeOf(index, posts.length)}`}>
                            <motion.button
                                type="button"
                                layoutId={`post-${post.id}`}
                                onClick={() => setOpen(index)}
                                aria-label={`${post.kind === "video" ? t.wall.video : t.wall.photo}${post.caption ? ` : ${post.caption}` : ""}`}
                                className="group absolute inset-0 overflow-hidden rounded-[1.1rem] bg-surface-2"
                            >
                                {post.kind === "video" ? (
                                    <WallVideo post={post} still={still} />
                                ) : (
                                    <img src={post.url} alt={post.caption ?? ""} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                                )}
                                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-3 pt-12 pb-3 text-left">
                                    {post.caption && <span className="line-clamp-2 pr-14 text-[0.875rem] leading-snug font-medium text-white">{post.caption}</span>}
                                </span>
                                {post.author && (
                                    <span className="pointer-events-none absolute top-2.5 right-2.5">
                                        <Face person={post.author} size={28} />
                                    </span>
                                )}
                                {post.kind === "video" && (
                                    <span className="pointer-events-none absolute top-2.5 left-2.5 inline-flex h-7 items-center gap-1 rounded-full bg-black/45 px-2.5 text-[0.75rem] font-semibold text-white backdrop-blur-md">
                                        <Play size={11} fill="currentColor" />
                                        {clock(post.duration) ?? t.wall.video}
                                    </span>
                                )}
                            </motion.button>
                            <span className="absolute right-2.5 bottom-2.5">
                                <LikeButton liked={liked.has(post.id)} count={counts[post.id] ?? post.likes} onToggle={() => toggle(post)} label={liked.has(post.id) ? t.wall.liked : t.wall.like} />
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            <AddPost slug={slug} />

            {/* Full screen: the picture grows out of its tile; a swipe down, the
                arrow or Escape brings the visitor back to the place. */}
            <AnimatePresence>
                {current && (
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={placeName}
                        className="fixed inset-0 z-[80] flex flex-col bg-black/95 text-white backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        onClick={close}
                    >
                        <div className="flex items-center gap-3 px-3 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2" onClick={(event) => event.stopPropagation()}>
                            <button type="button" onClick={close} className="inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-[0.875rem] font-semibold backdrop-blur-md transition active:scale-95">
                                <ArrowLeft size={17} />
                                {t.wall.back}
                            </button>
                            <span className="min-w-0 flex-1 truncate text-right text-[0.875rem] text-white/70">
                                {placeName} · <span className="tabular-nums">{(open ?? 0) + 1}/{posts.length}</span>
                            </span>
                        </div>

                        <motion.div
                            key={current.id}
                            layoutId={`post-${current.id}`}
                            drag
                            dragDirectionLock
                            dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
                            dragElastic={0.7}
                            onDragEnd={(_, info) => {
                                // Down (or up) closes; sideways turns the page.
                                if (Math.abs(info.offset.y) > 110 || Math.abs(info.velocity.y) > 700) close();
                                else if (posts.length > 1 && (Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 600)) step(info.offset.x < 0 ? 1 : -1);
                            }}
                            transition={{ type: "spring", stiffness: 320, damping: 32 }}
                            className="relative mx-auto flex min-h-0 w-full max-w-3xl flex-1 items-center justify-center overflow-hidden"
                            onClick={(event) => event.stopPropagation()}
                        >
                            {current.kind === "video" ? (
                                <video key={current.id} src={current.url} poster={current.poster ?? undefined} autoPlay loop playsInline controls className="h-full w-full object-contain" />
                            ) : (
                                <img src={current.url} alt={current.caption ?? ""} draggable={false} className="h-full w-full object-contain select-none" />
                            )}
                        </motion.div>

                        <div className="flex items-end gap-3 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)]" onClick={(event) => event.stopPropagation()}>
                            <div className="min-w-0 flex-1">
                                {current.author && (
                                    <div className="mb-2">
                                        <PersonLine person={current.author} locale={locale} size={34} light />
                                    </div>
                                )}
                                {current.caption && <p className="text-[1rem] leading-snug text-white/90">{current.caption}</p>}
                                {likedBy && <p className="mt-1.5 truncate text-[0.75rem] font-semibold text-white/70">{likedBy}</p>}
                            </div>
                            <button
                                type="button"
                                onClick={() => setTalking(true)}
                                aria-label={t.people.talk.title}
                                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-black/45 px-4 text-[0.875rem] font-semibold text-white backdrop-blur-md transition active:scale-90"
                            >
                                <MessageCircle size={18} />
                                {commentCount > 0 && <span className="tabular-nums">{commentCount}</span>}
                            </button>
                            {posts.length > 1 && (
                                <span className="hidden gap-2 sm:flex">
                                    <button type="button" onClick={() => step(-1)} aria-label={t.wall.previous} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 backdrop-blur-md transition active:scale-90">
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button type="button" onClick={() => step(1)} aria-label={t.wall.next} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 backdrop-blur-md transition active:scale-90">
                                        <ChevronRight size={20} />
                                    </button>
                                </span>
                            )}
                            <LikeButton large liked={liked.has(current.id)} count={counts[current.id] ?? current.likes} onToggle={() => toggle(current)} label={liked.has(current.id) ? t.wall.liked : t.wall.like} />
                        </div>

                        {/* On a phone: a tap on either edge goes to the next or the previous one. */}
                        {posts.length > 1 && (
                            <>
                                <button type="button" aria-label={t.wall.previous} onClick={(event) => { event.stopPropagation(); step(-1); }} className="absolute top-1/4 bottom-1/4 left-0 w-[16%] sm:hidden" />
                                <button type="button" aria-label={t.wall.next} onClick={(event) => { event.stopPropagation(); step(1); }} className="absolute top-1/4 right-0 bottom-1/4 w-[16%] sm:hidden" />
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {current && (
                <Sheet open={talking} onClose={() => setTalking(false)} closeLabel={t.people.common.close} title={t.people.talk.title} dark>
                    {current.author && (
                        <p className="mb-4 text-[0.75rem] font-semibold text-white/60">
                            {t.people.talk.by} {displayName(current.author)}
                        </p>
                    )}
                    <Talk
                        key={current.id}
                        target="wall"
                        ids={[current.id]}
                        postTo={current.id}
                        initial={social[current.id]?.comments}
                        light
                        compact
                        onCount={(count) => setTalkCounts((known) => (known[current.id] === count ? known : { ...known, [current.id]: count }))}
                    />
                </Sheet>
            )}
        </div>
    );
}
