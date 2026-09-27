import {
    Star,
} from "lucide-react";

type SpotRatingProps = {
    rating?: number | null;
    reviewCount?: number | null;
    compact?: boolean;
};

export default function SpotRating({
    rating,
    reviewCount,
    compact = false,
}: SpotRatingProps) {
    const value =
        typeof rating === "number"
            ? Math.max(
                0,
                Math.min(5, rating)
            )
            : 0;

    return (
        <div
            className={[
                "nt-spot-rating",
                compact
                    ? "nt-spot-rating-compact"
                    : "",
            ]
                .filter(Boolean)
                .join(" ")}
            aria-label={
                value > 0
                    ? `Rated ${value.toFixed(
                        1
                    )} out of 5`
                    : "No ratings yet"
            }
        >
            <Star
                size={compact ? 13 : 16}
                fill="currentColor"
                strokeWidth={0}
            />

            <strong>
                {value > 0
                    ? value.toFixed(1)
                    : "New"}
            </strong>

            {typeof reviewCount ===
                "number" &&
                reviewCount > 0 && (
                    <span>
                        ({reviewCount})
                    </span>
                )}
        </div>
    );
}