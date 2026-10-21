"use client";

import Link from "next/link";
import { Flag, Heart, MapPin, MessageCircle, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import { SITE_URL, fill } from "@/lib/i18n";
import { formatPrice } from "@/lib/i18n/format";
import { paths } from "@/lib/places/paths";
import { useSaved } from "@/lib/hooks/useSaved";
import { call, withMe } from "@/lib/people/client";
import { sharePlace } from "@/lib/share";
import type { OutingView } from "@/lib/people/types";
import { visitorId } from "../site/Analytics";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";
import FollowButton from "./FollowButton";
import { PersonLine } from "./Person";
import { agoText } from "./PlacePulse";
import Sheet from "./Sheet";
import Talk from "./Talk";

// One outing: who went, their photos (swiped sideways) or video, the place
// as a card that opens it, the vibe, the price, the words. A heart, the
// comments, and "J'y vais aussi", which keeps the place for later.

export default function OutingCard({ outing, onRemoved }: { outing: OutingView; onRemoved?: (id: string) => void }) {
    const { locale, t } = useLocale();
    const words = t.people.outing;
    const toast = useToast();
    const { isSaved, toggle } = useSaved();
    const [liked, setLiked] = useState(outing.liked);
    const [likes, setLikes] = useState(outing.likes);
    const [going, setGoing] = useState(outing.going);
    const [goers, setGoers] = useState(outing.goers);
    const [comments, setComments] = useState(outing.comments);
    const [talking, setTalking] = useState(false);
    const [shown, setShown] = useState(0);
    const url = `${SITE_URL.replace(/^https:\/\/www\./, "https://")}${paths.outing(locale, outing.id)}`;

    const react = (what: "like" | "go") =>
        withMe("like", async () => {
            if (what === "like") {
                const on = !liked;
                setLiked(on);
                setLikes((count) => Math.max(0, count + (on ? 1 : -1)));
                const answer = await call<{ count: number }>("/api/outings/react", "POST", { id: outing.id, what, on });
                if (answer.ok === true) setLikes(answer.count);
                return;
            }
            const on = !going;
            setGoing(on);
            setGoers((count) => Math.max(0, count + (on ? 1 : -1)));
            // Going: the place joins their favourites.
            if (on && !isSaved(outing.place.slug)) toggle(outing.place.slug);
            if (on) toast(words.goingDone);
            const answer = await call<{ count: number }>("/api/outings/react", "POST", { id: outing.id, what, on });
            if (answer.ok === true) setGoers(answer.count);
        });

    // The outing's own photo goes with the link.
    const share = async () => {
        const result = await sharePlace(outing.place.name, url, "", outing.media[0]?.poster ?? outing.media[0]?.url);
        if (result === "copied") toast(t.common.copied);
    };

    const remove = async () => {
        if (!window.confirm(words.confirmDelete)) return;
        await call(`/api/outings?id=${outing.id}`, "DELETE");
        onRemoved?.(outing.id);
    };

    const facts = [outing.mood ? words.moods[outing.mood as keyof typeof words.moods] : null, outing.pricePaid ? fill(words.paidLabel, { price: formatPrice(outing.pricePaid, locale) }) : null, outing.company ? t.people.companies[outing.company as keyof typeof t.people.companies] : null].filter(Boolean);

    return (
        <article className="overflow-hidden rounded-[1.5rem] border border-line bg-surface">
            <header className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                    <PersonLine person={outing.person} locale={locale} meta={agoText(outing.at, t.people.pulse)} size={38} />
                </div>
                {!outing.mine && <FollowButton handle={outing.person.handle} small />}
            </header>

            {/* The photos, one after the other, or the video. */}
            <div className="relative">
                <div
                    className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    onScroll={(event) => {
                        const box = event.currentTarget;
                        setShown(Math.round(box.scrollLeft / Math.max(1, box.clientWidth)));
                    }}
                >
                    {outing.media.map((item, index) => (
                        <div key={item.url} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-surface-2">
                            {item.kind === "video" ? (
                                <video src={item.url} poster={item.poster ?? undefined} controls playsInline preload="none" className="h-full w-full object-cover" />
                            ) : (
                                        <img src={item.url} alt={index === 0 ? `${outing.place.name}, ${outing.person.handle}` : ""} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                            )}
                        </div>
                    ))}
                </div>
                {outing.media.length > 1 && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                        {outing.media.map((item, index) => (
                            <span key={item.url} className={`h-1.5 rounded-full transition-all ${index === shown ? "w-4 bg-white" : "w-1.5 bg-white/60"}`} />
                        ))}
                    </div>
                )}
                {outing.status === "PENDING" && <span className="absolute top-3 left-3 rounded-full bg-[#b7791f] px-3 py-1 text-[0.75rem] font-bold text-white">{words.pending}</span>}
            </div>

            <div className="p-3.5">
                {/* The place, as a card that opens it. */}
                <Link href={paths.place(locale, outing.place.slug)} className="flex items-center gap-3 rounded-[1rem] bg-surface-2 p-2.5 transition hover:bg-surface-3">
                    {outing.place.cover ? (
                        <img src={outing.place.cover} alt="" className="h-11 w-11 shrink-0 rounded-[0.75rem] object-cover" />
                    ) : (
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[0.75rem] bg-surface text-brand-600">
                            <MapPin size={18} />
                        </span>
                    )}
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.875rem] font-semibold">{outing.place.name}</span>
                        {outing.place.neighborhood && <span className="block truncate text-[0.75rem] text-muted">{outing.place.neighborhood}</span>}
                    </span>
                </Link>
                {facts.length > 0 && <p className="mt-3 text-[0.875rem] font-semibold">{facts.join(" · ")}</p>}
                {outing.body && <p className="mt-1.5 text-[1rem] leading-relaxed whitespace-pre-line text-text-2">{outing.body}</p>}

                <div className="mt-3 flex items-center gap-1">
                    <button type="button" onClick={() => react("like")} aria-pressed={liked} className="nt-tap inline-flex h-10 items-center gap-1.5 rounded-full px-2.5 text-[0.875rem] font-semibold">
                        <Heart size={20} className={liked ? "nt-pop fill-brand-500 text-brand-500" : ""} />
                        {likes > 0 && <span className="tabular-nums">{likes}</span>}
                    </button>
                    <button type="button" onClick={() => setTalking(true)} className="nt-tap inline-flex h-10 items-center gap-1.5 rounded-full px-2.5 text-[0.875rem] font-semibold" aria-label={t.people.talk.title}>
                        <MessageCircle size={20} />
                        {comments > 0 && <span className="tabular-nums">{comments}</span>}
                    </button>
                    <button type="button" onClick={share} className="nt-tap inline-flex h-10 items-center rounded-full px-2.5" aria-label={words.share}>
                        <Share2 size={19} />
                    </button>
                    <span className="ml-auto flex items-center gap-2">
                        {outing.mine ? (
                            <button type="button" onClick={remove} className="nt-tap text-muted" aria-label={words.delete}>
                                <Trash2 size={16} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={async () => {
                                    await call("/api/flags", "POST", { kind: "outing", id: outing.id, v: visitorId() });
                                    toast(t.people.reviews.reported);
                                }}
                                className="nt-tap text-muted"
                                aria-label={t.people.reviews.report}
                            >
                                <Flag size={15} />
                            </button>
                        )}
                        {!outing.mine && outing.status === "PUBLISHED" && (
                            <button type="button" onClick={() => react("go")} aria-pressed={going} className={`inline-flex h-9 items-center rounded-full px-3.5 text-[0.75rem] font-bold transition active:scale-95 ${going ? "bg-open/15 text-open" : "nt-sunset text-white"}`}>
                                {going ? "✓ " : ""}
                                {words.going}
                            </button>
                        )}
                    </span>
                </div>
                {goers > 0 && <p className="mt-1 px-2.5 text-[0.75rem] font-semibold text-muted">{fill(words.goers, { count: goers })}</p>}
            </div>

            <Sheet open={talking} onClose={() => setTalking(false)} closeLabel={t.people.common.close} title={t.people.talk.title}>
                <Talk target="outing" ids={[outing.id]} postTo={outing.id} compact onCount={setComments} />
            </Sheet>
        </article>
    );
}
