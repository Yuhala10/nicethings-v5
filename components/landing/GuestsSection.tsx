import Link from "next/link";
import { ArrowRight } from "lucide-react";
import GuestCard from "@/components/guest/GuestCard";
import type { Guest } from "@/lib/guests";
import { getDictionary, type Locale } from "@/lib/i18n";
import { tidy } from "@/lib/i18n/format";
import { paths } from "@/lib/places/paths";

// The home page's guests: the people NiceThings invited, each as a cover,
// and the door to ask for an invitation. Before the first page is out, the
// door alone, as an invitation card.
export default function GuestsSection({ guests, locale }: { guests: Guest[]; locale: Locale }) {
    const t = getDictionary(locale);

    if (guests.length === 0) {
        return (
            <section className="mx-auto max-w-6xl px-4 pt-14 md:px-6 md:pt-24">
                <Link href={`${paths.guests(locale)}#demande`} className="nt-reveal nt-pressable group relative block overflow-hidden rounded-[2rem] bg-[#15110e] px-6 py-10 text-[#faf7f2] md:px-12 md:py-14">
                    <span className="pointer-events-none absolute inset-2.5 rounded-[1.6rem] border border-[#d9bc8c]/35" aria-hidden />
                    <span className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(192,71,27,0.35),transparent_68%)]" aria-hidden />
                    <span className="relative block text-[0.75rem] font-semibold tracking-[0.3em] text-[#d9bc8c] uppercase">{t.guestPage.homeEyebrow}</span>
                    <span className="nt-serif relative mt-3 block max-w-[16ch] text-[2.25rem] leading-[1.02] md:text-[3.5rem]">{t.guestPage.teaserTitle}</span>
                    <span className="relative mt-4 block max-w-xl text-[1rem] leading-relaxed text-[#faf7f2]/75">{tidy(t.guestPage.teaserBody)}</span>
                    <span className="relative mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#faf7f2] px-6 text-[1rem] font-bold text-[#15110e]">
                        {t.guestPage.joinCta}
                        <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                </Link>
            </section>
        );
    }

    return (
        <section id="invites" className="scroll-mt-28 mx-auto max-w-6xl px-4 pt-14 md:px-6 md:pt-28">
            <div className="nt-reveal max-w-xl">
                <p className="nt-eyebrow">{t.guestPage.homeEyebrow}</p>
                <h2 className="nt-serif mt-2 text-[2.25rem] md:text-[3.5rem]">{t.guestPage.homeTitle}</h2>
                <p className="mt-3 text-[1rem] text-muted">{tidy(t.guestPage.homeLead)}</p>
            </div>
            <ul className="nt-scroll-x mt-8 -mx-4 gap-4 px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:px-0">
                {guests.slice(0, 6).map((guest) => (
                    <li key={guest.ref} className="w-[72vw] max-w-[19rem] shrink-0 md:w-auto md:max-w-none">
                        <GuestCard guest={guest} locale={locale} />
                    </li>
                ))}
            </ul>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Link href={paths.guests(locale)} className="nt-btn nt-btn-outline w-full sm:w-auto">
                    {t.guestPage.allGuests}
                    <ArrowRight size={16} />
                </Link>
                <Link href={`${paths.guests(locale)}#demande`} className="nt-btn nt-btn-soft w-full sm:w-auto">
                    {t.guestPage.joinCta}
                </Link>
            </div>
        </section>
    );
}
