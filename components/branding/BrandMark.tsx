import Image from "next/image";

type BrandMarkProps = {
    size?: number;
    className?: string;
};

export default function BrandMark({
    size = 42,
    className = "",
}: BrandMarkProps) {
    return (
        <div
            className={`nt-brand-mark ${className}`}
            style={{
                width: size,
                height: size,
            }}
        >
            <Image
                src="/brand/logo.png"
                alt="NiceThings"
                width={size}
                height={size}
                priority
            />
        </div>
    );
}