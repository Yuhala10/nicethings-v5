"use client";

import { useEffect, useRef } from "react";

// A thin sunset line at the top of the screen that fills as you read.
// Updated with a transform on scroll, so it never repaints the page.
export default function ReadingProgress({ target }: { target: string }) {
    const bar = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            const article = document.getElementById(target);
            if (!article || !bar.current) return;
            const box = article.getBoundingClientRect();
            const total = box.height - window.innerHeight * 0.6;
            const done = total > 0 ? Math.min(1, Math.max(0, -box.top / total)) : 1;
            bar.current.style.transform = `scaleX(${done})`;
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            cancelAnimationFrame(frame);
        };
    }, [target]);

    return (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1" aria-hidden>
            <div ref={bar} className="nt-sunset h-full origin-left" style={{ transform: "scaleX(0)" }} />
        </div>
    );
}
