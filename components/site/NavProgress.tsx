"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// Every tap on an internal link gets an immediate answer: a sunset bar
// slides across the top until the next page is on screen. Touching a link
// also starts loading it, so the page is often ready by the time the
// finger lifts.
export default function NavProgress() {
    const pathname = usePathname();
    const router = useRouter();
    const [progress, setProgress] = useState<number | null>(null);
    const timer = useRef<number | undefined>(undefined);

    // Page changed: finish and fade out.
    useEffect(() => {
        window.clearInterval(timer.current);
         
        setProgress((current) => (current === null ? null : 100));
        const hide = window.setTimeout(() => setProgress(null), 260);
        return () => window.clearTimeout(hide);
    }, [pathname]);

    useEffect(() => {
        const internalLink = (target: EventTarget | null) => {
            const anchor = (target as HTMLElement | null)?.closest?.("a");
            if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return null;
            const url = new URL(anchor.href, window.location.href);
            if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return null;
            if (/^\/(admin|api)/.test(url.pathname)) return null;
            return url;
        };

        const onTouch = (event: PointerEvent) => {
            const url = internalLink(event.target);
            if (url) router.prefetch(url.pathname + url.search);
        };

        const onClick = (event: MouseEvent) => {
            // Capture phase: runs before Next's Link cancels the default click.
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
            if (!internalLink(event.target)) return;
            window.clearInterval(timer.current);
            setProgress(12);
            // Creep towards 90% while waiting; never pretend to finish.
            timer.current = window.setInterval(() => {
                setProgress((current) => (current === null ? null : Math.min(90, current + (90 - current) * 0.12)));
            }, 180);
        };

        document.addEventListener("pointerdown", onTouch, { passive: true });
        document.addEventListener("click", onClick, true);
        return () => {
            document.removeEventListener("pointerdown", onTouch);
            document.removeEventListener("click", onClick, true);
            window.clearInterval(timer.current);
        };
    }, [router]);

    if (progress === null) return null;
    return (
        <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]">
            <div
                className="nt-sunset h-full rounded-r-full shadow-[0_0_12px_rgba(255,91,54,0.8)] transition-[width,opacity] duration-200 ease-out"
                style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
            />
        </div>
    );
}
