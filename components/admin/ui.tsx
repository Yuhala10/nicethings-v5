"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Inbox, XCircle, type LucideIcon } from "lucide-react";
import { adminGet } from "@/lib/admin-client";
import { adminLang, useTr } from "./i18n";

// Small shared pieces for the team console.

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
    return (
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
                <h1 className="text-[1.7rem] leading-tight font-extrabold md:text-3xl">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
    );
}

export function Stat({
    icon: Icon,
    label,
    value,
    hint,
    tone = "neutral",
    href,
}: {
    icon: LucideIcon;
    label: string;
    value: ReactNode;
    hint?: string;
    tone?: "neutral" | "brand" | "good" | "warn";
    href?: string;
}) {
    const tones = {
        neutral: "bg-soft text-ink",
        brand: "bg-brand-50 text-brand-600",
        good: "bg-green-50 text-good",
        warn: "bg-amber-50 text-warn",
    } as const;
    const body = (
        <>
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>
                <Icon size={19} />
            </span>
            <p className="mt-3 font-display text-[1.75rem] leading-none font-extrabold">{value}</p>
            <p className="mt-1 text-sm font-semibold text-text-2">{label}</p>
            {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
        </>
    );
    return href ? (
        <a href={href} className="a-card block p-4 transition hover:border-line-strong hover:shadow-sm">
            {body}
        </a>
    ) : (
        <div className="a-card p-4">{body}</div>
    );
}

export function StatusBadge({ status }: { status: string }) {
    const tr = useTr();
    const map: Record<string, [string, string]> = {
        APPROVED: [tr("Publié", "Published"), "bg-green-50 text-good"],
        DRAFT: [tr("Brouillon", "Draft"), "bg-soft text-text-2"],
        PENDING: [tr("En attente", "Pending"), "bg-amber-50 text-warn"],
        REJECTED: [tr("Refusé", "Rejected"), "bg-red-50 text-bad"],
        CLOSED: [tr("Fermé", "Closed"), "bg-red-50 text-bad"],
        RESOLVED: [tr("Résolu", "Resolved"), "bg-green-50 text-good"],
    };
    const [label, style] = map[status] ?? [status, "bg-soft text-text-2"];
    return <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[0.72rem] font-bold ${style}`}>{label}</span>;
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
    return (
        <div className="a-card flex flex-col items-center px-6 py-14 text-center">
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-soft text-muted">
                <Inbox size={22} />
            </span>
            <p className="font-bold">{title}</p>
            {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export function Skeleton({ className = "" }: { className?: string }) {
    return <div className={`a-skeleton ${className}`} aria-hidden />;
}

export function Bar({ value, total, tone = "#ff6a2b" }: { value: number; total: number; tone?: string }) {
    const percent = total ? Math.round((value / total) * 100) : 0;
    return (
        <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-soft">
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${percent}%`, background: tone }} />
            </div>
            <span className="w-9 text-right text-xs font-bold tabular-nums text-text-2">{percent}%</span>
        </div>
    );
}

export function timeAgo(iso: string) {
    const en = adminLang() === "en";
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return en ? "just now" : "à l'instant";
    if (minutes < 60) return en ? `${minutes} min ago` : `il y a ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return en ? `${hours} h ago` : `il y a ${hours} h`;
    const days = Math.round(hours / 24);
    return days < 30 ? (en ? `${days} d ago` : `il y a ${days} j`) : new Date(iso).toLocaleDateString(en ? "en-GB" : "fr-FR");
}

// Numbers in the console's language (1 204 / 1,204).
export function formatCount(value: number) {
    return value.toLocaleString(adminLang() === "en" ? "en-GB" : "fr-FR");
}

// Loads an admin endpoint; `reload` refetches without flashing.
export function useAdminData<T>(path: string | null) {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(Boolean(path));
    const latest = useRef(path);
    useEffect(() => {
        latest.current = path;
    });

    const load = useCallback(async () => {
        if (!path) return;
        setLoading(true);
        try {
            const result = await adminGet<T>(path);
            if (latest.current === path) {
                setData(result);
                setError(null);
            }
        } catch (caught) {
            if (latest.current === path) setError((caught as Error).message);
        } finally {
            if (latest.current === path) setLoading(false);
        }
    }, [path]);

    useEffect(() => {
        void load();
    }, [load]);

    return { data, error, loading, reload: load };
}

// ---- Toasts ------------------------------------------------------------------
type Toast = { id: number; text: string; error?: boolean };
const ToastContext = createContext<(text: string, error?: boolean) => void>(() => {});
export const useAdminToast = () => useContext(ToastContext);

export function AdminToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const show = useCallback((text: string, error = false) => {
        const id = Date.now() + Math.random();
        setToasts((current) => [...current, { id, text, error }]);
        window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3200);
    }, []);
    return (
        <ToastContext.Provider value={show}>
            {children}
            <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-lg ${toast.error ? "bg-bad" : "bg-ink"}`}
                    >
                        {toast.error ? <XCircle size={16} /> : <CheckCircle2 size={16} className="text-green-400" />}
                        {toast.text}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
