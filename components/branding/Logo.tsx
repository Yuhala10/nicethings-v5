import Link from "next/link";
import BrandMark from "./BrandMark";

type LogoProps = {
    href?: string;
    compact?: boolean;
    light?: boolean;
};

export default function Logo({
    href = "/",
    compact = false,
    light = false,
}: LogoProps) {
    return (
        <Link
            href={href}
            className={[
                "nt-logo",
                compact
                    ? "nt-logo-compact"
                    : "",
                light
                    ? "nt-logo-light"
                    : "",
            ]
                .filter(Boolean)
                .join(" ")}
            aria-label="NiceThings home"
        >
            <BrandMark
                size={compact ? 35 : 40}
            />

            <span className="nt-logo-wordmark">
                <span>Nice</span>
                <strong>Things</strong>
            </span>
        </Link>
    );
}