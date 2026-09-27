"use client";

import { useEffect, useRef } from "react";

// Every published place in Cameroon as a point of light. Points arrive
// pre-projected (0..1000 on both axes, row-major pairs); the canvas draws
// them with a soft glow and a slow twinkle, and labels the big cities.

type Label = { name: string; x: number; y: number; count: number };

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
        let frame = 0;
        let width = 0;
        let height = 0;

        // Stable pseudo-random phase per point.
        const phases = new Float32Array(points.length / 2);
        for (let i = 0; i < phases.length; i++) phases[i] = ((i * 2654435761) % 1000) / 1000;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const project = (px: number, py: number) => {
            // Keep Cameroon's proportions (taller than wide) and centre it.
            const scale = Math.min(width / 700, height / 1000) * 0.94;
            const offsetX = (width - 700 * scale) / 2;
            const offsetY = (height - 1000 * scale) / 2;
            return [offsetX + px * scale, offsetY + py * scale] as const;
        };

        const draw = (time: number) => {
            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = "lighter";
            for (let i = 0; i < points.length; i += 2) {
                const [x, y] = project(points[i], points[i + 1]);
                const phase = phases[i / 2];
                const twinkle = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(time / 900 + phase * 12);
                ctx.fillStyle = `rgba(255, ${120 + Math.round(phase * 60)}, 60, ${0.22 * twinkle})`;
                ctx.beginPath();
                ctx.arc(x, y, 4.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = `rgba(255, 214, 170, ${0.85 * twinkle})`;
                ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
            }
            ctx.globalCompositeOperation = "source-over";
            ctx.font = "700 12px system-ui, sans-serif";
            ctx.textBaseline = "middle";
            // On narrow screens the map sits behind the headline: no labels.
            for (const label of width >= 600 ? labels : []) {
                const [x, y] = project(label.x, label.y);
                ctx.fillStyle = "rgba(255,255,255,0.9)";
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "rgba(255,255,255,0.78)";
                ctx.fillText(label.name, x + 8, y);
            }
            if (!reduced) frame = requestAnimationFrame(draw);
        };

        resize();
        frame = requestAnimationFrame(draw);
        const observer = new ResizeObserver(() => {
            resize();
            if (reduced) draw(0);
        });
        observer.observe(canvas);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, [points, labels]);

    return <canvas ref={canvasRef} className={className} aria-hidden />;
}
