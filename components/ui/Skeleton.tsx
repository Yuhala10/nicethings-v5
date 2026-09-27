type SkeletonProps = {
    width?: string | number;
    height?: string | number;
    radius?: string | number;
    className?: string;
};

export default function Skeleton({
    width = "100%",
    height = 20,
    radius = 12,
    className = "",
}: SkeletonProps) {
    return (
        <span
            aria-hidden="true"
            className={[
                "nt-skeleton",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
            style={{
                width,
                height,
                borderRadius: radius,
            }}
        />
    );
}