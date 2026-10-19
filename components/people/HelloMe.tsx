"use client";

import Link from "next/link";
import { fill } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import { useMe } from "@/lib/people/client";
import { useLocale } from "../site/LocaleProvider";
import { Face, displayName } from "./Person";

// At the top of the home page, for someone signed in: their face and
// "On dit quoi, Darren ?", leading to their profile. Nothing for others,
// and it takes no room until it shows.
export default function HelloMe() {
    const { locale, t } = useLocale();
    const { me } = useMe();
    if (!me) return null;
    return (
        <Link href={paths.me(locale)} className="nt-rise flex h-9 min-w-0 items-center gap-2 rounded-full border border-line-strong bg-surface py-0.5 pr-3 pl-0.5">
            <Face person={me} size={30} />
            <span className="max-w-[9.5rem] truncate text-[0.75rem] font-semibold">{fill(t.people.hello, { name: me.name?.split(" ")[0] || displayName(me) })}</span>
        </Link>
    );
}
