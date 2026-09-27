"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useDragControls, useMotionValue, type PanInfo } from "framer-motion";

// Yango-style sheet over the map. Three snap points; a flick picks the next
// one in the flick's direction, a slow drag settles on the nearest. On wide
// screens it becomes a fixed side panel.

export type Snap = "peek" | "half" | "full";

type Props = {
    snap: Snap;
    onSnapChange: (snap: Snap) => void;
    header: ReactNode; // always visible, draggable
    children: ReactNode; // scrolls when the sheet is full
    peekHeight?: number;
    bottomInset?: number; // space taken by the tab bar
    onScroll?: (scrollTop: number) => void; // drives the collapsing header
};

function useIsDesktop() {
    const [desktop, setDesktop] = useState(false);
    useEffect(() => {
        const query = window.matchMedia("(min-width: 768px)");
        const update = () => setDesktop(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);
    return desktop;
}

export default function BottomSheet({
    snap,
    onSnapChange,
    header,
    children,
    peekHeight = 168,
    bottomInset = 84,
    onScroll,
}: Props) {
    const desktop = useIsDesktop();
    const y = useMotionValue(0);
    const controls = useDragControls();
    const [viewport, setViewport] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const update = () => setViewport(window.innerHeight);
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    const positions = useCallback(
        (height: number): Record<Snap, number> => ({
            full: 72,
            half: Math.round(height * 0.5),
            peek: height - peekHeight - bottomInset,
        }),
        [peekHeight, bottomInset]
    );

    // Follow the requested snap with a spring.
    useEffect(() => {
        if (!viewport || desktop) return;
        const target = positions(viewport)[snap];
        const controlsAnimation = animate(y, target, { type: "spring", stiffness: 420, damping: 42, mass: 0.9 });
        if (snap !== "full" && scrollRef.current) {
            scrollRef.current.scrollTop = 0;
            onScroll?.(0);
        }
        return () => controlsAnimation.stop();
    }, [snap, viewport, desktop, positions, y]);

    const onDragEnd = (_: unknown, info: PanInfo) => {
        const points = positions(viewport);
        const order: Snap[] = ["full", "half", "peek"];
        const current = y.get();

        let next: Snap;
        if (Math.abs(info.velocity.y) > 500) {
            const index = order.indexOf(snap);
            next = info.velocity.y > 0 ? order[Math.min(2, index + 1)] : order[Math.max(0, index - 1)];
            // A strong flick from full straight past half is intentional.
            if (info.velocity.y > 1800) next = "peek";
            if (info.velocity.y < -1800) next = "full";
        } else {
            next = order.reduce((best, key) =>
                Math.abs(points[key] - current) < Math.abs(points[best] - current) ? key : best
            );
        }

        if (next === snap) {
            animate(y, points[next], { type: "spring", stiffness: 420, damping: 42 });
        } else {
            if (navigator.vibrate) navigator.vibrate(6);
            onSnapChange(next);
        }
    };

    if (desktop) {
        return (
            <aside className="absolute inset-y-0 left-0 z-20 flex w-[420px] flex-col border-r border-line bg-bg shadow-float">
                <div className="shrink-0">{header}</div>
                <div
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                    onScroll={(event) => onScroll?.(event.currentTarget.scrollTop)}
                >
                    {children}
                </div>
            </aside>
        );
    }

    const points = viewport ? positions(viewport) : null;

    return (
        <motion.section
            className="fixed inset-x-0 top-0 z-30 flex flex-col rounded-t-[2rem] border-t border-line bg-bg shadow-float will-change-transform"
            style={{ y, height: viewport ? viewport - 72 : "100dvh", visibility: viewport ? "visible" : "hidden" }}
            drag="y"
            dragListener={false}
            dragControls={controls}
            dragConstraints={points ? { top: points.full, bottom: points.peek } : undefined}
            dragElastic={0.08}
            dragMomentum={false}
            onDragEnd={onDragEnd}
        >
            <div
                className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
                onPointerDown={(event) => {
                    // Horizontal chip rows and inputs keep their own gestures.
                    if ((event.target as HTMLElement).closest("[data-no-drag], input, textarea")) return;
                    controls.start(event);
                }}
            >
                <div className="mx-auto mt-2.5 mb-1 h-1.5 w-11 rounded-full bg-line-strong" />
                {header}
            </div>
            <div
                ref={scrollRef}
                onScroll={(event) => onScroll?.(event.currentTarget.scrollTop)}
                className={`min-h-0 flex-1 overscroll-contain ${snap === "full" ? "overflow-y-auto" : "touch-none overflow-hidden"}`}
                style={{ paddingBottom: bottomInset + 24 }}
                onPointerDown={(event) => {
                    // Below full height, swiping the list moves the sheet.
                    if (snap === "full" || event.pointerType === "mouse") return;
                    if ((event.target as HTMLElement).closest("[data-no-drag]")) return;
                    controls.start(event);
                }}
            >
                {children}
            </div>
        </motion.section>
    );
}
