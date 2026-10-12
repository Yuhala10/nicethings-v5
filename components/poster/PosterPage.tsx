import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PrintButton from "./PrintButton";

// The screen around a poster: the poster itself, a button to print it and
// three lines on how to use it. Only the poster goes to the printer.
export default function PosterPage({ children, title, lead, print, tips, back }: { children: React.ReactNode; title: string; lead: string; print: string; tips: readonly string[]; back?: { href: string; label: string } }) {
    return (
        <div className="mx-auto grid max-w-5xl gap-10 px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-24 md:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] md:items-start md:gap-14 md:px-6 md:pt-14 print:block print:max-w-none print:p-0">
            <div>{children}</div>
            <div className="print:hidden">
                {back && (
                    <Link href={back.href} className="nt-tap inline-flex items-center gap-1.5 text-[0.875rem] font-semibold text-muted hover:text-text">
                        <ArrowLeft size={15} />
                        {back.label}
                    </Link>
                )}
                <h1 className="nt-serif mt-3 text-[2.25rem] leading-[1.05] md:text-[2.75rem]">{title}</h1>
                <p className="mt-3 text-[1rem] leading-relaxed text-text-2">{lead}</p>
                <PrintButton label={print} />
                <ol className="mt-8 divide-y divide-line border-y border-line">
                    {tips.map((tip, index) => (
                        <li key={tip} className="flex gap-4 py-4 text-[1rem] leading-relaxed">
                            <span className="nt-serif text-[1.5rem] leading-none text-brand-600">{index + 1}</span>
                            {tip}
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    );
}
