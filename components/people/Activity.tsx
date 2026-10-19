"use client";

import Link from "next/link";
import { Bell, BellOff, PartyPopper } from "lucide-react";
import { useEffect, useState } from "react";
import { fill } from "@/lib/i18n";
import { formatRelativeDays } from "@/lib/i18n/format";
import { paths } from "@/lib/places/paths";
import { call, peekMe, setMe, useMe } from "@/lib/people/client";
import type { Notice } from "@/lib/people/types";
import { useLocale } from "../site/LocaleProvider";
import { Face } from "./Person";

// Activité, at the top of "Moi": who validated, answered, liked, and the
// levels reached; newest first, the unseen ones marked. And the switch that
// sends it to this phone as notifications.

const PHONE_KEY = "nt_me_phone";

function keyBytes(key: string) {
    const padded = (key + "=".repeat((4 - (key.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
    return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

type PhoneState = "unknown" | "off" | "on" | "blocked" | "iphone" | "unavailable" | "busy";

function PushSwitch() {
    const { locale, t } = useLocale();
    const words = t.people.activity;
    const [state, setState] = useState<PhoneState>("unknown");

    useEffect(() => {
        const frame = requestAnimationFrame(async () => {
            const apple = /iPhone|iPad|iPod/.test(navigator.userAgent);
            const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
            if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState(apple && !standalone ? "iphone" : "unavailable");
            if (Notification.permission === "denied") return setState("blocked");
            const registration = await navigator.serviceWorker.getRegistration().catch(() => undefined);
            const current = await registration?.pushManager.getSubscription().catch(() => null);
            let mine: string | null = null;
            try {
                mine = localStorage.getItem(PHONE_KEY);
            } catch {}
            setState(current && mine === current.endpoint ? "on" : "off");
        });
        return () => cancelAnimationFrame(frame);
    }, []);

    const turnOn = async () => {
        setState("busy");
        try {
            const { key } = (await (await fetch("/api/me/push")).json()) as { key: string | null };
            if (!key) return setState("unavailable");
            const registration = await navigator.serviceWorker.register("/sw.js");
            await navigator.serviceWorker.ready;
            const subscription = (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
            const keys = subscription.toJSON().keys ?? {};
            const answer = await call("/api/me/push", "POST", { endpoint: subscription.endpoint, p256dh: keys.p256dh, auth: keys.auth, lang: locale });
            if (answer.ok === false) return setState("off");
            try {
                localStorage.setItem(PHONE_KEY, subscription.endpoint);
            } catch {}
            setState("on");
        } catch {
            setState(typeof Notification !== "undefined" && Notification.permission === "denied" ? "blocked" : "off");
        }
    };

    const turnOff = async () => {
        setState("busy");
        const registration = await navigator.serviceWorker.getRegistration().catch(() => undefined);
        const subscription = await registration?.pushManager.getSubscription().catch(() => null);
        if (subscription) await call("/api/me/push", "DELETE", { endpoint: subscription.endpoint });
        try {
            localStorage.removeItem(PHONE_KEY);
        } catch {}
        setState("off");
    };

    if (state === "unknown") return null;
    if (state === "iphone" || state === "unavailable" || state === "blocked") {
        return <p className="mt-3 rounded-[1rem] bg-surface-2 px-4 py-3 text-[0.75rem] leading-relaxed font-semibold text-text-2">{state === "iphone" ? words.pushIphone : state === "blocked" ? words.pushBlocked : words.pushUnavailable}</p>;
    }
    return state === "on" ? (
        <p className="mt-3 flex items-center justify-between gap-3 rounded-[1rem] bg-open/10 px-4 py-2.5 text-[0.875rem] font-semibold text-open">
            <span className="flex items-center gap-2">
                <Bell size={16} />
                {words.pushOn}
            </span>
            <button type="button" onClick={turnOff} className="nt-tap inline-flex items-center gap-1 text-[0.75rem] text-muted">
                <BellOff size={13} />
                {words.pushOff}
            </button>
        </p>
    ) : (
        <button type="button" onClick={turnOn} disabled={state === "busy"} className="nt-btn nt-btn-soft mt-3 w-full disabled:opacity-60">
            <Bell size={16} />
            {words.push}
        </button>
    );
}

function noticeHref(notice: Notice, locale: "fr" | "en") {
    if (notice.data.outing) return paths.outing(locale, notice.data.outing);
    if (notice.kind === "follow" && notice.actor) return paths.person(locale, notice.actor.handle);
    if (notice.kind === "level" || !notice.data.place) return paths.me(locale);
    return `${paths.place(locale, notice.data.place)}${notice.kind === "tip_vote" ? "#y-aller" : notice.kind === "like" || notice.kind === "comment" ? "" : "#avis"}`;
}

export default function Activity() {
    const { locale, t } = useLocale();
    const words = t.people.activity;
    const { me } = useMe();
    const [notices, setNotices] = useState<Notice[] | null>(null);
    const [all, setAll] = useState(false);

    useEffect(() => {
        let gone = false;
        call<{ notices: Notice[] }>("/api/me/activity", "GET").then((answer) => {
            if (gone || answer.ok === false) return;
            setNotices(answer.notices);
            // Seen now: the dot goes; the list keeps showing what was new.
            if (answer.notices.some((notice) => !notice.read && notice.kind !== "level")) {
                call("/api/me/activity", "POST", {}).then(() => {
                    const current = peekMe().me;
                    if (current) setMe({ ...current, unread: 0 });
                });
            }
        });
        return () => {
            gone = true;
        };
    }, [me?.id]);

    const shown = all ? (notices ?? []) : (notices ?? []).slice(0, 6);

    return (
        <section className="mt-8">
            <h2 className="nt-section-title mb-4 flex items-center gap-2">
                {words.title}
                {Boolean(me?.unread) && <span className="rounded-full bg-closed px-2 py-0.5 font-sans text-[0.75rem] font-bold text-white">{me?.unread}</span>}
            </h2>
            {notices === null ? (
                <div className="nt-skeleton h-24 rounded-[1.25rem]" />
            ) : notices.length === 0 ? (
                <p className="rounded-[1.25rem] border border-dashed border-line-strong px-4 py-4 text-[0.875rem] text-muted">{words.empty}</p>
            ) : (
                <ul className="overflow-hidden rounded-[1.25rem] border border-line bg-surface divide-y divide-line">
                    {shown.map((notice) => (
                        <li key={notice.id}>
                            <Link href={noticeHref(notice, locale)} className={`flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2 ${notice.read ? "" : "bg-brand-50/60 dark:bg-brand-700/10"}`}>
                                {notice.actor ? (
                                    <Face person={notice.actor} size={38} />
                                ) : (
                                    <span className="nt-sunset grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full text-white">
                                        <PartyPopper size={18} />
                                    </span>
                                )}
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[0.875rem] leading-snug">
                                        {fill(words[notice.kind], { actor: notice.actor ? `@${notice.actor.handle}` : "", place: notice.data.name ?? "", level: t.people.levels[notice.data.level ?? 0] ?? "" })}
                                    </span>
                                    {notice.data.snippet && <span className="mt-0.5 block truncate text-[0.75rem] text-muted">« {notice.data.snippet} »</span>}
                                    <span className="mt-0.5 block text-[0.75rem] text-muted">{formatRelativeDays(notice.createdAt, locale)}</span>
                                </span>
                                {!notice.read && <span className="shrink-0 rounded-full bg-closed px-2 py-0.5 text-[0.75rem] font-bold text-white">{words.fresh}</span>}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            {!all && (notices?.length ?? 0) > 6 && (
                <button type="button" onClick={() => setAll(true)} className="nt-btn nt-btn-soft mt-3 w-full">
                    {t.common.seeMore}
                </button>
            )}
            <PushSwitch />
        </section>
    );
}
