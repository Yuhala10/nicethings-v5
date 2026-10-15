import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { cityBySlug } from "@/lib/cities";
import type { Guest } from "@/lib/guests";
import { fill, getDictionary, type Locale } from "@/lib/i18n";
import { tidy } from "@/lib/i18n/format";
import { paths } from "@/lib/places/paths";

// A guest's own sentence, between the quotation marks of the reader's language.
export const quoted = (words: string, locale: Locale) => tidy(locale === "fr" ? `« ${words} »` : `“${words}”`);

// A guest's rank and number, as written on their seal: "N°03", or for a
// guest of honour "Invité d'honneur · N°01".
export function sealOf(guest: Pick<Guest, "tier" | "number">, locale: Locale) {
    const t = getDictionary(locale);
    const number = guest.number ? fill(t.guestPage.number, { number: String(guest.number).padStart(2, "0") }) : null;
    return guest.tier === "honour" ? [t.honour.rank, number].filter(Boolean).join(" · ") : number;
}

// A guest, as the guests' row shows them (home page, the guests' page, the
// foot of another guest's page): their portrait like a magazine cover,
// their number, their city and their name; under it, their sentence. A guest
// of honour's cover is framed in gold leaf, with the star.
export default function GuestCard({ guest, locale, priority = false }: { guest: Guest; locale: Locale; priority?: boolean }) {
    const t = getDictionary(locale);
    const city = cityBySlug(guest.city)?.name ?? t.guestPage.country;
    const honour = guest.tier === "honour";
    const seal = sealOf(guest, locale);
    const cover = (
        <span className={`relative block aspect-[3/4] overflow-hidden ${honour ? "rounded-[1.45rem] bg-[#0a3326]" : "rounded-[1.6rem] bg-[#15110e]"}`}>
            {guest.cover ? (
                <Image src={guest.cover} alt={guest.name} fill sizes="(min-width: 768px) 24rem, 72vw" priority={priority} className="object-cover transition duration-700 group-hover:scale-[1.03]" />
            ) : (
                <span className={`nt-serif absolute inset-0 grid place-items-center text-[8rem] ${honour ? "nt-foil" : "text-[#d9bc8c]"}`} aria-hidden>
                    {guest.name.trim().charAt(0).toUpperCase()}
                </span>
            )}
            <span className={`absolute inset-0 bg-gradient-to-t ${honour ? "from-[#06231a]/95 via-[#06231a]/25" : "from-black/85 via-black/20"} to-transparent`} aria-hidden />
            <span className={`absolute inset-2 rounded-[1.2rem] border ${honour ? "border-[#e2c065]/70" : "border-[#d9bc8c]/45"}`} aria-hidden />
            {seal && (
                <span
                    className={`absolute top-5 left-5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.75rem] font-bold tracking-[0.14em] uppercase backdrop-blur-sm ${
                        honour ? "border-[#e2c065] bg-[#06231a]/70 text-[#f3d77e]" : "border-[#d9bc8c]/70 bg-black/35 text-[#d9bc8c]"
                    }`}
                >
                    {honour && <Star size={12} className="fill-[#f3d77e]" />}
                    {seal}
                </span>
            )}
            <span className="absolute inset-x-5 bottom-5 block text-white">
                <span className={`nt-serif block text-[1.25rem] leading-none ${honour ? "nt-foil" : "text-[#d9bc8c]"}`}>{fill(t.guestPage.cityLine, { city })}</span>
                <span className="nt-serif mt-1 block text-[2rem] leading-[1.02]">{fill(t.guestPage.byLine, { name: guest.name })}</span>
                {guest.handle && <span className="mt-1.5 block truncate text-[0.875rem] text-white/70">{guest.handle}</span>}
            </span>
        </span>
    );
    return (
        <Link href={paths.guest(locale, guest.slug)} className="nt-pressable group block">
            {/* A guest of honour's cover sits in a ring of gold leaf. */}
            {honour ? <span className="nt-foil-bg block rounded-[1.6rem] p-[3px]">{cover}</span> : cover}
            {guest.intro && <span className="mt-3 line-clamp-2 block text-[1rem] leading-relaxed text-text-2">{quoted(guest.intro, locale)}</span>}
            <span className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-[0.875rem] font-bold">
                {t.guestPage.cardCta}
                <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
        </Link>
    );
}
