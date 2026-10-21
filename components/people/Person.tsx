import Link from "next/link";
import { BadgeCheck, Crown, Sparkles } from "lucide-react";
import { fill, getDictionary, type Locale } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import { PIONEERS } from "@/lib/people/rules";
import type { Person } from "@/lib/people/types";
import VerifiedTick from "../place/VerifiedTick";

// A person on NiceThings, wherever they show: their face, their name, their
// rank. Works on the server and in the browser (no hooks).

type FaceOf = Pick<Person, "face" | "role" | "level">;

// Gold for the founder and the neighbourhood legends; the sunset for the team.
function ringOf(person: FaceOf) {
    if (person.role === "founder" || person.level >= 4) return "gold";
    if (person.role === "team") return "sunset";
    return undefined;
}

export function Face({ person, size = 40, className = "" }: { person: FaceOf; size?: number; className?: string }) {
    return (
        <span className={`nt-face ${className}`} data-ring={ringOf(person)} style={{ width: size, height: size }}>
            { }
            <img src={person.face} alt="" width={size} height={size} loading="lazy" decoding="async" />
        </span>
    );
}

// The colour of each level, from "Nouveau" to "Légende du kwat".
const LEVEL_STYLES = [
    "bg-surface-2 text-text-2",
    "bg-[#e3f3e8] text-[#13703a] dark:bg-[#13703a]/25 dark:text-[#8fd8a8]",
    "bg-[#e2ecfb] text-[#1f4fa8] dark:bg-[#1f4fa8]/25 dark:text-[#a9c4f5]",
    "nt-sunset text-white",
    "bg-[#15110e] text-[#f6dd86]",
];

export function LevelBadge({ level, locale, className = "" }: { level: number; locale: Locale; className?: string }) {
    const t = getDictionary(locale).people;
    return (
        <span className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-[0.75rem] font-semibold whitespace-nowrap ${LEVEL_STYLES[level] ?? LEVEL_STYLES[0]} ${className}`}>
            {level >= 3 && <Sparkles size={11} />}
            {t.levels[level] ?? t.levels[0]}
        </span>
    );
}

// The founder and the team say so; the first hundred members carry
// "Pionnier" for good.
export function Ranks({ person, locale, withLevel = true }: { person: Pick<Person, "role" | "level" | "memberNo"> & Partial<Pick<Person, "verified" | "verifiedLabel">>; locale: Locale; withLevel?: boolean }) {
    const t = getDictionary(locale).people;
    return (
        <>
            {person.verified && person.role === "member" && (
                <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-[#0095f6]/12 px-2.5 text-[0.75rem] font-semibold whitespace-nowrap text-[#0077c8] dark:text-[#7cc6ff]">
                    <VerifiedTick size={13} />
                    {person.verifiedLabel || t.verify.badge}
                </span>
            )}
            {person.role === "founder" && (
                <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-[#15110e] px-2.5 text-[0.75rem] font-semibold whitespace-nowrap">
                    <Crown size={11} className="text-[#e2c065]" />
                    <span className="nt-foil">{t.roles.founder}</span>
                </span>
            )}
            {person.role === "team" && (
                <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2.5 text-[0.75rem] font-semibold whitespace-nowrap text-brand-700 dark:bg-brand-700/25 dark:text-brand-200">
                    <BadgeCheck size={12} />
                    {t.roles.team}
                </span>
            )}
            {withLevel && <LevelBadge level={person.level} locale={locale} />}
            {person.memberNo <= PIONEERS && (
                <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-[#c99a35]/50 px-2.5 text-[0.75rem] font-semibold whitespace-nowrap text-[#9a7424] dark:text-[#e2c065]">
                    {t.pioneer} · n°{person.memberNo}
                </span>
            )}
        </>
    );
}

// The verified tick after a name: blue, gold for the founder. Its title
// says what they are known as.
export function VerifiedBadge({ person, locale, size = 16, className = "" }: { person: Pick<Person, "verified" | "verifiedLabel" | "role">; locale: Locale; size?: number; className?: string }) {
    if (!person.verified) return null;
    const words = getDictionary(locale).people.verify;
    const label = person.role === "founder" ? words.founder : person.role === "team" ? words.team : person.verifiedLabel ? `${words.badge} · ${person.verifiedLabel}` : words.badge;
    return <VerifiedTick size={size} tone={person.role === "founder" ? "gold" : "blue"} label={label} className={className} />;
}

export function displayName(person: Pick<Person, "name" | "handle">) {
    return person.name?.trim() || `@${person.handle}`;
}

// Under a review or a comment: face, name, rank, then "@name · area · when".
export function PersonLine({ person, locale, meta, size = 40, light = false }: { person: Person; locale: Locale; meta?: React.ReactNode; size?: number; light?: boolean }) {
    const known = [person.name ? `@${person.handle}` : null, person.area].filter(Boolean).join(" · ");
    const href = paths.person(locale, person.handle);
    const rank = person.role === "founder" ? getDictionary(locale).people.roles.founder : person.role === "team" ? getDictionary(locale).people.roles.team : getDictionary(locale).people.levels[person.level];
    return (
        <div className="flex min-w-0 items-center gap-3">
            <Link href={href} className="shrink-0" aria-label={`@${person.handle}`}>
                <Face person={person} size={size} />
            </Link>
            <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2">
                    <Link href={href} className={`min-w-0 truncate text-[0.875rem] font-semibold hover:underline ${light ? "text-white" : "text-text"}`}>
                        {displayName(person)}
                    </Link>
                    <VerifiedBadge person={person} locale={locale} size={15} className="-ml-1" />
                    <span className={`shrink-0 text-[0.75rem] font-semibold ${person.role === "founder" || person.level >= 4 ? "nt-foil" : light ? "text-white/70" : "text-muted"}`}>{rank}</span>
                </span>
                <span className={`block truncate text-[0.75rem] ${light ? "text-white/60" : "text-muted"}`}>
                    {known}
                    {known && meta ? " · " : null}
                    {/* When it was, said again by the phone (see Ago). */}
                    {typeof meta === "string" ? <span suppressHydrationWarning>{meta}</span> : meta}
                </span>
            </span>
        </div>
    );
}

export function memberLine(person: Pick<Person, "memberNo">, locale: Locale) {
    return fill(getDictionary(locale).people.memberNo, { number: person.memberNo });
}

// A review's mark in words, from "C'est le ndem" to "C'est validé !".
const RATING_TONES = ["bg-[#fde2e1] text-[#a61b1b]", "bg-[#fdecd8] text-[#9a4a0c]", "bg-surface-2 text-text-2", "bg-[#e3f3e8] text-[#13703a]", "nt-sunset text-white"];

export function RatingChip({ rating, locale }: { rating: number; locale: Locale }) {
    const words = getDictionary(locale).people;
    return (
        <span className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[0.75rem] font-bold ${RATING_TONES[rating - 1] ?? RATING_TONES[2]}`}>
            <span aria-hidden>{words.ratingFaces[rating - 1]}</span>
            {words.ratings[rating - 1]}
        </span>
    );
}
