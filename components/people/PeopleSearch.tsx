"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { paths } from "@/lib/places/paths";
import type { Person } from "@/lib/people/types";
import { useLocale } from "../site/LocaleProvider";
import { Face, LevelBadge, VerifiedBadge, displayName } from "./Person";

// Members whose @name or name matches what was typed. `to` says where a
// tap goes: their profile, or a conversation with them.

export function usePeople(text: string) {
    const words = text.replace(/^@/, "").trim();
    const [found, setFound] = useState<{ words: string; people: Person[] } | null>(null);
    useEffect(() => {
        if (words.length < 2) return;
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            fetch(`/api/people?q=${encodeURIComponent(words)}`, { signal: controller.signal })
                .then((response) => response.json())
                .then((answer: { people?: Person[] }) => setFound({ words, people: answer.people ?? [] }))
                .catch(() => {});
        }, 250);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [words]);
    return words.length >= 2 && found?.words === words ? found.people : [];
}

export default function PeopleSearch({ text, to = "profile", title, exclude }: { text: string; to?: "profile" | "chat"; title?: string; exclude?: string }) {
    const { locale } = useLocale();
    const people = usePeople(text).filter((person) => person.handle !== exclude);
    if (!people.length) return null;
    return (
        <div>
            {title && <p className="nt-eyebrow mb-2 px-1">{title}</p>}
            <ul className="flex flex-col">
                {people.slice(0, 8).map((person) => (
                    <li key={person.id}>
                        <Link href={to === "chat" ? paths.chat(locale, person.handle) : paths.person(locale, person.handle)} className="flex min-h-14 items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-surface-2 active:scale-[0.99]">
                            <Face person={person} size={44} />
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1">
                                    <span className="truncate font-semibold">{displayName(person)}</span>
                                    <VerifiedBadge person={person} locale={locale} size={14} />
                                </span>
                                <span className="block truncate text-[0.8rem] text-muted">@{person.handle}</span>
                            </span>
                            <LevelBadge level={person.level} locale={locale} />
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
