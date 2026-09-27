"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, LocateFixed, X } from "lucide-react";
import { YAOUNDE_NEIGHBORHOODS } from "@/lib/tags";
import { useLocale } from "../site/LocaleProvider";

export default function AreaPicker({
    open,
    current,
    onClose,
    onPick,
    onLocate,
}: {
    open: boolean;
    current: string | null;
    onClose: () => void;
    onPick: (name: string | null) => void;
    onLocate: () => void;
}) {
    const { t } = useLocale();

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 md:items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        role="dialog"
                        aria-modal
                        aria-label={t.location.chooseArea}
                        className="nt-safe-bottom w-full max-w-lg rounded-t-[1.75rem] bg-bg p-5 shadow-float md:rounded-[1.75rem]"
                        initial={{ y: 60, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 60, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 38 }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-extrabold">{t.location.chooseArea}</h2>
                            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-surface-2" aria-label={t.common.close}>
                                <X size={18} />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                onLocate();
                                onClose();
                            }}
                            className="nt-btn nt-btn-primary mb-4 w-full"
                        >
                            <LocateFixed size={18} />
                            {t.location.useMine}
                        </button>

                        <div className="grid max-h-[45vh] grid-cols-2 gap-2 overflow-y-auto pb-1">
                            <button
                                type="button"
                                onClick={() => {
                                    onPick(null);
                                    onClose();
                                }}
                                className="nt-chip justify-between"
                                aria-pressed={current === null}
                            >
                                {t.filters.anyNeighborhood}
                                {current === null && <Check size={15} />}
                            </button>
                            {YAOUNDE_NEIGHBORHOODS.map((area) => (
                                <button
                                    key={area.name}
                                    type="button"
                                    onClick={() => {
                                        onPick(area.name);
                                        onClose();
                                    }}
                                    className="nt-chip justify-between"
                                    aria-pressed={current === area.name}
                                >
                                    {area.name}
                                    {current === area.name && <Check size={15} />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
