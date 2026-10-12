import VerifiedTick from "@/components/place/VerifiedTick";
import { qrPath } from "@/lib/qr";

// A poster to print (A5 or A4, same proportions) and put where people are:
// the counter of a listed place, a notice board. Its QR code opens the page
// it advertises with "?ref=affiche", so every scan is counted as coming from
// a poster. All its sizes follow its own width (cqw), so it looks the same
// on a phone screen and on paper.

type Props = {
    link: string; // where the code leads
    eyebrow: string; // the small line above the name
    title: string; // the place's name, or the question
    accent?: string; // second line of the title, in the brand colour
    verified?: string | null; // the words beside the tick, when the place has one
    scan: string; // what scanning gives
    tagline: string;
    free: string;
};

export default function Poster({ link, eyebrow, title, accent, verified, scan, tagline, free }: Props) {
    const code = qrPath(link);
    const long = title.length > 26;

    return (
        <div className="nt-print flex aspect-[148/210] w-full flex-col overflow-hidden rounded-[1.25rem] bg-[#faf7f2] text-[#15110e] shadow-card [container-type:inline-size]">
            <div className="flex items-center justify-between px-[7cqw] pt-[6.5cqw]">
                <p className="text-[5.4cqw] leading-none font-bold tracking-[-0.03em]">
                    Nice<span className="text-brand-600">Things</span>
                </p>
                <p className="text-[2.5cqw] font-semibold tracking-[0.16em] uppercase opacity-60">{tagline}</p>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center px-[7cqw] text-center">
                <p className="text-[3.1cqw] font-semibold tracking-[0.14em] uppercase opacity-60">{eyebrow}</p>
                <p className={`nt-serif mt-[2cqw] leading-[0.98] ${long ? "text-[9cqw]" : "text-[12.5cqw]"}`}>
                    {title}
                    {accent && <em className="block text-brand-600">{accent}</em>}
                </p>
                {verified && (
                    <p className="mt-[2.6cqw] flex items-center gap-[1.4cqw] text-[3.1cqw] font-semibold">
                        <VerifiedTick size={20} className="!h-[4.4cqw] !w-[4.4cqw]" />
                        {verified}
                    </p>
                )}

                <div className="mt-[5cqw] w-[50cqw] rounded-[4cqw] bg-white p-[2.6cqw] shadow-[0_1.5cqw_4cqw_rgba(21,17,14,0.12)]">
                    <svg viewBox={`0 0 ${code.size} ${code.size}`} className="block h-auto w-full" shapeRendering="crispEdges" role="img" aria-label={link}>
                        <rect width={code.size} height={code.size} fill="#fff" />
                        <path d={code.path} fill="#000" />
                    </svg>
                </div>
                <p className="mt-[4cqw] max-w-[66cqw] text-[3.5cqw] leading-snug font-medium">{scan}</p>
            </div>

            <div className="flex items-center justify-between bg-[#15110e] px-[7cqw] py-[4.6cqw] text-white">
                <p className="text-[4.6cqw] leading-none font-bold tracking-[-0.02em]">nicethings.site</p>
                <p className="text-[2.7cqw] font-semibold opacity-75">{free}</p>
            </div>
        </div>
    );
}
