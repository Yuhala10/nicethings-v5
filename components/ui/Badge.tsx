import type {
    ReactNode,
} from "react";

type BadgeProps = {
    children: ReactNode;

    variant?:
    | "default"
    | "orange"
    | "success"
    | "danger"
    | "dark";

    dot?: boolean;
};

export default function Badge({
    children,
    variant = "default",
    dot = false,
}: BadgeProps) {
    return (
        <span
            className={[
                "nt-badge",
                `nt-badge-${variant}`,
            ].join(" ")}
        >
            {dot && (
                <span className="nt-badge-dot" />
            )}

            {children}
        </span>
    );
}