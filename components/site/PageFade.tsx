"use client";

import { usePathname } from "next/navigation";

// The page arriving fades in (site.css, "From one page to another"). Keyed
// by the address, so it also fades from one place to another place, one
// profile to another: those share a template, which alone would not change.
export default function PageFade({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    return (
        <div key={pathname} className="nt-page">
            {children}
        </div>
    );
}
