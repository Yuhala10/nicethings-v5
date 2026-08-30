"use client";

import {
    CheckCircle2,
    Info,
    TriangleAlert,
    X,
} from "lucide-react";

import {
    useEffect,
} from "react";

type ToastProps = {
    message: string;

    variant?:
    | "success"
    | "error"
    | "info";

    onClose?: () => void;

    duration?: number;
};

export default function Toast({
    message,
    variant = "info",
    onClose,
    duration = 4500,
}: ToastProps) {
    const Icon =
        variant === "success"
            ? CheckCircle2
            : variant === "error"
                ? TriangleAlert
                : Info;

    useEffect(() => {
        if (!onClose) {
            return;
        }

        const timer =
            window.setTimeout(
                onClose,
                duration
            );

        return () =>
            window.clearTimeout(
                timer
            );
    }, [
        onClose,
        duration,
    ]);

    return (
        <div
            className={[
                "nt-toast",
                `nt-toast-${variant}`,
            ].join(" ")}
            role="status"
            aria-live="polite"
        >
            <Icon
                size={18}
                strokeWidth={2.2}
            />

            <span>
                {message}
            </span>

            {onClose && (
                <button
                    type="button"
                    className="nt-toast-close"
                    onClick={onClose}
                    aria-label="Close notification"
                >
                    <X size={15} />
                </button>
            )}
        </div>
    );
}