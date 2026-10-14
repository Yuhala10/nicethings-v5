import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Guest } from "@/lib/guests";
import { fill, getDictionary, type Locale } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";

// Under a place's name: the guests who chose it, with their faces, leading
// to their page. A recommendation from a person, not a star rating.
export default function GuestNod({ guests, locale }: { guests: Guest[]; locale: Locale }) {
    const t = getDictionary(locale);
    const shown = guests.slice(0, 3);
    const names = shown.map((guest) => guest.name);
    const line = shown.length === 1 ? fill(t.guestPage.nodOne, { name: names[0] }) : fill(t.guestPage.nodMany, { names: new Intl.ListFormat(locale, { type: "conjunction" }).format(names) });
    return (
        <Link href={paths.guest(locale, shown[0].slug)} className="nt-tap group mt-5 flex min-h-14 items-center gap-3 rounded-[1.1rem] border border-[#d9bc8c]/70 bg-[#faf6ee] py-2 pr-3 pl-2 text-[#15110e] transition hover:border-[#d9bc8c] dark:bg-[#211a14] dark:text-[#faf7f2]">
            <span className="flex shrink-0 -space-x-3">
                {shown.map((guest) => (
                    <span key={guest.ref} className="relative h-11 w-11 overflow-hidden rounded-full border-2 border-[#d9bc8c] bg-[#15110e]">
                        {guest.cover ? (
                            <Image src={guest.cover} alt="" fill sizes="44px" className="object-cover" />
                        ) : (
                            <span className="nt-serif absolute inset-0 grid place-items-center text-[1.25rem] text-[#d9bc8c]">{guest.name.trim().charAt(0).toUpperCase()}</span>
                        )}
                    </span>
                ))}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.875rem] font-bold">{line}</span>
                <span className="block text-[0.75rem] tracking-[0.06em] text-[#a8824a] uppercase">{t.guest.seal}</span>
            </span>
            <ChevronRight size={17} className="shrink-0 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
    );
}
