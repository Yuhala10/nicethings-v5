"use client";

import type {
    ButtonHTMLAttributes,
    ReactNode,
} from "react";

type IconButtonProps =
    ButtonHTMLAttributes<HTMLButtonElement> & {
        children: ReactNode;
        label: string;

        variant?:
        | "light"
        | "dark"
        | "orange";

        size?:
        | "sm"
        | "md"
        | "lg";
    };

export default function IconButton({
    children,
    label,
    variant = "light",
    size = "md",
    className = "",
    ...props
}: IconButtonProps) {
    return (
        <button
            {...props}
            type={
                props.type ?? "button"
            }
            aria-label={label}
            title={label}
            className={[
                "nt-icon-button",
                `nt-icon-button-${variant}`,
                `nt-icon-button-${size}`,
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            {children}
        </button>
    );
}