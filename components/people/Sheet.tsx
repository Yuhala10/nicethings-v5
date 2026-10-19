"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useId } from "react";

// A sheet that rises from the bottom of a phone (a card in the middle of a
// computer screen). The page behind stays still while it is open.
export default function Sheet({
    open,
    onClose,
    title,
    closeLabel,
    children,
    wide = false,
    dark = false,
}: {
    open: boolean;
    onClose: () => void;
    title?: string;
    closeLabel: string;
    children: React.ReactNode;
    wide?: boolean;
    dark?: boolean;
}) {
    const id = useId();
    useEffect(() => {
        if (!open) return;
        const root = document.documentElement;
        const before = root.style.overflow;
        root.style.overflow = "hidden";
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => {
            root.style.overflow = before;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 md:items-center md:p-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        role="dialog"
                        aria-modal
                        aria-labelledby={title ? id : undefined}
                        className={`nt-safe-bottom flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] shadow-float md:rounded-[1.75rem] ${wide ? "md:max-w-xl" : "md:max-w-md"} ${dark ? "bg-[#15110e] text-white" : "bg-bg text-text"}`}
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 38 }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex shrink-0 items-center gap-3 px-5 pt-3 pb-2">
                            <span className={`absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full md:hidden ${dark ? "bg-white/20" : "bg-line-strong"}`} aria-hidden />
                            {title ? (
                                <h2 id={id} className="min-w-0 flex-1 truncate pt-2 text-[1.125rem] font-bold">
                                    {title}
                                </h2>
                            ) : (
                                <span className="flex-1" />
                            )}
                            <button type="button" onClick={onClose} aria-label={closeLabel} className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full ${dark ? "bg-white/10" : "bg-surface-2"}`}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
