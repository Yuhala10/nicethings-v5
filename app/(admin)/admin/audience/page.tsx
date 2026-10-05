"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Clock3, Database, Eye, MousePointerClick, Repeat2, Route, Search, ShieldCheck, Users } from "lucide-react";
import { adminLang, useTr } from "@/components/admin/i18n";
import { Bar, Empty, PageHeader, Skeleton, Stat, formatCount, useAdminData } from "@/components/admin/ui";
import type { PageKind } from "@/lib/analytics";
import { cityBySlug } from "@/lib/cities";

type Day = { day: string; views: number; visitors: number; returned: number; visits: number };
type Audience = {
    setup?: boolean;
    days: number;
    views: number;
    visitors: number;
    returned: number;
    fresh: number;
    visits: number;
    engaged: number;
    seconds: number;
    // The same number of days just before; null while the log is too young.
    previous: { visitors: number; visits: number; views: number; engaged: number } | null;
    today: { visitors: number; views: number };
    live: { now: number; recent: number };
    perDay: Day[];
    hours: number[][];
    funnel: { visitors: number; place: number; directions: number; searched: number };
    cities: { city: string; views: number; visitors: number; returned: number }[];
    pages: { page: PageKind; views: number; visitors: number }[];
    places: { slug: string; id: string | null; name: string | null; city: string | null; views: number; visitors: number; directions: number }[];
    articles: { slug: string; title: string | null; views: number; readers: number }[];
    sources: { source: string; visits: number }[];
    entries: { path: string; page: PageKind; label: string | null; visits: number }[];
    langs: { lang: string; visitors: number }[];
    devices: { device: string; visitors: number }[];
    partial?: boolean;
};

const PAGE_LABELS: Record<PageKind, [string, string]> = {
    landing: ["Accueil", "Home"],
    city: ["Guide d'une ville", "City guide"],
    guide: ["Guide quartier ou catégorie", "Neighbourhood or category guide"],
    search: ["Recherche", "Search"],
    map: ["Carte", "Map"],
    place: ["Fiche d'un lieu", "Place page"],
    directions: ["Itinéraire", "Directions"],
    saved: ["Favoris", "Saved"],
    submit: ["Proposer un lieu", "Suggest a place"],
    blog: ["Blog (accueil)", "Blog (home)"],
    article: ["Article du blog", "Blog article"],
    pro: ["Espace pro", "Business space"],
    other: ["Autres pages", "Other pages"],
};

const SOURCE_LABELS: Record<string, string> = {
    direct: "Direct",
    app: "App",
    google: "Google",
    bing: "Bing",
    duckduckgo: "DuckDuckGo",
    yahoo: "Yahoo",
    whatsapp: "WhatsApp",
    instagram: "Instagram",
    facebook: "Facebook",
    tiktok: "TikTok",
    twitter: "X (Twitter)",
    youtube: "YouTube",
    linkedin: "LinkedIn",
    telegram: "Telegram",
};

const WEEKDAYS: [string, string][] = [
    ["lundi", "Monday"],
    ["mardi", "Tuesday"],
    ["mercredi", "Wednesday"],
    ["jeudi", "Thursday"],
    ["vendredi", "Friday"],
    ["samedi", "Saturday"],
    ["dimanche", "Sunday"],
];

// Returning visitors carry the accent; first-time visitors stay neutral.
const RETURNED = "#c0471b";
const FRESH = "#8f8375";
// Busy hours: one hue, the darker the busier. An empty slot keeps the paper.
const HEAT = ["#e8a47f", "#d97c4e", "#c0471b", "#8a3112"];
const HEAT_EMPTY = "#f3eee6";

const number = formatCount;
const percent = (value: number, total: number) => (total ? Math.round((value / total) * 100) : 0);
const plural = (count: number) => (count > 1 ? "s" : "");
const withoutLanguage = (path: string) => path.replace(/^\/(fr|en)(?=\/|$)/, "") || "/";

