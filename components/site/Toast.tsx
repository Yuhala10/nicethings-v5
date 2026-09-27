"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useLocale } from "./LocaleProvider";

// One small confirmation at a time ("Lien copié ✓"), announced to screen
// readers, sitting above the tab bar.

const ToastContext = createContext<(message: string) => void>(() => {});

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [message, setMessage] = useState<string | null>(null);
    const timer = useRef<number | undefined>(undefined);

    const show = useCallback((next: string) => {
        window.clearTimeout(timer.current);
        setMessage(next);
        timer.current = window.setTimeout(() => setMessage(null), 2400);
    }, []);

    return (
        <ToastContext.Provider value={show}>
            {children}
            <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex justify-center px-4 md:bottom-8">
                <AnimatePresence>
                    {message && (
                        <motion.div
                            key={message}
                            initial={{ opacity: 0, y: 12, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ type: "spring", stiffness: 500, damping: 34 }}
                            className="rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-white shadow-float"
                        >
                            {message}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

// Thin banner while the phone has no connection. Pages already loaded keep
// working; this just explains why new ones may not open.
export function OfflineBanner() {
    const { t } = useLocale();
    const [offline, setOffline] = useState(false);

    useEffect(() => {
        const update = () => setOffline(!navigator.onLine);
        update();
        window.addEventListener("online", update);
        window.addEventListener("offline", update);
        return () => {
            window.removeEventListener("online", update);
            window.removeEventListener("offline", update);
        };
    }, []);

    return (
        <AnimatePresence>
            {offline && (
                <motion.div
                    role="status"
                    initial={{ y: -40 }}
                    animate={{ y: 0 }}
                    exit={{ y: -40 }}
                    className="fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-2 bg-ink px-4 pt-[max(env(safe-area-inset-top),0.4rem)] pb-1.5 text-xs font-semibold text-white"
                >
                    <WifiOff size={14} />
                    {t.common.offline}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
