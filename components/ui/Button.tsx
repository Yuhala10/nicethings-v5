"use client";

import type {
    ButtonHTMLAttributes,
    ReactNode,
} from "react";

import {
    Loader2,
} from "lucide-react";

type ButtonProps =
    ButtonHTMLAttributes<HTMLButtonElement> & {
        children: ReactNode;
        variant?:
        | "dark"
        | "orange"
        | "light"
        | "ghost"
        | "danger";
        size?:
        | "sm"
        | "md"
        | "lg";
        loading?: boolean;
        fullWidth?: boolean;
        icon?: ReactNode;
    };

export default function Button({
    children,
    variant = "dark",
    size = "md",
    loading = false,
    fullWidth = false,
    icon,
    disabled,
    className = "",
    ...props
}: ButtonProps) {
    return (
        <button
            {...props}
            disabled={
                disabled || loading
            }
            className={[
                "nt-button",
                `nt-button-${variant}`,
                `nt-button-${size}`,
                fullWidth
                    ? "nt-button-full"
                    : "",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            {loading ? (
                <Loader2
                    size={16}
                    className="nt-spin"
                />
            ) : (
                icon
            )}

            <span>
                {children}
            </span>
        </button>
    );
}