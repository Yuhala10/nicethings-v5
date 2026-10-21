"use client";

import { useEffect, useState } from "react";
import { call } from "@/lib/people/client";
import type { ChatPrivacy, Person } from "@/lib/people/types";
import { Face, displayName } from "../people/Person";
import Sheet from "../people/Sheet";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";

// "Messages et confidentialité": who may write, the "vu à", the blue
// ticks, and the people one blocked (to unblock them).

function Switch({ on, label, lead, onChange }: { on: boolean; label: string; lead: string; onChange: (on: boolean) => void }) {
    return (
        <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center gap-3 py-3 text-left">
            <span className="min-w-0 flex-1">
                <span className="block font-semibold">{label}</span>
                <span className="block text-[0.8rem] text-muted">{lead}</span>
            </span>
            <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-[#1faa59]" : "bg-line-strong"}`}>
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[1.4rem]" : "left-0.5"}`} />
            </span>
        </button>
    );
}

export default function PrivacySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { t } = useLocale();
    const words = t.people.chat;
    const toast = useToast();
    const [privacy, setPrivacy] = useState<ChatPrivacy | null>(null);
    const [blocked, setBlocked] = useState<Person[]>([]);
    const [closed, setClosed] = useState(false);

    useEffect(() => {
        if (!open) return;
        call<{ privacy: ChatPrivacy; blocked: Person[] }>("/api/me/privacy", "GET").then((answer) => {
            if (answer.ok === false) return setClosed(answer.why === "closed");
            setPrivacy(answer.privacy);
            setBlocked(answer.blocked);
        });
    }, [open]);

    const save = async (change: Partial<ChatPrivacy>) => {
        if (!privacy) return;
        setPrivacy({ ...privacy, ...change });
        const answer = await call("/api/me/privacy", "POST", change);
        if (answer.ok === false) toast(t.people.common.failed);
    };

    return (
        <Sheet open={open} onClose={onClose} title={words.privacy.title} closeLabel={t.people.common.close}>
            {closed ? (
                <p className="text-text-2">{words.errors.closed}</p>
            ) : !privacy ? (
                <div className="nt-skeleton h-48 rounded-2xl" />
            ) : (
                <div>
                    <p className="text-[0.875rem] font-semibold">{words.privacy.from}</p>
                    <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-full bg-surface-2 p-1">
                        {(["everyone", "following", "nobody"] as const).map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => save({ messagesFrom: value })}
                                aria-pressed={privacy.messagesFrom === value}
                                className={`min-h-10 rounded-full px-2 text-[0.8rem] font-semibold transition ${privacy.messagesFrom === value ? "bg-surface shadow" : "text-text-2"}`}
                            >
                                {words.privacy[value]}
                            </button>
                        ))}
                    </div>
                    <div className="mt-3 divide-y divide-line">
                        <Switch on={privacy.hideLastSeen} label={words.privacy.lastSeen} lead={words.privacy.lastSeenLead} onChange={(on) => save({ hideLastSeen: on })} />
                        <Switch on={privacy.hideRead} label={words.privacy.read} lead={words.privacy.readLead} onChange={(on) => save({ hideRead: on })} />
                    </div>
                    <p className="mt-5 text-[0.875rem] font-semibold">{words.privacy.blocked}</p>
                    {blocked.length ? (
                        <ul className="mt-2 flex flex-col gap-1">
                            {blocked.map((person) => (
                                <li key={person.id} className="flex items-center gap-3 py-1.5">
                                    <Face person={person} size={36} />
                                    <span className="min-w-0 flex-1 truncate font-semibold">{displayName(person)}</span>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            const answer = await call("/api/chats/actions", "POST", { handle: person.handle, action: "unblock" });
                                            if (answer.ok !== false) setBlocked((list) => list.filter((item) => item.id !== person.id));
                                        }}
                                        className="nt-btn nt-btn-outline h-9 px-3 text-[0.8rem]"
                                    >
                                        {words.menu.unblock}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-1 text-[0.875rem] text-muted">{words.privacy.noneBlocked}</p>
                    )}
                    <p className="mt-5 rounded-2xl bg-surface-2 p-3 text-[0.8rem] leading-relaxed text-text-2">{words.privacy.note}</p>
                </div>
            )}
        </Sheet>
    );
}
