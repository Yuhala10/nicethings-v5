"use client";

import { useEffect } from "react";
import { fill } from "@/lib/i18n";
import { JOIN_LATER_KEY, JOIN_LATER_MS, loadMe, openAuth, peekMe, useMe } from "@/lib/people/client";
import { WELCOME_SEEN_KEY } from "@/lib/welcome-script";
import { Face, displayName } from "../people/Person";
import { useLocale } from "./LocaleProvider";

// The welcome: someone entering the site is received before the page they
// asked for (lib/welcome-script.ts decides who is "entering", before anything
// is drawn). The name, one of the site's own lines about the country, and an
// invitation to touch. It waits for that touch, then lifts away over the
// page, which was loading underneath all along.
//
// It is in every page, hidden: site.css shows it only when the script above
// has asked for it, and the same script opens it. What this component adds
// is noting when the visitor looks away, which is how a later return is told
// from a page change; greeting a member by name; and, for someone without a
// profile, the profile sheet as soon as they are in (not again for three
// days if they said "later").
export default function Welcome() {
    const { t } = useLocale();
    const { me } = useMe();

    useEffect(() => {
        const seen = () => {
            if (!document.hidden) return;
            try {
                localStorage.setItem(WELCOME_SEEN_KEY, String(Date.now()));
            } catch {
                // No storage: the welcome then follows the tab alone.
            }
        };
        document.addEventListener("visibilitychange", seen);
        return () => document.removeEventListener("visibilitychange", seen);
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        let timer: number | undefined;
        const entered = async () => {
            if (!peekMe().ready) await loadMe();
            const { me: member, closed } = peekMe();
            if (member || closed) return;
            try {
                if (Date.now() - Number(localStorage.getItem(JOIN_LATER_KEY) ?? 0) < JOIN_LATER_MS) return;
            } catch {}
            openAuth("welcome");
        };
        // Touched before this page's scripts were ready: it is already in.
        const touched = Number(root.getAttribute("data-nt-entered") ?? 0);
        if (root.getAttribute("data-nt-welcome") !== "1") {
            if (Date.now() - touched < 15_000) timer = window.setTimeout(entered, 400);
            // Otherwise not shown this time (a page change, a robot, a guidance link…).
            return () => window.clearTimeout(timer);
        }
        const watcher = new MutationObserver(() => {
            if (root.getAttribute("data-nt-welcome") !== "open") return;
            watcher.disconnect();
            // Once the welcome has lifted away.
            timer = window.setTimeout(entered, 650);
        });
        watcher.observe(root, { attributes: true, attributeFilter: ["data-nt-welcome"] });
        return () => {
            watcher.disconnect();
            window.clearTimeout(timer);
        };
    }, []);

    return (
        <div className="nt-welcome" aria-hidden>
            <div className="nt-welcome-glow" />
            <div className="relative flex flex-col items-center">
                <img src="/brand/icon.svg" alt="" width={56} height={56} className="nt-welcome-rise h-14 w-14" />
                <p className="nt-welcome-rise mt-8 text-[0.75rem] font-semibold tracking-[0.32em] text-[#d9bc8c] uppercase">{t.welcome.eyebrow}</p>
                <p className="nt-welcome-rise nt-serif mt-3 text-[4.5rem] leading-[0.95]">NiceThings</p>
                <span className="nt-welcome-rise mt-8 block h-px w-16 bg-[#d9bc8c]/60" />
                {/* One of three lines, chosen before the page is drawn. */}
                {t.welcome.lines.map((line, index) => (
                    <p key={line} data-quote={index} className="nt-welcome-quote nt-welcome-rise nt-serif mt-8 max-w-[16ch] text-[2.25rem] leading-[1.08] text-[#faf7f2]/90 italic">
                        {line}
                    </p>
                ))}
                {/* A member is greeted by name. */}
                {me && (
                    <p className="nt-welcome-rise mt-9 flex items-center gap-3 rounded-full bg-white/10 py-1.5 pr-5 pl-1.5 text-[1rem] font-semibold">
                        <Face person={me} size={40} />
                        {fill(t.people.welcomeBack, { name: me.name?.split(" ")[0] || displayName(me) })}
                    </p>
                )}
            </div>
            <p className="nt-welcome-hint">
                <span className="nt-welcome-rise">{t.welcome.skip}</span>
            </p>
        </div>
    );
}
