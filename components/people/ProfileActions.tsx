"use client";

import Link from "next/link";
import { Flag, MessageCircle, Pencil, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { paths } from "@/lib/places/paths";
import { call, useMe, withMe } from "@/lib/people/client";
import { visitorId } from "../site/Analytics";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";
import FollowButton from "./FollowButton";
import ShareCard from "./ShareCard";

// Under a profile: share its card, and for its owner, change it; for
// others, follow, write to them, report them.
export default function ProfileActions({ id, handle, name, version }: { id: string; handle: string; name: string; version: string }) {
    const { locale, t } = useLocale();
    const words = t.people;
    const toast = useToast();
    const { me } = useMe();
    const mine = me?.id === id;
    const [sharing, setSharing] = useState(false);
    const router = useRouter();

    return (
        <>
            {!mine && <FollowButton handle={handle} light />}
            {!mine && (
                <button
                    type="button"
                    onClick={() => withMe("generic", () => router.push(paths.chat(locale, handle)))}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-[#25d366] px-5 text-[0.875rem] font-semibold text-white"
                >
                    <MessageCircle size={15} />
                    {words.chat.write}
                </button>
            )}
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
