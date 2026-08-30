"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";

type SpotImageProps = {
    src?: string | null;
    alt: string;
    className?: string;
    priority?: boolean;
};

export default function SpotImage({
    src,
    alt,
    className = "",
    priority = false,
}: SpotImageProps) {
    if (!src) {
        return (
            <div
                className={`nt-spot-image nt-spot-image-empty ${className}`}
                aria-label={alt}
            >
                <ImageOff
                    size={28}
                    strokeWidth={1.5}
                />
            </div>
        );
    }

    return (
        <div
            className={`nt-spot-image ${className}`}
        >
            <Image
                src={src}
                alt={alt}
                fill
                priority={priority}
                sizes="(max-width: 650px) 100vw, (max-width: 1050px) 50vw, 33vw"
                className="nt-spot-image-img"
            />
        </div>
    );
}