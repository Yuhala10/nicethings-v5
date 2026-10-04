// The blue verified tick: a scalloped badge with a white check, the mark
// people already know from social networks. Shown next to places the
// NiceThings team has checked on site (admin "Vérifié" switch).

const VERIFIED_BLUE = "#0095f6";

// Scalloped outline: a circle with 10 soft bumps, computed once.
const BADGE_PATH = (() => {
    const points: string[] = [];
    const steps = 160;
    for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const radius = 10.4 + 1.25 * Math.cos(angle * 10);
        points.push(`${(12 + radius * Math.sin(angle)).toFixed(2)},${(12 - radius * Math.cos(angle)).toFixed(2)}`);
    }
    return `M${points.join("L")}Z`;
})();

export default function VerifiedTick({ size = 16, className = "", label }: { size?: number; className?: string; label?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={`inline-block shrink-0 ${className}`}
            role={label ? "img" : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
        >
            {label && <title>{label}</title>}
            <path d={BADGE_PATH} fill={VERIFIED_BLUE} />
            <path d="M7.6 12.3l3 3 5.8-6.2" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
