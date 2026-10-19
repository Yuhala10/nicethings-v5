"use client";

import Link from "next/link";
import { Flag, Pencil, Share2 } from "lucide-react";
import { SITE_URL } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import { call, useMe } from "@/lib/people/client";
import { visitorId } from "../site/Analytics";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";

// Under a profile: share it, and for its owner, change it; for others,
// report it.
export default function ProfileActions({ id, handle, name }: { id: string; handle: string; name: string }) {
    const { locale, t } = useLocale();
    const words = t.people;
    const toast = useToast();
    const { me } = useMe();
    const mine = me?.id === id;
    const url = `${SITE_URL.replace(/^https:\/\/www\./, "https://")}/@${handle}`;

    const share = async () => {
        try {
            if (navigator.share) return await navigator.share({ title: name, url });
            await navigator.clipboard.writeText(url);
            toast(t.common.copied);
        } catch {}
    };

    return (
        <>
            {mine && (
                <Link href={paths.me(locale)} className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[0.875rem] font-semibold text-[#15110e]">
                    <Pencil size={15} />
                    {words.me.edit}
                </Link>
            )}
            <button type="button" onClick={share} className="inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-5 text-[0.875rem] font-semibold text-white">
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
        </>
    );
}
