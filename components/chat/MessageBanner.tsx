"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fill } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import { useMe } from "@/lib/people/client";
import { onArrival, useInbox } from "@/lib/people/inbox";
import type { ChatSummary } from "@/lib/people/types";
import { Face, VerifiedBadge, displayName } from "../people/Person";
import { useLocale } from "../site/LocaleProvider";
import { previewOf } from "./format";

// A message arrives while one is on the site (or was waiting when one came
// back): it slides down from the top of the screen, like on WhatsApp, with
// the face, the name and the words. A tap opens the conversation; pushed
// up or left alone, it goes away. Not shown while that conversation, or
// the list of messages, is already on screen.

let audio: AudioContext | null = null;

// Two soft notes, once the visitor has touched the page (browsers refuse
// sound before that).
function chime() {
    try {
        const touched = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive;
        if (touched === false) return;
        audio ??= new AudioContext();
        audio.resume().catch(() => {});
        const now = audio.currentTime;
        [880, 1318].forEach((hz, index) => {
            const osc = audio!.createOscillator();
            const gain = audio!.createGain();
            osc.type = "sine";
            osc.frequency.value = hz;
            gain.gain.setValueAtTime(0.0001, now + index * 0.11);
            gain.gain.linearRampToValueAtTime(0.08, now + index * 0.11 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.11 + 0.28);
            osc.connect(gain).connect(audio!.destination);
            osc.start(now + index * 0.11);
            osc.stop(now + index * 0.11 + 0.3);
        });
    } catch {}
}

export default function MessageBanner() {
    const { locale, t } = useLocale();
    const words = t.people.chat;
    const { me } = useMe();
    const router = useRouter();
    useInbox(me?.id ?? null);
    const [shown, setShown] = useState<{ chat: ChatSummary; more: number } | null>(null);
    const timer = useRef(0);

    useEffect(
        () =>
            onArrival((chat, more) => {
                const here = window.location.pathname;
                if (here === paths.chat(locale, chat.person.handle) || here === paths.messages(locale)) return;
                setShown({ chat, more });
                chime();
                navigator.vibrate?.(35);
                window.clearTimeout(timer.current);
                timer.current = window.setTimeout(() => setShown(null), 7000);
            }),
        [locale]
    );

    const open = () => {
        if (!shown) return;
        router.push(paths.chat(locale, shown.chat.person.handle));
        setShown(null);
    };

    const chat = shown?.chat;
    return (
        <AnimatePresence>
            {chat && (
                <motion.div
                    key={chat.id}
                    initial={{ y: -120, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -120, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0.6, bottom: 0.1 }}
                    onDragEnd={(_, info) => info.offset.y < -30 && setShown(null)}
                    className="fixed inset-x-0 top-0 z-[85] px-3 pt-[max(env(safe-area-inset-top),0.6rem)]"
                    role="status"
                    aria-live="polite"
                >
                    <div className="mx-auto flex max-w-md items-center gap-3 rounded-[1.4rem] border border-white/10 bg-[#15110e]/95 p-3 text-white shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md">
                        <button type="button" onClick={open} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                            <span className="relative shrink-0">
                                <Face person={chat.person} size={46} />
                                <span className="absolute -right-1 -bottom-1 grid h-5 w-5 place-items-center rounded-full border-2 border-[#15110e] bg-[#25d366] text-[0.6rem]">💬</span>
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1">
                                    <span className="truncate text-[0.95rem] font-bold">{displayName(chat.person)}</span>
                                    <VerifiedBadge person={chat.person} locale={locale} size={14} />
                                    <span className="ml-auto shrink-0 pl-2 text-[0.7rem] text-white/50">NiceThings</span>
                                </span>
                                <span className="line-clamp-2 text-[0.875rem] leading-snug text-white/85">
                                    {chat.request ? fill(t.people.chat.push.request, { name: displayName(chat.person) }) : chat.last ? previewOf(chat.last.kind, chat.last.body, words) : ""}
                                </span>
                                {shown.more > 0 && <span className="mt-0.5 block text-[0.75rem] font-semibold text-[#25d366]">{fill(words.unread, { count: shown.more + 1 })}</span>}
                            </span>
                        </button>
                        <button type="button" onClick={() => setShown(null)} aria-label={t.people.common.close} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10">
                            <X size={16} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
