import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { themeOf } from "@/lib/guest-theme";
import type { Guest } from "@/lib/guests";
import { fill, getDictionary, type Locale } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";

// Under a place's name: the guests who chose it, with their faces, leading
// to their page. A recommendation from a person, not a star rating. A guest
// of honour signs first, in green and gold, with the star.
export default function GuestNod({ guests, locale }: { guests: Guest[]; locale: Locale }) {
    const t = getDictionary(locale);
    // Guests of honour first (getGuests already sorts them so), three faces at most.
    const shown = [...guests].sort((a, b) => Number(b.tier === "honour") - Number(a.tier === "honour")).slice(0, 3);
    const lead = shown[0];
    const honour = lead.tier === "honour";
    const theme = themeOf(lead.tier);
    const names = shown.map((guest) => guest.name);
    const line = honour
        ? fill(t.honour.nodOne, { name: names[0] })
        : shown.length === 1
          ? fill(t.guestPage.nodOne, { name: names[0] })
          : fill(t.guestPage.nodMany, { names: new Intl.ListFormat(locale, { type: "conjunction" }).format(names) });
    return (
        <Link href={paths.guest(locale, lead.slug)} className={`nt-tap group mt-5 flex min-h-14 items-center gap-3 rounded-[1.1rem] border py-2 pr-3 pl-2 transition ${theme.nod}`}>
            <span className="flex shrink-0 -space-x-3">
                {shown.map((guest) => (
                    <span key={guest.ref} className={`relative h-11 w-11 overflow-hidden rounded-full border-2 ${guest.tier === "honour" ? "border-[#e2c065]" : "border-[#d9bc8c]"} bg-[#15110e]`}>
                        {guest.cover ? (
                            <Image src={guest.cover} alt="" fill sizes="44px" className="object-cover" />
                        ) : (
                            <span className="nt-serif absolute inset-0 grid place-items-center text-[1.25rem] text-[#d9bc8c]">{guest.name.trim().charAt(0).toUpperCase()}</span>
                        )}
                    </span>
                ))}
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[0.875rem] font-bold">
                    {honour && <Star size={14} className="shrink-0 fill-[#f3d77e] text-[#f3d77e]" />}
                    <span className="truncate">{line}</span>
                </span>
                <span className={`block text-[0.75rem] tracking-[0.06em] uppercase ${theme.nodRank}`}>{honour ? t.honour.rank : t.guest.seal}</span>
            </span>
            <ChevronRight size={17} className="shrink-0 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
    );
}
