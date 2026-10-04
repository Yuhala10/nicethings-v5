"use client";

import { useState } from "react";
import Link from "next/link";
import { Database, Eye, Repeat2, Search, UserPlus, Users } from "lucide-react";
import { adminLang, useTr } from "@/components/admin/i18n";
import { Bar, Empty, PageHeader, Skeleton, Stat, formatCount, useAdminData } from "@/components/admin/ui";
import type { PageKind } from "@/lib/analytics";
import { cityBySlug } from "@/lib/cities";

type Day = { day: string; views: number; visitors: number; returned: number };
type Audience = {
    setup?: boolean;
    views: number;
    visitors: number;
    returned: number;
    fresh: number;
    perDay: Day[];
    cities: { city: string; views: number; visitors: number; returned: number }[];
    pages: { page: PageKind; views: number; visitors: number }[];
    places: { slug: string; id: string | null; name: string | null; city: string | null; views: number; visitors: number }[];
    sources: { source: string; visits: number }[];
    langs: { lang: string; visitors: number }[];
    devices: { device: string; visitors: number }[];
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

// Returning visitors carry the accent; first-time visitors stay neutral.
const RETURNED = "#ea4f16";
const FRESH = "#a89c8e";

const number = formatCount;
const percent = (value: number, total: number) => (total ? Math.round((value / total) * 100) : 0);
const dayLabel = (day: string, long = false) =>
    new Date(`${day}T12:00:00Z`).toLocaleDateString(adminLang() === "en" ? "en-GB" : "fr-FR", long ? { weekday: "long", day: "numeric", month: "long" } : { day: "numeric", month: "short" });

// A round number just above the busiest day, for the top of the scale.
function niceMax(value: number) {
    if (value <= 4) return 4;
    const step = 10 ** Math.floor(Math.log10(value));
    return [1, 2, 4, 5, 10].map((factor) => factor * step).find((top) => top >= value)!;
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
                    <h2 className="text-lg font-extrabold">{tr("Visiteurs par jour", "Visitors per day")}</h2>
                    <p className="text-sm text-muted" aria-live="polite">
                        <span className="inline-block font-bold text-ink first-letter:uppercase">{dayLabel(shown.day, true)}</span>
                        {" : "}
                        {tr(
                            `${number(shown.visitors)} visiteur${shown.visitors > 1 ? "s" : ""}, dont ${number(shown.returned)} déjà venu${shown.returned > 1 ? "s" : ""} · ${number(shown.views)} pages vues`,
                            `${number(shown.visitors)} visitor${shown.visitors === 1 ? "" : "s"}, ${number(shown.returned)} returning · ${number(shown.views)} page views`
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
                                <th className="py-2 text-right font-bold">{tr("Pages vues", "Page views")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...perDay].reverse().map((day) => (
                                <tr key={day.day} className="border-t border-line">
                                    <td className="py-2 font-semibold">{dayLabel(day.day)}</td>
                                    <td className="py-2 text-right">{number(day.visitors)}</td>
                                    <td className="py-2 text-right">{number(day.returned)}</td>
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
            <h2 className="text-lg font-extrabold">{title}</h2>
            {hint && <p className="text-sm text-muted">{hint}</p>}
            <div className="mt-4">{children}</div>
        </section>
    );
}

// Who visits, from where, and who comes back. What to improve next comes
// from here and from the "Recherches" page.
export default function AudiencePage() {
    const tr = useTr();
    const [days, setDays] = useState(30);
    const { data, error, loading } = useAdminData<Audience>(`audience?days=${days}`);
    const total = (rows: { visitors: number }[]) => rows.reduce((sum, row) => sum + row.visitors, 0);
    const french = data?.langs?.find((row) => row.lang === "fr")?.visitors ?? 0;
    const phones = data?.devices?.find((row) => row.device === "mobile")?.visitors ?? 0;

    return (
        <>
            <PageHeader
                title="Audience"
                subtitle={tr("Qui visite NiceThings, dans quelle ville, et qui revient. Anonyme, sans les visites de l'équipe.", "Who visits NiceThings, in which city, and who comes back. Anonymous, team visits excluded.")}
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
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-[8.5rem]" />)}
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
                    body={tr("Les visites apparaissent ici dès que quelqu'un ouvre le site. Celles de l'équipe (connectée à cet espace) ne sont pas comptées.", "Visits show up here as soon as someone opens the site. The team's own visits (signed in here) are not counted.")}
                />
            ) : (
                <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
                    <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <Stat icon={Users} label={tr("Visiteurs", "Visitors")} value={number(data.visitors)} hint={tr(`sur ${days} jours`, `over ${days} days`)} tone="brand" />
                        <Stat icon={UserPlus} label={tr("Nouveaux visiteurs", "New visitors")} value={number(data.fresh)} hint={tr("première visite sur la période", "first visit in this period")} />
                        <Stat
                            icon={Repeat2}
                            label={tr("Sont revenus", "Came back")}
                            value={number(data.returned)}
                            hint={tr(`${percent(data.returned, data.visitors)}% des visiteurs, un autre jour`, `${percent(data.returned, data.visitors)}% of visitors, on another day`)}
                            tone="good"
                        />
                        <Stat
                            icon={Eye}
                            label={tr("Pages vues", "Page views")}
                            value={number(data.views)}
                            hint={tr(
                                `${(data.views / data.visitors).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} par visiteur`,
                                `${(data.views / data.visitors).toLocaleString("en-GB", { maximumFractionDigits: 1 })} per visitor`
                            )}
                        />
                    </section>

                    <DailyChart perDay={data.perDay} />

                    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <Card title={tr("Villes", "Cities")} hint={tr("Visiteurs par ville explorée.", "Visitors per city explored.")}>
                            {data.cities.length === 0 ? (
                                <p className="text-sm text-muted">{tr("Aucune ville explorée sur la période.", "No city explored in this period.")}</p>
                            ) : (
                                <Ranking
                                    rows={data.cities.map((row) => ({
                                        key: row.city,
                                        label: cityBySlug(row.city)?.name ?? row.city,
                                        detail: tr(
                                            `${number(row.returned)} revenu${row.returned > 1 ? "s" : ""} · ${number(row.views)} pages vues`,
                                            `${number(row.returned)} returning · ${number(row.views)} page views`
                                        ),
                                        value: row.visitors,
                                        href: `/admin/spots?city=${row.city}`,
                                    }))}
                                />
                            )}
                        </Card>

                        <Card title={tr("D'où viennent les visites", "Where visits come from")} hint={tr("Compté à l'arrivée sur le site. « Direct » : lien WhatsApp, favori ou adresse tapée.", "Counted on arrival. “Direct”: WhatsApp link, bookmark or typed address.")}>
                            <Ranking
                                rows={data.sources.map((row) => ({
                                    key: row.source,
                                    label: row.source === "app" ? tr("Application installée", "Installed app") : (SOURCE_LABELS[row.source] ?? row.source),
                                    value: row.visits,
                                }))}
                            />
                        </Card>

                        <Card title={tr("Lieux les plus vus", "Most viewed places")} hint={tr("Les fiches à soigner en premier : photos, prix, horaires.", "The listings to polish first: photos, prices, hours.")}>
                            {data.places.length === 0 ? (
                                <p className="text-sm text-muted">{tr("Aucune fiche ouverte sur la période.", "No place page opened in this period.")}</p>
                            ) : (
                                <Ranking
                                    rows={data.places.map((row) => ({
                                        key: row.slug,
                                        label: row.name ?? row.slug,
                                        detail: row.city ?? tr("Lieu introuvable", "Place not found"),
                                        value: row.views,
                                        href: row.id ? `/admin/spots/${row.id}` : undefined,
                                    }))}
                                />
                            )}
                        </Card>

                        <div className="flex min-w-0 flex-col gap-4">
                            <Card title={tr("Pages les plus vues", "Most viewed pages")}>
                                <Ranking rows={data.pages.map((row) => ({ key: row.page, label: PAGE_LABELS[row.page] ? tr(...PAGE_LABELS[row.page]) : row.page, value: row.views }))} />
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

                    <Link href="/admin/recherches" className="a-btn a-btn-soft mt-6">
                        <Search size={16} />
                        {tr("Voir ce que les visiteurs cherchent", "See what visitors search for")}
                    </Link>
                </div>
            )}
        </>
    );
}
