"use client";

import { useEffect, useRef, useState } from "react";

// The index of a long page, which follows the reader: it stays under the
// top of the screen, lights up the part being read and keeps that name in
// view; a tap on a name goes there. The page organises itself around
// whoever is scrolling it.
export default function SectionIndex({ items, label }: { items: { id: string; label: string }[]; label: string }) {
    const [active, setActive] = useState<string | null>(null);
    const bar = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const sections = items.map((item) => document.getElementById(item.id)).filter((element): element is HTMLElement => Boolean(element));
        if (!sections.length || typeof IntersectionObserver === "undefined") return;
        const inBand = new Set<string>();
        // "Being read" means crossing a band a third of the way down the screen.
        const watcher = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) inBand.add(entry.target.id);
                    else inBand.delete(entry.target.id);
                }
                const current = sections.find((section) => inBand.has(section.id));
                if (current) setActive(current.id);
            },
            { rootMargin: "-30% 0px -60% 0px" }
        );
        sections.forEach((section) => watcher.observe(section));
        return () => watcher.disconnect();
    }, [items]);

    // The lit name stays in sight when the bar is wider than the screen.
    useEffect(() => {
        const holder = bar.current;
        const chip = holder?.querySelector<HTMLElement>('[aria-current="true"]');
        if (!holder || !chip) return;
        holder.scrollTo({ left: chip.offsetLeft - (holder.clientWidth - chip.offsetWidth) / 2, behavior: "smooth" });
    }, [active]);

    return (
        <nav aria-label={label} className="nt-glass-strong sticky top-0 z-30 mt-10 border-y border-line md:top-16 md:mt-16">
            <div ref={bar} className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] md:px-5 [&::-webkit-scrollbar]:hidden">
                {items.map((item) => (
                    <a
                        key={item.id}
                        href={`#${item.id}`}
                        aria-current={active === item.id ? "true" : undefined}
                        className={`inline-flex h-10 shrink-0 items-center rounded-full px-4 text-[0.875rem] font-semibold transition-colors duration-200 ${
                            active === item.id ? "bg-contrast text-on-contrast" : "text-text-2 hover:bg-surface-2"
                        }`}
                    >
                        {item.label}
                    </a>
                ))}
            </div>
        </nav>
    );
}
