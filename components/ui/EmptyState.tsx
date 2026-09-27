import Link from "next/link";

import {
    ArrowRight,
    SearchX,
} from "lucide-react";

type EmptyStateProps = {
    title: string;
    description?: string;
    actionLabel?: string;
    actionHref?: string;
    icon?: React.ReactNode;
};

export default function EmptyState({
    title,
    description,
    actionLabel,
    actionHref,
    icon,
}: EmptyStateProps) {
    return (
        <div className="nt-empty-state">
            <div className="nt-empty-icon">
                {icon ?? (
                    <SearchX
                        size={25}
                        strokeWidth={1.8}
                    />
                )}
            </div>

            <h3>{title}</h3>

            {description && (
                <p>{description}</p>
            )}

            {actionLabel &&
                actionHref && (
                    <Link
                        href={actionHref}
                        className="nt-button nt-button-dark nt-button-sm"
                    >
                        <span>
                            {actionLabel}
                        </span>

                        <ArrowRight
                            size={14}
                        />
                    </Link>
                )}
        </div>
    );
}