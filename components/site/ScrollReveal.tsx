"use client";

import { useEffect } from "react";

// Sections and tiles settle into place as they come on screen. Recent
// browsers do it in CSS alone (scroll-driven animations, see site.css); the
// others, many iPhones among them, get the same movement from here. The
// effect is switched on by this script and by nothing else, and it marks
// elements with data attributes React never touches: without it, or if it
// stops, everything simply shows.
const TARGETS = ".nt-reveal, .nt-settle > *";
const SETTLED_AFTER = 1100; // ms: the movement is over, the element gets its own transitions back

export default function ScrollReveal() {
    useEffect(() => {
        if (typeof CSS !== "undefined" && CSS.supports?.("animation-timeline: view()")) return;
        if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const root = document.documentElement;
        const seen = new WeakSet<Element>();
        const arrive = (element: Element) => {
            element.setAttribute("data-nt-in", "in");
            window.setTimeout(() => element.setAttribute("data-nt-in", "done"), SETTLED_AFTER);
        };
        const watcher = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    watcher.unobserve(entry.target);
                    arrive(entry.target);
                }
            },
            { rootMargin: "0px 0px -6% 0px" }
        );
        // `first`: the page as it was painted. What is already on screen stays
        // put; only what is still below will move.
        const take = (first: boolean) => {
            for (const element of document.querySelectorAll(TARGETS)) {
                if (seen.has(element)) continue;
                seen.add(element);
                if (element.getBoundingClientRect().top >= window.innerHeight) watcher.observe(element);
                else if (first) element.setAttribute("data-nt-in", "done");
                else arrive(element);
            }
        };
        take(true);
        root.setAttribute("data-nt-io", "");

        // Pages change without a reload: new sections are taken as they appear.
        let frame = 0;
        const pages = new MutationObserver(() => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                take(false);
            });
        });
        pages.observe(document.body, { childList: true, subtree: true });

        return () => {
            cancelAnimationFrame(frame);
            watcher.disconnect();
            pages.disconnect();
            root.removeAttribute("data-nt-io");
        };
    }, []);

    return null;
}