// A page address as people read it ("/yaounde/bastos"), whatever it holds.
function readable(path: string) {
    try {
        return decodeURIComponent(withoutLanguage(path));
    } catch {
        return withoutLanguage(path);
    }
}
const dayLabel = (day: string, long = false) =>
    new Date(`${day}T12:00:00Z`).toLocaleDateString(adminLang() === "en" ? "en-GB" : "fr-FR", long ? { weekday: "long", day: "numeric", month: "long" } : { day: "numeric", month: "short" });

function duration(seconds: number) {
    if (seconds < 60) return `${seconds} s`;
    return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, "0")}`;
}

// A round number just above the busiest day, for the top of the scale.
function niceMax(value: number) {
    if (value <= 4) return 4;
    const step = 10 ** Math.floor(Math.log10(value));
    return [1, 2, 4, 5, 10].map((factor) => factor * step).find((top) => top >= value)!;
}

// The change against the days just before: arrow, sign and wording, never
// colour alone.
function Trend({ value, before, days }: { value: number; before: number | undefined; days: number }) {
    const tr = useTr();
    if (before === undefined || (before === 0 && value === 0)) return null;
    const title = tr(`Par rapport aux ${days} jours précédents (${number(before)})`, `Compared with the ${days} days before (${number(before)})`);
    if (before === 0) {
        return (
            <span title={title} className="rounded-full bg-green-50 px-2 py-0.5 text-[0.7rem] font-bold text-good">
                {tr("nouveau", "new")}
            </span>
        );
    }
    const change = Math.round(((value - before) / before) * 100);
    if (change === 0) {
        return (
            <span title={title} className="rounded-full bg-soft px-2 py-0.5 text-[0.7rem] font-bold text-text-2">
                {tr("stable", "steady")}
            </span>
        );
    }
    const Arrow = change > 0 ? ArrowUpRight : ArrowDownRight;
    return (
        <span title={title} className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.7rem] font-bold tabular-nums ${change > 0 ? "bg-green-50 text-good" : "bg-red-50 text-bad"}`}>
            <Arrow size={12} strokeWidth={2.4} aria-hidden />
            {change > 0 ? "+" : "−"}
            {Math.abs(change)} %<span className="sr-only"> {title}</span>
        </span>
    );
}

// Right now and today, refreshed every minute.
function LiveStrip({ data }: { data: Audience }) {
    const tr = useTr();
    const here = data.live.now > 0;
    return (
        <section className="a-card mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3.5 text-sm" aria-live="polite">
            <p className="flex items-center gap-2.5 font-semibold">
                <span className="relative flex h-2.5 w-2.5" aria-hidden>
                    {here && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good opacity-60" />}
                    <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${here ? "bg-good" : "bg-line-strong"}`} />
                </span>
                {here
                    ? tr(`${number(data.live.now)} personne${plural(data.live.now)} sur le site en ce moment`, `${number(data.live.now)} ${data.live.now === 1 ? "person" : "people"} on the site right now`)
                    : tr("Personne sur le site en ce moment", "Nobody on the site right now")}
            </p>
            <p className="text-text-2">
                {tr(`${number(data.live.recent)} dans la dernière demi-heure`, `${number(data.live.recent)} in the last half hour`)}
                <span className="mx-2 text-line-strong" aria-hidden>
                    ·
                </span>
                {tr(
                    `Aujourd'hui : ${number(data.today.visitors)} visiteur${plural(data.today.visitors)}, ${number(data.today.views)} page${plural(data.today.views)} vue${plural(data.today.views)}`,
                    `Today: ${number(data.today.visitors)} visitor${data.today.visitors === 1 ? "" : "s"}, ${number(data.today.views)} page view${data.today.views === 1 ? "" : "s"}`
                )}
            </p>
        </section>
    );
}

