// Shaped like the search page. Only search streams: guides and collections
// render whole, so a missing one answers with a real 404.
export default function Loading() {
    return (
        <div className="mx-auto max-w-5xl px-4 pt-[max(env(safe-area-inset-top),1.25rem)] md:px-6 md:pt-10" aria-busy>
            <div className="nt-skeleton h-3 w-32 rounded" />
            <div className="nt-skeleton mt-3 h-10 w-3/4 max-w-md rounded-lg" />
            <div className="nt-skeleton mt-3 h-4 w-2/3 max-w-sm rounded" />
            <div className="nt-skeleton mt-7 h-14 w-full rounded-[1.1rem]" />
            <div className="mt-5 flex gap-2 overflow-hidden">
                {Array.from({ length: 5 }, (_, index) => (
                    <div key={index} className="nt-skeleton h-10 w-24 shrink-0 rounded-full" />
                ))}
            </div>
            <div className="nt-skeleton mt-10 h-6 w-44 rounded" />
            <div className="mt-4 flex gap-3 overflow-hidden">
                <div className="nt-skeleton aspect-[4/5] w-[68%] shrink-0 rounded-[1.1rem] sm:w-[40%] md:w-[23%]" />
                <div className="nt-skeleton aspect-[4/5] w-[68%] shrink-0 rounded-[1.1rem] sm:w-[40%] md:w-[23%]" />
            </div>
        </div>
    );
}
