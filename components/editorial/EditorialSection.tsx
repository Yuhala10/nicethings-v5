import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PinCard from "@/components/place/PinCard";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { EditorialRail } from "@/lib/places/editorial";

// One editorial section: a serif title, one calm line, then the places as a
// swipeable rail on phones and a row of four on larger screens.
export default function EditorialSection({ rail, locale, priority = false }: { rail: EditorialRail; locale: Locale; priority?: boolean }) {
    const t = getDictionary(locale);
    return (
        <section className="nt-reveal pt-12 md:pt-16" aria-labelledby={`rail-${rail.key}`}>
            <div className="mx-auto flex max-w-6xl items-end justify-between gap-6 px-4 pb-5 md:px-6">
                <div className="min-w-0 max-w-xl">
                    <h2 id={`rail-${rail.key}`} className="nt-section-title">
                        {rail.title}
                    </h2>
                    <p className="mt-1.5 text-[0.92rem] leading-relaxed text-muted">{rail.blurb}</p>
                </div>
                {rail.href && (
                    <Link href={rail.href} className="group hidden shrink-0 items-center gap-1.5 text-[0.88rem] font-semibold text-text sm:inline-flex">
                        {t.common.seeAll}
                        <span className="text-muted">{rail.count}</span>
                        <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Link>
                )}
            </div>
            <div className="mx-auto max-w-6xl md:px-6">
                <ul className="nt-rail">
                    {rail.items.map((place, index) => (
                        <li key={place.id}>
                            <PinCard place={place} shape="portrait" priority={priority && index < 2} />
                        </li>
                    ))}
                </ul>
            </div>
            {rail.href && (
                <div className="px-4 pt-4 sm:hidden">
                    <Link href={rail.href} className="inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-text">
                        {t.common.seeAll} · {rail.count}
                        <ArrowRight size={15} />
                    </Link>
                </div>
            )}
        </section>
    );
}