function DailyChart({ perDay }: { perDay: Day[] }) {
    const tr = useTr();
    const [active, setActive] = useState<number | null>(null);
    const top = niceMax(Math.max(...perDay.map((day) => day.visitors)));
    const shown = perDay[active ?? perDay.length - 1];
    const height = (value: number) => `${(value / top) * 100}%`;

    return (
        <section className="a-card mt-6 p-5">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                <div>
                    <h2 className="a-serif text-[1.55rem]">{tr("Visiteurs par jour", "Visitors per day")}</h2>
                    <p className="text-sm text-muted" aria-live="polite">
                        <span className="inline-block font-bold text-ink first-letter:uppercase">{dayLabel(shown.day, true)}</span>
                        {" : "}
                        {tr(
                            `${number(shown.visitors)} visiteur${plural(shown.visitors)}, dont ${number(shown.returned)} déjà venu${plural(shown.returned)} · ${number(shown.visits)} visite${plural(shown.visits)} · ${number(shown.views)} pages vues`,
                            `${number(shown.visitors)} visitor${shown.visitors === 1 ? "" : "s"}, ${number(shown.returned)} returning · ${number(shown.visits)} visit${shown.visits === 1 ? "" : "s"} · ${number(shown.views)} page views`
                        )}
                    </p>
                </div>
                <ul className="flex gap-4 text-xs font-semibold text-text-2">
                    <li className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: RETURNED }} />
                        {tr("Déjà venus", "Returning")}
                    </li>
                    <li className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: FRESH }} />
                        {tr("Première visite", "First visit")}
                    </li>
                </ul>
            </div>

            <div className="mt-5 flex gap-2">
                <div className="flex h-44 w-7 shrink-0 flex-col justify-between text-right text-[0.68rem] leading-none text-muted tabular-nums" aria-hidden>
                    <span>{number(top)}</span>
                    <span>{number(top / 2)}</span>
                    <span>0</span>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="relative h-44" onPointerLeave={() => setActive(null)}>
                        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden>
                            <span className="border-t border-line" />
                            <span className="border-t border-line" />
                            <span className="border-t border-line-strong" />
                        </div>
                        <div className={`relative flex h-full items-stretch justify-between ${perDay.length > 45 ? "gap-px" : "gap-0.5"}`}>
                            {perDay.map((day, index) => (
                                <button
                                    key={day.day}
                                    type="button"
                                    aria-label={tr(`${dayLabel(day.day, true)} : ${day.visitors} visiteurs, dont ${day.returned} déjà venus`, `${dayLabel(day.day, true)}: ${day.visitors} visitors, ${day.returned} returning`)}
                                    onPointerEnter={() => setActive(index)}
                                    onFocus={() => setActive(index)}
                                    onBlur={() => setActive(null)}
                                    className={`flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5 rounded-t transition-opacity hover:bg-soft/60 ${
                                        active !== null && active !== index ? "opacity-45" : ""
                                    }`}
                                >
                                    {day.visitors - day.returned > 0 && (
                                        <span className="w-full max-w-6 rounded-t-[4px]" style={{ height: height(day.visitors - day.returned), background: FRESH }} />
                                    )}
                                    {day.returned > 0 && (
                                        <span
                                            className={`w-full max-w-6 ${day.visitors === day.returned ? "rounded-t-[4px]" : ""}`}
                                            style={{ height: height(day.returned), background: RETURNED }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mt-1.5 flex justify-between text-[0.68rem] text-muted" aria-hidden>
                        <span>{dayLabel(perDay[0].day)}</span>
                        <span>{dayLabel(perDay[perDay.length - 1].day)}</span>
                    </div>
                </div>
            </div>

            <details className="mt-4 text-sm">
                <summary className="cursor-pointer font-bold text-text-2">{tr("Voir les chiffres jour par jour", "See the numbers day by day")}</summary>
                <div className="mt-3 max-h-72 overflow-auto">
                    <table className="w-full text-sm tabular-nums">
                        <thead>
                            <tr className="text-left text-xs text-muted">
                                <th className="py-2 font-bold">{tr("Jour", "Day")}</th>
                                <th className="py-2 text-right font-bold">{tr("Visiteurs", "Visitors")}</th>
                                <th className="py-2 text-right font-bold">{tr("Déjà venus", "Returning")}</th>
                                <th className="py-2 text-right font-bold">{tr("Visites", "Visits")}</th>
                                <th className="py-2 text-right font-bold">{tr("Pages vues", "Page views")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...perDay].reverse().map((day) => (
                                <tr key={day.day} className="border-t border-line">
                                    <td className="py-2 font-semibold">{dayLabel(day.day)}</td>
                                    <td className="py-2 text-right">{number(day.visitors)}</td>
                                    <td className="py-2 text-right">{number(day.returned)}</td>
                                    <td className="py-2 text-right">{number(day.visits)}</td>
                                    <td className="py-2 text-right">{number(day.views)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </details>
        </section>
    );
}

// Pages seen per weekday and hour (Cameroon time): when to post, when to
// be reachable.
function BusyHours({ hours }: { hours: number[][] }) {
    const tr = useTr();
    const [active, setActive] = useState<[number, number] | null>(null);
    const max = Math.max(1, ...hours.flat());
    const slots = hours
        .flatMap((row, day) => row.map((views, hour) => ({ day, hour, views })))
        .filter((slot) => slot.views > 0)
        .sort((a, b) => b.views - a.views);
    const tone = (views: number) => (views === 0 ? HEAT_EMPTY : HEAT[Math.ceil((views / max) * HEAT.length) - 1]);
    const slotLabel = (day: number, hour: number) => tr(`${WEEKDAYS[day][0]}, ${hour} h – ${hour + 1} h`, `${WEEKDAYS[day][1]}, ${hour}:00–${hour + 1}:00`);
    const shown = active ? { day: active[0], hour: active[1], views: hours[active[0]][active[1]] } : slots[0];

    return (
        <Card title={tr("Quand ils viennent", "When they come")} hint={tr("Pages vues par jour de la semaine et par heure (heure du Cameroun).", "Page views by weekday and hour (Cameroon time).")}>
            {slots.length === 0 ? (
                <p className="text-sm text-muted">{tr("Pas encore assez de visites.", "Not enough visits yet.")}</p>
            ) : (
                <>
                    <p className="mb-3 text-sm text-muted" aria-live="polite">
                        <span className="inline-block font-bold text-ink first-letter:uppercase">{slotLabel(shown.day, shown.hour)}</span>
                        {" : "}
                        {tr(`${number(shown.views)} page${plural(shown.views)} vue${plural(shown.views)}`, `${number(shown.views)} page view${shown.views === 1 ? "" : "s"}`)}
                        {!active && tr(" (le créneau le plus actif)", " (the busiest slot)")}
                    </p>
                    <div role="img" aria-label={tr(`Créneau le plus actif : ${slotLabel(slots[0].day, slots[0].hour)}`, `Busiest slot: ${slotLabel(slots[0].day, slots[0].hour)}`)} onPointerLeave={() => setActive(null)}>
                        {hours.map((row, day) => (
                            <div key={day} className="mb-0.5 flex items-center gap-0.5">
                                <span className="w-8 shrink-0 text-[0.68rem] text-muted first-letter:uppercase">{tr(WEEKDAYS[day][0], WEEKDAYS[day][1]).slice(0, 3)}</span>
                                {row.map((views, hour) => (
                                    <span
                                        key={hour}
                                        onPointerEnter={() => setActive([day, hour])}
                                        onPointerDown={() => setActive([day, hour])}
                                        className={`aspect-square min-w-0 flex-1 rounded-[3px] ${active && active[0] === day && active[1] === hour ? "outline outline-2 outline-offset-1 outline-ink" : ""}`}
                                        style={{ background: tone(views) }}
                                    />
                                ))}
                            </div>
                        ))}
                        <div className="mt-1 flex gap-0.5 pl-[2.125rem] text-[0.68rem] text-muted tabular-nums" aria-hidden>
                            {[0, 6, 12, 18].map((hour) => (
                                <span key={hour} className="flex-1">
                                    {hour} h
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
                        <p className="flex items-center gap-1.5" aria-hidden>
                            {tr("Calme", "Quiet")}
                            {[HEAT_EMPTY, ...HEAT].map((color) => (
                                <span key={color} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
                            ))}
                            {tr("Actif", "Busy")}
                        </p>
                    </div>
                    <details className="mt-3 text-sm">
                        <summary className="cursor-pointer font-bold text-text-2">{tr("Voir les créneaux les plus actifs", "See the busiest slots")}</summary>
                        <ol className="mt-2 flex flex-col gap-1.5 tabular-nums">
                            {slots.slice(0, 8).map((slot) => (
                                <li key={`${slot.day}-${slot.hour}`} className="flex justify-between gap-3 border-t border-line pt-1.5">
                                    <span className="first-letter:uppercase">{slotLabel(slot.day, slot.hour)}</span>
                                    <span className="font-bold">{number(slot.views)}</span>
                                </li>
                            ))}
                        </ol>
                    </details>
                </>
            )}
        </Card>
    );
}

// How far visitors go: the site exists to take people from "I'm looking"
// to "I'm on my way".
function Journey({ funnel }: { funnel: Audience["funnel"] }) {
    const tr = useTr();
    const steps = [
        { label: tr("Sont venus sur le site", "Came to the site"), value: funnel.visitors },
        { label: tr("Ont ouvert la fiche d'un lieu", "Opened a place page"), value: funnel.place },
        { label: tr("Ont demandé l'itinéraire", "Asked for directions"), value: funnel.directions },
    ];
    return (
        <Card title={tr("Du visiteur à l'itinéraire", "From visitor to directions")} hint={tr("Sur les visiteurs de la période, combien vont jusqu'au bout.", "Out of this period's visitors, how many go all the way.")}>
            <ol className="flex flex-col gap-4">
                {steps.map((step, index) => (
                    <li key={step.label}>
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0 font-semibold">
                                <span className="mr-2 text-brand-600 tabular-nums">{index + 1}</span>
                                {step.label}
                            </span>
                            <span className="shrink-0 text-sm tabular-nums">
                                <span className="font-bold">{number(step.value)}</span>
                                <span className="ml-1.5 text-muted">{percent(step.value, funnel.visitors)} %</span>
                            </span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-soft">
                            <div className="h-full rounded-full bg-brand-600 transition-[width] duration-500" style={{ width: `${percent(step.value, funnel.visitors)}%` }} />
                        </div>
                    </li>
                ))}
            </ol>
            <p className="mt-4 border-t border-line pt-3 text-sm text-text-2">
                {tr(
                    `${number(funnel.searched)} visiteur${plural(funnel.searched)} (${percent(funnel.searched, funnel.visitors)} %) ${funnel.searched > 1 ? "ont" : "a"} utilisé la recherche ou la carte.`,
                    `${number(funnel.searched)} visitor${funnel.searched === 1 ? "" : "s"} (${percent(funnel.searched, funnel.visitors)}%) used search or the map.`
                )}
            </p>
        </Card>
    );
}

// A ranked list with one thin bar per row, scaled to the biggest row.
function Ranking({ rows }: { rows: { key: string; label: string; detail?: string; value: number; href?: string }[] }) {
    const max = Math.max(1, ...rows.map((row) => row.value));
    return (
        <ul className="flex flex-col gap-3">
            {rows.map((row) => (
                <li key={row.key}>
                    <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0">
                            {row.href ? (
                                <Link href={row.href} className="block truncate font-semibold hover:text-brand-600">
                                    {row.label}
                                </Link>
                            ) : (
                                <span className="block truncate font-semibold">{row.label}</span>
                            )}
                            {row.detail && <span className="block truncate text-xs text-muted">{row.detail}</span>}
                        </span>
                        <span className="shrink-0 text-sm font-bold tabular-nums">{number(row.value)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-soft">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${(row.value / max) * 100}%` }} />
                    </div>
                </li>
            ))}
        </ul>
    );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
    return (
        <section className="a-card min-w-0 p-5">
            <h2 className="a-serif text-[1.55rem]">{title}</h2>
            {hint && <p className="text-sm text-muted">{hint}</p>}
            <div className="mt-4">{children}</div>
        </section>
    );
}

// Who really visits, from where, how far they go and who comes back. What
// to improve next comes from here and from the "Recherches" page.
export default function AudiencePage() {
    const tr = useTr();
    const [days, setDays] = useState(30);
    const { data, error, loading, reload } = useAdminData<Audience>(`audience?days=${days}`);
    const total = (rows: { visitors: number }[]) => rows.reduce((sum, row) => sum + row.visitors, 0);
    const french = data?.langs?.find((row) => row.lang === "fr")?.visitors ?? 0;
    const phones = data?.devices?.find((row) => row.device === "mobile")?.visitors ?? 0;
    // Dimmed only while another period loads, not at each quiet refresh.
    const switching = loading && data?.days !== days;

    useEffect(() => {
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") void reload();
        }, 60_000);
        return () => window.clearInterval(timer);
    }, [reload]);

    const entryLabel = (entry: Audience["entries"][number]) => entry.label ?? (entry.page === "landing" ? tr(...PAGE_LABELS.landing) : readable(entry.path));

    return (
        <>
            <PageHeader
                title="Audience"
                subtitle={tr(
                    "Les vraies personnes qui utilisent NiceThings : d'où elles viennent, jusqu'où elles vont, qui revient. Robots et équipe exclus.",
                    "The real people using NiceThings: where they come from, how far they go, who comes back. Robots and team excluded."
                )}
                actions={
                    <div className="flex gap-1.5">
                        {[7, 30, 90].map((value) => (
                            <button key={value} type="button" className="a-chip" aria-pressed={days === value} onClick={() => setDays(value)}>
                                {value} {tr("jours", "days")}
                            </button>
                        ))}
                    </div>
                }
            />

            {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-bad">{error}</p>}

            {loading && !data ? (
                <>
                    <Skeleton className="mb-3 h-12" />
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                        {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-[8.5rem]" />)}
                    </div>
                    <Skeleton className="mt-6 h-72" />
                </>
            ) : !data ? null : data.setup ? (
                <div className="a-card flex flex-col items-center px-6 py-12 text-center">
                    <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
                        <Database size={22} />
                    </span>
                    <p className="font-bold">{tr("Une dernière étape pour activer les statistiques", "One last step to switch on statistics")}</p>
                    <ol className="mt-3 max-w-md list-decimal pl-5 text-left text-sm text-text-2">
                        <li>{tr("Ouvre ton projet sur supabase.com, puis « SQL Editor ».", "Open your project on supabase.com, then “SQL Editor”.")}</li>
                        <li>
                            {tr("Colle tout le contenu du fichier", "Paste the whole file")} <span className="font-mono text-xs font-bold">database/migrations/002_analytics.sql</span>.
                        </li>
                        <li>{tr("Clique sur « Run ». Les visites sont comptées à partir de ce moment.", "Click “Run”. Visits are counted from then on.")}</li>
                    </ol>
                </div>
            ) : data.views === 0 ? (
                <Empty
                    title={tr("Pas encore de visites", "No visits yet")}
                    body={tr(
                        "Les visites apparaissent ici dès qu'une personne ouvre le site et touche l'écran. Les robots et l'équipe ne sont pas comptés.",
                        "Visits show up here as soon as a person opens the site and touches the screen. Robots and the team are not counted."
                    )}
                />
            ) : (
                <div className={switching ? "opacity-60 transition-opacity" : "transition-opacity"}>
                    <LiveStrip data={data} />

                    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                        <Stat
                            icon={Users}
                            label={tr("Visiteurs", "Visitors")}
                            value={number(data.visitors)}
                            hint={tr(`dont ${number(data.fresh)} nouveau${data.fresh > 1 ? "x" : ""}`, `${number(data.fresh)} of them new`)}
                            tone="brand"
                            aside={<Trend value={data.visitors} before={data.previous?.visitors} days={data.days} />}
                        />
                        <Stat
                            icon={MousePointerClick}
                            label={tr("Visites", "Visits")}
                            value={number(data.visits)}
                            hint={tr(
                                `${(data.visits / Math.max(1, data.visitors)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} par visiteur`,
                                `${(data.visits / Math.max(1, data.visitors)).toLocaleString("en-GB", { maximumFractionDigits: 1 })} per visitor`
                            )}
                            aside={<Trend value={data.visits} before={data.previous?.visits} days={data.days} />}
                        />
                        <Stat
                            icon={Eye}
                            label={tr("Pages vues", "Page views")}
                            value={number(data.views)}
                            hint={tr(
                                `${(data.views / Math.max(1, data.visits)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} par visite`,
                                `${(data.views / Math.max(1, data.visits)).toLocaleString("en-GB", { maximumFractionDigits: 1 })} per visit`
                            )}
                            aside={<Trend value={data.views} before={data.previous?.views} days={data.days} />}
                        />
                        <Stat
                            icon={Repeat2}
                            label={tr("Sont revenus", "Came back")}
                            value={number(data.returned)}
                            hint={tr(`${percent(data.returned, data.visitors)} % des visiteurs, un autre jour`, `${percent(data.returned, data.visitors)}% of visitors, on another day`)}
                            tone="good"
                        />
                        <Stat
                            icon={Route}
                            label={tr("Visites engagées", "Engaged visits")}
                            value={`${percent(data.engaged, data.visits)} %`}
                            hint={tr(`${number(data.engaged)} visite${plural(data.engaged)} de 2 pages ou plus`, `${number(data.engaged)} visit${data.engaged === 1 ? "" : "s"} of 2 pages or more`)}
                        />
                        <Stat
                            icon={Clock3}
                            label={tr("Durée d'une visite", "Visit length")}
                            value={data.engaged ? duration(data.seconds) : "—"}
                            hint={tr("en moyenne, visites engagées", "on average, engaged visits")}
                        />
                    </section>
                    {!data.previous && (
                        <p className="mt-2 text-xs text-muted">
                            {tr(
                                `Les évolutions (+ / −) apparaîtront quand il y aura ${data.days} jours de mesure avant cette période.`,
                                `Trends (+ / −) will show once there are ${data.days} days of measurement before this period.`
                            )}
                        </p>
                    )}

                    <DailyChart perDay={data.perDay} />

                    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <Journey funnel={data.funnel} />
                        <BusyHours hours={data.hours} />

                        <Card title={tr("D'où viennent les visites", "Where visits come from")} hint={tr("Une ligne par visite. « Direct » : lien WhatsApp, favori ou adresse tapée.", "One count per visit. “Direct”: WhatsApp link, bookmark or typed address.")}>
                            <Ranking
                                rows={data.sources.map((row) => ({
                                    key: row.source,
                                    label: row.source === "app" ? tr("Application installée", "Installed app") : (SOURCE_LABELS[row.source] ?? row.source),
                                    value: row.visits,
                                }))}
                            />
                        </Card>

                        <Card title={tr("Par où ils arrivent", "Where they land")} hint={tr("La première page de chaque visite : ce qui fait venir.", "The first page of each visit: what brings people in.")}>
                            <Ranking
                                rows={data.entries.map((row) => ({
                                    key: row.path,
                                    label: entryLabel(row),
                                    detail: row.page === "landing" ? undefined : PAGE_LABELS[row.page] ? tr(...PAGE_LABELS[row.page]) : row.page,
                                    value: row.visits,
                                }))}
                            />
                        </Card>

                        <Card title={tr("Lieux les plus vus", "Most viewed places")} hint={tr("Les fiches à soigner en premier : photos, prix, horaires.", "The listings to polish first: photos, prices, hours.")}>
                            {data.places.length === 0 ? (
                                <p className="text-sm text-muted">{tr("Aucune fiche ouverte sur la période.", "No place page opened in this period.")}</p>
                            ) : (
                                <Ranking
                                    rows={data.places.slice(0, 10).map((row) => ({
                                        key: row.slug,
                                        label: row.name ?? row.slug,
                                        detail: [
                                            row.city ?? tr("Lieu introuvable", "Place not found"),
                                            tr(`${number(row.visitors)} visiteur${plural(row.visitors)}`, `${number(row.visitors)} visitor${row.visitors === 1 ? "" : "s"}`),
                                            row.directions > 0 ? tr(`${number(row.directions)} itinéraire${plural(row.directions)}`, `${number(row.directions)} directions`) : null,
                                        ]
                                            .filter(Boolean)
                                            .join(" · "),
                                        value: row.views,
                                        href: row.id ? `/admin/spots/${row.id}` : undefined,
                                    }))}
                                />
                            )}
                        </Card>

                        <Card title={tr("Articles les plus lus", "Most read articles")} hint={tr("Lectures des articles du blog.", "Reads of the blog's articles.")}>
                            {data.articles.length === 0 ? (
                                <p className="text-sm text-muted">{tr("Aucun article lu sur la période.", "No article read in this period.")}</p>
                            ) : (
                                <Ranking
                                    rows={data.articles.map((row) => ({
                                        key: row.slug,
                                        label: row.title ?? row.slug,
                                        detail: tr(`${number(row.readers)} lecteur${plural(row.readers)}`, `${number(row.readers)} reader${row.readers === 1 ? "" : "s"}`),
                                        value: row.views,
                                    }))}
                                />
                            )}
                        </Card>

                        <Card title={tr("Villes", "Cities")} hint={tr("Visiteurs par ville explorée.", "Visitors per city explored.")}>
                            {data.cities.length === 0 ? (
                                <p className="text-sm text-muted">{tr("Aucune ville explorée sur la période.", "No city explored in this period.")}</p>
                            ) : (
                                <Ranking
                                    rows={data.cities.slice(0, 10).map((row) => ({
                                        key: row.city,
                                        label: cityBySlug(row.city)?.name ?? row.city,
                                        detail: tr(`${number(row.returned)} revenu${plural(row.returned)} · ${number(row.views)} pages vues`, `${number(row.returned)} returning · ${number(row.views)} page views`),
                                        value: row.visitors,
                                        href: `/admin/spots?city=${row.city}`,
                                    }))}
                                />
                            )}
                        </Card>

                        <div className="flex min-w-0 flex-col gap-4">
                            <Card title={tr("Pages les plus vues", "Most viewed pages")}>
                                <Ranking rows={data.pages.slice(0, 6).map((row) => ({ key: row.page, label: PAGE_LABELS[row.page] ? tr(...PAGE_LABELS[row.page]) : row.page, value: row.views }))} />
                            </Card>

                            <Card title={tr("Langue et appareil", "Language and device")} hint={tr("Part des visiteurs.", "Share of visitors.")}>
                                <div className="flex flex-col gap-3 text-sm font-semibold">
                                    <div>
                                        <p className="mb-1">{tr("En français", "In French")}</p>
                                        <Bar value={french} total={total(data.langs)} />
                                    </div>
                                    <div>
                                        <p className="mb-1">{tr("Sur téléphone", "On phones")}</p>
                                        <Bar value={phones} total={total(data.devices)} />
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>

                    <section className="a-card mt-6 flex gap-3.5 p-5 text-sm text-text-2">
                        <ShieldCheck size={20} strokeWidth={1.8} className="mt-0.5 shrink-0 text-good" />
                        <div>
                            <p className="font-bold text-ink">{tr("Comment c'est compté", "How it is counted")}</p>
                            <p className="mt-1 leading-relaxed">
                                {tr(
                                    "Une page n'est comptée que lorsqu'une personne touche l'écran, clique, tape ou bouge la souris : un robot qui charge la page sans rien faire n'apparaît jamais. Les appareils de l'équipe (ceux qui ont ouvert cet espace) ne sont pas comptés non plus. Tout est anonyme : pas de nom, pas d'adresse IP, pas de position.",
                                    "A page only counts once a person touches the screen, clicks, types or moves the mouse: a robot that loads the page and does nothing never shows up. The team's devices (those that have opened this console) are not counted either. Everything is anonymous: no name, no IP address, no position."
                                )}
                            </p>
                            {data.partial && <p className="mt-1 font-semibold text-warn">{tr("Période très chargée : les visites les plus anciennes ne sont pas toutes prises en compte dans le détail.", "Very busy period: the oldest visits are not all included in the detail.")}</p>}
                        </div>
                    </section>

                    <Link href="/admin/recherches" className="a-btn a-btn-soft mt-6">
                        <Search size={16} />
                        {tr("Voir ce que les visiteurs cherchent", "See what visitors search for")}
                    </Link>
                </div>
            )}
        </>
    );
}
