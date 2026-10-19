"use client";

import Link from "next/link";
import { Flag, Pencil, Share2 } from "lucide-react";
import { useState } from "react";
import { paths } from "@/lib/places/paths";
import { call, useMe } from "@/lib/people/client";
import { visitorId } from "../site/Analytics";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";
import FollowButton from "./FollowButton";
import ShareCard from "./ShareCard";

// Under a profile: share its card, and for its owner, change it; for
// others, report it.
export default function ProfileActions({ id, handle, name, version }: { id: string; handle: string; name: string; version: string }) {
    const { locale, t } = useLocale();
    const words = t.people;
    const toast = useToast();
    const { me } = useMe();
    const mine = me?.id === id;
    const [sharing, setSharing] = useState(false);

    return (
        <>
            {!mine && <FollowButton handle={handle} light />}
            {mine && (
                <Link href={paths.me(locale)} className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[0.875rem] font-semibold text-[#15110e]">
                    <Pencil size={15} />
                    {words.me.edit}
                </Link>
            )}
            <button type="button" onClick={() => setSharing(true)} className="inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-5 text-[0.875rem] font-semibold text-white">
                <Share2 size={15} />
                {mine ? words.me.share : words.profile.share}
            </button>
            {!mine && (
                <button
                    type="button"
                    onClick={async () => {
                        await call("/api/flags", "POST", { kind: "profile", id, v: visitorId() });
                        toast(words.reviews.reported);
                    }}
                    aria-label={words.profile.report}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/70"
                >
                    <Flag size={15} />
                </button>
            )}
            <ShareCard open={sharing} onClose={() => setSharing(false)} handle={handle} name={name} version={version} mine={mine} />
        </>
    );
}
