// The verified tick: a scalloped badge with a white check, the mark people
// already know from social networks. Blue next to places the NiceThings
// team has checked (admin "Vérifié" switch) and next to verified profiles;
// gold leaf for the founder.

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

export default function VerifiedTick({ size = 16, className = "", label, tone = "blue" }: { size?: number; className?: string; label?: string; tone?: "blue" | "gold" }) {
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
            {tone === "gold" && (
                <defs>
                    <linearGradient id="nt-gold-tick" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#f6dd86" />
                        <stop offset="0.5" stopColor="#c99a35" />
                        <stop offset="1" stopColor="#f3d77e" />
                    </linearGradient>
                </defs>
            )}
            <path d={BADGE_PATH} fill={tone === "gold" ? "url(#nt-gold-tick)" : VERIFIED_BLUE} />
            <path d="M7.6 12.3l3 3 5.8-6.2" fill="none" stroke={tone === "gold" ? "#3b2a07" : "#fff"} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
