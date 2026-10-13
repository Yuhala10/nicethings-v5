"use client";

import { useEffect, useRef } from "react";
import { WELCOME_SEEN_KEY } from "@/lib/welcome-script";
import { useLocale } from "./LocaleProvider";

// The welcome: for a few seconds, someone entering the site is received
// before the page they asked for (lib/welcome-script.ts decides who is
// "entering", before anything is drawn). The name, one of the site's own
// lines about the country, then it lifts away over the page, which was
// loading underneath all along. A touch anywhere opens it at once.
//
// It is in every page, hidden: site.css shows it only when the script above
// has asked for it, and plays its whole course without this component. What
// this adds is the touch that skips it, and tidying up once it has gone.
export default function Welcome() {
    const { t } = useLocale();
    const curtain = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const root = document.documentElement;
        // The site was "last seen" when the visitor last looked away from it.
        const seen = () => {
            if (!document.hidden) return;
            try {
                localStorage.setItem(WELCOME_SEEN_KEY, String(Date.now()));
            } catch {
                // No storage: the welcome then follows the tab alone.
            }
        };
        document.addEventListener("visibilitychange", seen);
        if (root.getAttribute("data-nt-welcome") !== "1") return () => document.removeEventListener("visibilitychange", seen);

        const open = () => root.setAttribute("data-nt-welcome", "open");
        const gone = (event: AnimationEvent) => {
            if (event.target === curtain.current && event.animationName === "nt-welcome-leave") root.removeAttribute("data-nt-welcome");
        };
        const node = curtain.current;
        node?.addEventListener("animationend", gone);
        window.addEventListener("pointerdown", open, { once: true });
        window.addEventListener("keydown", open, { once: true });
        return () => {
            document.removeEventListener("visibilitychange", seen);
            node?.removeEventListener("animationend", gone);
            window.removeEventListener("pointerdown", open);
            window.removeEventListener("keydown", open);
        };
    }, []);

    return (
        <div ref={curtain} className="nt-welcome" aria-hidden>
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
            </div>
            <p className="nt-welcome-rise nt-welcome-hint">{t.welcome.skip}</p>
        </div>
    );
}
