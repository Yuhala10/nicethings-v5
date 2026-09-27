import { PlaceCardSkeleton } from "@/components/place/PlaceCard";

export default function Loading() {
    return (
        <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6 md:pt-10" aria-busy>
            <div className="nt-skeleton mb-4 h-4 w-32 rounded" />
            <div className="nt-skeleton h-10 w-3/4 max-w-md rounded-lg" />
            <div className="nt-skeleton mt-3 h-4 w-full max-w-xl rounded" />
            <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }, (_, index) => (
                    <li key={index}>
                        <PlaceCardSkeleton className="w-full" />
                    </li>
                ))}
            </ul>
        </div>
    );
}
