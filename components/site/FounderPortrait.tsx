import Image from "next/image";
import { FOUNDER } from "@/lib/founder";

// The founder's face in a small round frame (bylines, the home page).
export default function FounderPortrait({ size, className = "" }: { size: number; className?: string }) {
    return (
        <Image
            src={FOUNDER.avatar}
            alt={FOUNDER.name}
            width={size}
            height={size}
            className={`shrink-0 rounded-full bg-surface-3 object-cover ${className}`}
        />
    );
}
