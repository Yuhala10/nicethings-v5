"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import { fill } from "@/lib/i18n";
import { cardVersion } from "@/lib/people/card-version";
import { call, setMe, useMe } from "@/lib/people/client";
import { useLocale } from "../site/LocaleProvider";
import { Face, Ranks, displayName } from "./Person";
import ShareCard from "./ShareCard";
import Sheet from "./Sheet";

// A level reached is celebrated once, the next time the member opens the
// site: their face in its new ring, the level's name, and their new card
// ready to post.
export default function LevelUp() {
    const { locale, t } = useLocale();
    const words = t.people;
    const { me } = useMe();
    const [sharing, setSharing] = useState(false);
    const [closed, setClosed] = useState<string | null>(null);

    if (!me?.levelUp || closed === me.levelUp.id) return sharing && me ? <ShareCard open onClose={() => setSharing(false)} handle={me.handle} name={displayName(me)} version={cardVersion({ person: me, stats: me.stats, top: me.topPlaces.map((slug) => ({ slug })), bio: me.bio })} mine /> : null;
    const level = me.levelUp.level;

    // Seen: it is not celebrated again.
    const done = (share: boolean) => {
        const id = me.levelUp!.id;
        setClosed(id);
        call("/api/me/activity", "POST", { id });
        setMe({ ...me, levelUp: null, unread: Math.max(0, me.unread - 1) });
        if (share) setSharing(true);
    };

    return (
        <Sheet open onClose={() => done(false)} closeLabel={words.common.close}>
            <div className="pb-2 text-center">
                <p className="text-[3.5rem] leading-none" aria-hidden>
                    🎉
                </p>
                <p className="nt-eyebrow mt-4">{words.levelUp.eyebrow}</p>
                <Face person={{ ...me, level }} size={112} className="mx-auto mt-4 shadow-float" />
                <h2 className="nt-serif mt-5 text-[2.25rem] leading-[1.05]">{fill(words.levelUp.title, { level: words.levels[level] ?? "" })}</h2>
                <p className="mt-2 text-[1rem] text-text-2">{words.levelLeads[level]}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Ranks person={{ ...me, level }} locale={locale} />
                </div>
                <button type="button" onClick={() => done(true)} className="nt-btn nt-btn-primary mt-6 w-full">
                    <Share2 size={16} />
                    {words.levelUp.share}
                </button>
                <button type="button" onClick={() => done(false)} className="nt-btn nt-btn-soft mt-2.5 w-full">
                    {words.levelUp.ok}
                </button>
            </div>
        </Sheet>
    );
}
