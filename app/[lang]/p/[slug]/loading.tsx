// Shaped like the place page, so the layout doesn't jump when it arrives.
export default function Loading() {
    return (
        <div className="mx-auto max-w-3xl px-4 pt-[max(env(safe-area-inset-top),0.75rem)] md:px-6 md:pt-8" aria-busy aria-live="polite">
            <div className="flex justify-between">
                <div className="nt-skeleton h-10 w-10 rounded-full" />
                <div className="flex gap-2">
                    <div className="nt-skeleton h-10 w-10 rounded-full" />
                    <div className="nt-skeleton h-10 w-10 rounded-full" />
                </div>
            </div>
            <div className="nt-skeleton mt-8 h-3 w-36 rounded" />
            <div className="nt-skeleton mt-4 h-11 w-3/4 rounded-lg" />
            <div className="nt-skeleton mt-4 h-4 w-2/3 rounded" />
            <div className="nt-skeleton mt-7 aspect-[2/1] w-full rounded-[1.25rem] md:aspect-[5/2]" />
            <div className="mt-6 flex gap-2.5">
                {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="nt-skeleton h-[3.4rem] flex-1 rounded-[1rem]" />
                ))}
            </div>
        </div>
    );
}
