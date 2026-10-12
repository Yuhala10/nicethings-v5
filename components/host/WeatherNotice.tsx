"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { fill } from "@/lib/i18n";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";

// "Tell me when it rains": under "right now", a visitor can ask to be told
// when the weather changes in the city on screen (lib/push-server.ts). It
// shows only where it can work: a browser that can receive notices, and a
// site where they are switched on. One tap on, one tap off; switching off
// erases the phone's address on the server.

// Which city this phone asked about, to say so on the button.
const CITY_KEY = "nt_notice_city";
const JSON_HEADERS = { "Content-Type": "application/json" };

// The public key as the browser wants it.
function keyBytes(key: string) {
    const padded = (key + "=".repeat((4 - (key.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
    return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

const remember = (city: string | null) => {
    try {
        if (city) localStorage.setItem(CITY_KEY, city);
        else localStorage.removeItem(CITY_KEY);
    } catch {
        // Not kept: the button then names no city.
    }
};

export default function WeatherNotice({ city, cityName }: { city: string; cityName: string }) {
    const { locale, t } = useLocale();
    const toast = useToast();
    const key = useRef<string | null>(null);
    const [state, setState] = useState<"hidden" | "off" | "on" | "busy">("hidden");
    const [told, setTold] = useState<string | null>(null); // the city this phone is told about

    useEffect(() => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
        let cancelled = false;
        (async () => {
            const answer = (await fetch("/api/push?ready=1")
                .then((response) => (response.ok ? response.json() : null))
                .catch(() => null)) as { ready?: boolean; key?: string | null } | null;
            if (cancelled || !answer?.ready || !answer.key) return;
            key.current = answer.key;
            const registration = await navigator.serviceWorker.getRegistration().catch(() => undefined);
            const current = (await registration?.pushManager.getSubscription().catch(() => null)) ?? null;
            if (cancelled) return;
            const on = Boolean(current) && Notification.permission === "granted";
            try {
                setTold(on ? localStorage.getItem(CITY_KEY) : null);
            } catch {
                setTold(null);
            }
            setState(on ? "on" : "off");
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const turnOn = async () => {
        if (!key.current) return;
        setState("busy");
        try {
            if ((await Notification.requestPermission()) !== "granted") {
                toast(t.notice.refused);
                setState("off");
                return;
            }
            const registration = await navigator.serviceWorker.register("/sw.js");
            await navigator.serviceWorker.ready;
            const subscription = (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key.current) }));
            const keys = subscription.toJSON().keys ?? {};
            const saved = await fetch("/api/push", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ endpoint: subscription.endpoint, p256dh: keys.p256dh, auth: keys.auth, city, lang: locale }) });
            if (!saved.ok) throw new Error("not saved");
            remember(cityName);
            setTold(cityName);
            setState("on");
            toast(fill(t.notice.thanks, { city: cityName }));
        } catch {
            setState("off");
            toast(t.notice.failed);
        }
    };

    const turnOff = async () => {
        setState("busy");
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            const subscription = await registration?.pushManager.getSubscription();
            if (subscription) {
                await fetch("/api/push", { method: "DELETE", headers: JSON_HEADERS, body: JSON.stringify({ endpoint: subscription.endpoint }) }).catch(() => {});
                await subscription.unsubscribe();
            }
            remember(null);
            setTold(null);
            setState("off");
            toast(t.notice.stopped);
        } catch {
            setState("on");
        }
    };

    if (state === "hidden") return null;
    const on = state === "on";
    return (
        <button type="button" role="switch" aria-checked={on} disabled={state === "busy"} onClick={() => void (on ? turnOff() : turnOn())} className="nt-chip mt-4 disabled:opacity-60">
            {on ? <BellRing size={15} className="text-brand-600" /> : <Bell size={15} className="text-muted" />}
            {on ? (told ? fill(t.notice.on, { city: told }) : t.notice.onPlain) : fill(t.notice.offer, { city: cityName })}
        </button>
    );
}
