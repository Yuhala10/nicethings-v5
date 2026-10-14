import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cityBySlug } from "@/lib/cities";
import type { Guest } from "@/lib/guests";
import { fill, getDictionary, type Locale } from "@/lib/i18n";
import { tidy } from "@/lib/i18n/format";
import { paths } from "@/lib/places/paths";

// A guest's own sentence, between the quotation marks of the reader's language.
export const quoted = (words: string, locale: Locale) => tidy(locale === "fr" ? `« ${words} »` : `“${words}”`);

// A guest, as the guests' row shows them (home page, the guests' page, the
// foot of another guest's page): their portrait like a magazine cover,
// their number, their city and their name; under it, their sentence.
export default function GuestCard({ guest, locale, priority = false }: { guest: Guest; locale: Locale; priority?: boolean }) {
    const t = getDictionary(locale);
    const city = cityBySlug(guest.city)?.name ?? t.guestPage.country;
    return (
        <Link href={paths.guest(locale, guest.slug)} className="nt-pressable group block">
            <span className="relative block aspect-[3/4] overflow-hidden rounded-[1.6rem] bg-[#15110e]">
                {guest.cover ? (
                    <Image src={guest.cover} alt={guest.name} fill sizes="(min-width: 768px) 22rem, 70vw" priority={priority} className="object-cover transition duration-700 group-hover:scale-[1.03]" />
                ) : (
                    <span className="nt-serif absolute inset-0 grid place-items-center text-[8rem] text-[#d9bc8c]" aria-hidden>
                        {guest.name.trim().charAt(0).toUpperCase()}
                    </span>
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" aria-hidden />
                <span className="absolute inset-2 rounded-[1.25rem] border border-[#d9bc8c]/45" aria-hidden />
                {guest.number && (
                    <span className="absolute top-5 left-5 rounded-full border border-[#d9bc8c]/70 bg-black/35 px-3 py-1 text-[0.75rem] font-bold tracking-[0.16em] text-[#d9bc8c] backdrop-blur-sm">
                        {fill(t.guestPage.number, { number: String(guest.number).padStart(2, "0") })}
                    </span>
                )}
                <span className="absolute inset-x-5 bottom-5 block text-white">
                    <span className="nt-serif block text-[1.25rem] leading-none text-[#d9bc8c]">{fill(t.guestPage.cityLine, { city })}</span>
                    <span className="nt-serif mt-1 block text-[2rem] leading-[1.02]">{fill(t.guestPage.byLine, { name: guest.name })}</span>
                    {guest.handle && <span className="mt-1.5 block truncate text-[0.875rem] text-white/70">{guest.handle}</span>}
                </span>
            </span>
            {guest.intro && <span className="mt-3 line-clamp-2 block text-[1rem] leading-relaxed text-text-2">{quoted(guest.intro, locale)}</span>}
            <span className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-[0.875rem] font-bold">
                {t.guestPage.cardCta}
                <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
        </Link>
    );
}
