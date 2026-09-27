// Shaped like the place page, so the layout doesn't jump when it arrives.
export default function Loading() {
    return (
        <div className="mx-auto max-w-3xl md:px-6 md:pt-6" aria-busy aria-live="polite">
            <div className="nt-skeleton h-[15rem] md:h-[18rem] md:rounded-[1.5rem]" />
            <div className="px-4 md:px-0">
                <div className="nt-skeleton mt-5 h-4 w-40 rounded" />
                <div className="nt-skeleton mt-3 h-8 w-3/4 rounded-lg" />
                <div className="nt-skeleton mt-2 h-4 w-1/2 rounded" />
                <div className="nt-skeleton mt-6 h-13 w-full rounded-2xl" />
                <div className="mt-2.5 flex gap-2">
                    <div className="nt-skeleton h-12 flex-1 rounded-2xl" />
                    <div className="nt-skeleton h-12 flex-1 rounded-2xl" />
                </div>
            </div>
        </div>
    );
}
