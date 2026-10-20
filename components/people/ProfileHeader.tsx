import { MapPin } from "lucide-react";
import { cityBySlug } from "@/lib/cities";
import { fill, getDictionary, type Locale } from "@/lib/i18n";
import { levelOf, type Stats } from "@/lib/people/rules";
import type { Person } from "@/lib/people/types";
import { Face, Ranks, VerifiedBadge, displayName } from "./Person";

// The top of a profile: the face, the name, the ranks, the neighbourhood,
// what they gave, and how far the next level is. The founder and the
// neighbourhood legends wear green and gold; everyone else the night.

export default function ProfileHeader({
    person,
    bio,
    createdAt,
    stats,
    locale,
    children,
}: {
    person: Person;
    bio: string | null;
    createdAt: string;
    stats: Stats;
    locale: Locale;
    children?: React.ReactNode;
}) {
    const words = getDictionary(locale).people;
    const gold = person.role === "founder" || person.level >= 4;
    const progress = levelOf(person.points);
    const since = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { month: "long", year: "numeric", timeZone: "Africa/Douala" }).format(new Date(createdAt));
    const where = [person.area, cityBySlug(person.city)?.name].filter(Boolean).join(", ");
    const figures = [
        [stats.reviews, words.stats.reviews],
        [(stats.outings ?? 0) + stats.photos, words.stats.outings],
        [stats.followers ?? 0, words.stats.followers],
    ] as const;

    return (
        <header className={`relative overflow-hidden rounded-[2rem] px-6 pt-8 pb-7 text-white md:px-10 md:pt-10 ${gold ? "bg-[#0a3326]" : "bg-[#15110e]"}`}>
            <span className={`pointer-events-none absolute inset-2.5 rounded-[1.6rem] border ${gold ? "border-[#e2c065]/40" : "border-white/10"}`} aria-hidden />
            <span className={`pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full blur-3xl ${gold ? "bg-[#e2c065]/20" : "bg-[#d9572b]/25"}`} aria-hidden />

            <div className="relative flex items-center gap-5">
                <Face person={person} size={104} className="shadow-float" />
                <div className="min-w-0">
                    <h1 className="nt-serif flex min-w-0 items-center gap-2 text-[2.25rem] leading-[1.05] md:text-[2.75rem]">
                        <span className="min-w-0 truncate">{displayName(person)}</span>
                        <VerifiedBadge person={person} locale={locale} size={26} />
                    </h1>
                    <p className="mt-1 truncate text-[0.875rem] font-semibold text-white/65">@{person.handle}</p>
                </div>
            </div>

            <div className="relative mt-5 flex flex-wrap gap-2">
                <Ranks person={person} locale={locale} />
            </div>

            {bio && <p className="relative mt-4 max-w-xl text-[1rem] leading-relaxed whitespace-pre-line text-white/85">{bio}</p>}
            <p className="relative mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.875rem] text-white/60">
                {where && (
                    <span className="inline-flex items-center gap-1">
                        <MapPin size={14} />
                        {where}
                    </span>
                )}
                <span>{fill(words.memberSince, { date: since })}</span>
                <span>{fill(words.memberNo, { number: person.memberNo })}</span>
            </p>

            <dl className="relative mt-6 grid grid-cols-3 gap-2 border-t border-white/10 pt-5">
                {figures.map(([value, label]) => (
                    <div key={label}>
                        <dt className="sr-only">{label}</dt>
                        <dd className="nt-serif text-[1.75rem] leading-none">{value}</dd>
                        <dd className="mt-1 text-[0.75rem] text-white/60">{label}</dd>
                    </div>
                ))}
            </dl>

            {/* The road to the next level. */}
            <div className="relative mt-6">
                <div className="flex items-baseline justify-between gap-3 text-[0.75rem]">
                    <span className={`font-semibold ${gold ? "nt-foil" : "text-white"}`}>
                        {words.levels[progress.level]} · {fill(words.points, { points: person.points })}
                    </span>
                    <span className="text-white/55">{words.levelLeads[progress.level]}</span>
                </div>
                <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10">
                    <span className={`block h-full rounded-full ${gold ? "nt-foil-bg" : "nt-sunset"}`} style={{ width: `${Math.max(4, progress.progress * 100)}%` }} />
                </span>
                <p className="mt-2 text-[0.75rem] text-white/55">
                    {progress.next === null ? words.topLevel : fill(words.nextLevel, { points: progress.next - person.points, level: words.levels[progress.level + 1] })}
                </p>
            </div>

            {children && <div className="relative mt-6 flex flex-wrap gap-2">{children}</div>}
        </header>
    );
}

