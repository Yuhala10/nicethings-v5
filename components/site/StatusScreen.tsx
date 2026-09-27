"use client";

import Link from "next/link";
import { Compass, RotateCw, type LucideIcon } from "lucide-react";
import { paths } from "@/lib/places/paths";
import { useLocale } from "./LocaleProvider";

// Shared look for "not found" and "something broke": say what happened in
// human words, then offer the way forward.
export default function StatusScreen({
    icon: Icon,
    title,
    body,
    onRetry,
}: {
    icon: LucideIcon;
    title: string;
    body: string;
    onRetry?: () => void;
}) {
    const { locale, t } = useLocale();
    return (
        <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-700/20">
                <Icon size={28} />
            </div>
            <h1 className="mb-2 text-2xl font-extrabold">{title}</h1>
            <p className="mb-7 text-text-2">{body}</p>
            <div className="flex flex-wrap justify-center gap-2">
                {onRetry && (
                    <button type="button" onClick={onRetry} className="nt-btn nt-btn-dark">
                        <RotateCw size={17} />
                        {t.common.retry}
                    </button>
                )}
                <Link href={paths.explore(locale)} className={`nt-btn ${onRetry ? "nt-btn-soft" : "nt-btn-primary"}`}>
                    <Compass size={18} />
                    {t.common.home}
                </Link>
            </div>
        </div>
    );
}
