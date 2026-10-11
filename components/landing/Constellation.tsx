"use client";

import { useEffect, useRef } from "react";

// Every published place in Cameroon as a point of light. Points arrive
// pre-projected (0..1000 on both axes, row-major pairs); the canvas draws
// them with a soft glow and a slow twinkle, and labels the big cities.
//
// Thousands of points are costly to redraw, so the canvas only works while
// it is on screen, and at the pace a slow twinkle needs (about twelve
// pictures a second): a phone that is showing the top of the page, or any
// other part of it, spends nothing here.

type Label = { name: string; x: number; y: number; count: number };

const FRAME_MS = 80;

export default function Constellation({
    points,
    labels,
    className = "",
}: {
    points: number[];
    labels: Label[];
    className?: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const count = points.length / 2;
        let frame = 0;
        let width = 0;
        let height = 0;
        let visible = false;
        let last = -Infinity;

        // Stable pseudo-random phase per point, and where each one lands on
        // the canvas (worked out again only when the canvas changes size).
        const phases = new Float32Array(count);
        for (let i = 0; i < count; i++) phases[i] = ((i * 2654435761) % 1000) / 1000;
        const xs = new Float32Array(count);
        const ys = new Float32Array(count);
        let place = (px: number, py: number) => [px, py] as const;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            // Keep Cameroon's proportions (taller than wide) and centre it.
            const scale = Math.min(width / 700, height / 1000) * 0.94;
            const offsetX = (width - 700 * scale) / 2;
            const offsetY = (height - 1000 * scale) / 2;
            place = (px, py) => [offsetX + px * scale, offsetY + py * scale] as const;
            for (let i = 0; i < count; i++) [xs[i], ys[i]] = place(points[i * 2], points[i * 2 + 1]);
        };

        const paint = (time: number) => {
            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = "lighter";
            for (let i = 0; i < count; i++) {
                const phase = phases[i];
                const twinkle = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(time / 900 + phase * 12);
                ctx.fillStyle = `rgba(255, ${120 + Math.round(phase * 60)}, 60, ${0.22 * twinkle})`;
                ctx.beginPath();
                ctx.arc(xs[i], ys[i], 4.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = `rgba(255, 214, 170, ${0.85 * twinkle})`;
                ctx.fillRect(xs[i] - 0.9, ys[i] - 0.9, 1.8, 1.8);
            }
            ctx.globalCompositeOperation = "source-over";
            ctx.font = "700 12px system-ui, sans-serif";
            ctx.textBaseline = "middle";
            // On narrow screens the map sits behind the headline: no labels.
            for (const label of width >= 600 ? labels : []) {
                const [x, y] = place(label.x, label.y);
                ctx.fillStyle = "rgba(255,255,255,0.9)";
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "rgba(255,255,255,0.78)";
                ctx.fillText(label.name, x + 8, y);
            }
        };

        const tick = (time: number) => {
            if (!visible) return;
            if (time - last >= FRAME_MS) {
                last = time;
                paint(time);
            }
            if (!reduced) frame = requestAnimationFrame(tick);
        };
        const start = () => {
            cancelAnimationFrame(frame);
            last = -Infinity;
            frame = requestAnimationFrame(tick);
        };

        resize();
        const sizes = new ResizeObserver(() => {
            resize();
            if (visible) start();
        });
        sizes.observe(canvas);
        const sight = new IntersectionObserver(
            (entries) => {
                visible = entries.some((entry) => entry.isIntersecting);
                if (visible) start();
                else cancelAnimationFrame(frame);
            },
            { rootMargin: "120px 0px" }
        );
        sight.observe(canvas);
        return () => {
            cancelAnimationFrame(frame);
            sizes.disconnect();
            sight.disconnect();
        };
    }, [points, labels]);

    return <canvas ref={canvasRef} className={className} aria-hidden />;
}
