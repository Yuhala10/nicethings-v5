"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Flag, X } from "lucide-react";
import { useLocale } from "../site/LocaleProvider";

type Reason = "closed" | "price" | "hours" | "location" | "other";

// "Something's wrong here" — the fastest way for the city to correct us.
export default function ReportButton({
    slug,
    label,
    initialReason = "other",
    className = "",
}: {
    slug: string;
    label?: string;
    initialReason?: Reason;
    className?: string;
}) {
    const { t } = useLocale();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState<Reason>(initialReason);
    const [details, setDetails] = useState("");
    const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

    const close = () => {
        setOpen(false);
        if (state === "sent") {
            setState("idle");
            setDetails("");
        }
    };

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    const send = async (event: React.FormEvent) => {
        event.preventDefault();
        setState("sending");
        try {
            const response = await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slug, reason, details }),
            });
            setState(response.ok ? "sent" : "failed");
        } catch {
            setState("failed");
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    setReason(initialReason);
                    setOpen(true);
                }}
                className={className || "inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text"}
            >
                <Flag size={15} />
                {label ?? t.spot.reportProblem}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 md:items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={close}
                    >
                        <motion.div
                            role="dialog"
                            aria-modal
                            aria-labelledby="report-title"
                            className="nt-safe-bottom w-full max-w-md rounded-t-[1.75rem] bg-bg p-5 shadow-float md:rounded-[1.75rem]"
                            initial={{ y: 60, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 60, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 420, damping: 38 }}
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <h2 id="report-title" className="text-lg font-extrabold">
                                    {t.report.title}
                                </h2>
                                <button
                                    type="button"
                                    onClick={close}
                                    className="grid h-9 w-9 place-items-center rounded-full bg-surface-2"
                                    aria-label={t.common.close}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {state === "sent" ? (
                                <div className="py-6 text-center">
                                    <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-open/15 text-open">
                                        <Check size={24} />
                                    </div>
                                    <p className="mb-5 font-semibold">{t.report.thanks}</p>
                                    <button type="button" onClick={close} className="nt-btn nt-btn-dark w-full">
                                        {t.common.close}
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={send}>
                                    <fieldset className="mb-4 flex flex-col gap-2">
                                        <legend className="sr-only">{t.report.title}</legend>
                                        {(Object.keys(t.report.reasons) as Reason[]).map((key) => (
                                            <label
                                                key={key}
                                                className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${reason === key ? "border-brand-500 bg-brand-50 dark:bg-brand-700/15" : "border-line"}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="reason"
                                                    value={key}
                                                    checked={reason === key}
                                                    onChange={() => setReason(key)}
                                                    className="accent-brand-500"
                                                />
                                                {t.report.reasons[key]}
                                            </label>
                                        ))}
                                    </fieldset>
                                    <label className="mb-1.5 block text-sm font-semibold" htmlFor="report-details">
                                        {t.report.details}
                                    </label>
                                    <textarea
                                        id="report-details"
                                        value={details}
                                        onChange={(event) => setDetails(event.target.value)}
                                        maxLength={1000}
                                        className="nt-input mb-4"
                                    />
                                    {state === "failed" && (
                                        <p role="alert" className="mb-3 text-sm font-semibold text-closed">
                                            {t.common.error}
                                        </p>
                                    )}
                                    <button type="submit" disabled={state === "sending"} className="nt-btn nt-btn-primary w-full disabled:opacity-60">
                                        {state === "sending" ? t.common.loading : t.report.send}
                                    </button>
                                </form>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
