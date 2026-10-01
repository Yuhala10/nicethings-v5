"use client";

import { useState } from "react";
import Link from "next/link";
import { Database, Eye, Repeat2, Search, UserPlus, Users } from "lucide-react";
import { Bar, Empty, PageHeader, Skeleton, Stat, useAdminData } from "@/components/admin/ui";
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

const PAGE_LABELS: Record<PageKind, string> = {
    landing: "Accueil",
    city: "Guide d'une ville",
    guide: "Guide quartier ou catégorie",
    search: "Recherche",
    map: "Carte",
    place: "Fiche d'un lieu",
    directions: "Itinéraire",
    saved: "Favoris",
    submit: "Proposer un lieu",
    other: "Autres pages",
};

const SOURCE_LABELS: Record<string, string> = {
    direct: "Direct (lien WhatsApp, favori, adresse tapée)",
    app: "Application installée",
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

const number = (value: number) => value.toLocaleString("fr-FR");
const percent = (value: number, total: number) => (total ? Math.round((value / total) * 100) : 0);
const dayLabel = (day: string, long = false) =>
    new Date(`${day}T12:00:00Z`).toLocaleDateString("fr-FR", long ? { weekday: "long", day: "numeric", month: "long" } : { day: "numeric", month: "short" });

// A round number just above the busiest day, for the top of the scale.
function niceMax(value: number) {
    if (value <= 4) return 4;
    const step = 10 ** Math.floor(Math.log10(value));
    return [1, 2, 4, 5, 10].map((factor) => factor * step).find((top) => top >= value)!;
}

function DailyChart({ perDay }: { perDay: Day[] }) {
    const [active, setActive] = useState<number | null>(null);
    const top = niceMax(Math.max(...perDay.map((day) => day.visitors)));
    const shown = perDay[active ?? perDay.length - 1];
    const height = (value: number) => `${(value / top) * 100}%`;

    return (
        <section className="a-card mt-6 p-5">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                <div>
                    <h2 className="text-lg font-extrabold">Visiteurs par jour</h2>
                    <p className="text-sm text-muted" aria-live="polite">
                        <span className="inline-block font-bold text-ink first-letter:uppercase">{dayLabel(shown.day, true)}</span>
                        {" : "}
                        {number(shown.visitors)} visiteur{shown.visitors > 1 ? "s" : ""}, dont{" "}
                        {number(shown.returned)} déjà venu{shown.returned > 1 ? "s" : ""} · {number(shown.views)} pages vues
                    </p>
                </div>
                <ul className="flex gap-4 text-xs font-semibold text-text-2">
                    <li className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: RETURNED }} />
                        Déjà venus
                    </li>
                    <li className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: FRESH }} />
                        Première visite
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
                                    aria-label={`${dayLabel(day.day, true)} : ${day.visitors} visiteurs, dont ${day.returned} déjà venus`}
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
                <summary className="cursor-pointer font-bold text-text-2">Voir les chiffres jour par jour</summary>
                <div className="mt-3 max-h-72 overflow-auto">
                    <table className="w-full text-sm tabular-nums">
                        <thead>
                            <tr className="text-left text-xs text-muted">
                                <th className="py-2 font-bold">Jour</th>
                                <th className="py-2 text-right font-bold">Visiteurs</th>
                                <th className="py-2 text-right font-bold">Déjà venus</th>
                                <th className="py-2 text-right font-bold">Pages vues</th>
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
    const [days, setDays] = useState(30);
    const { data, error, loading } = useAdminData<Audience>(`audience?days=${days}`);
    const total = (rows: { visitors: number }[]) => rows.reduce((sum, row) => sum + row.visitors, 0);
    const french = data?.langs?.find((row) => row.lang === "fr")?.visitors ?? 0;
    const phones = data?.devices?.find((row) => row.device === "mobile")?.visitors ?? 0;

    return (
        <>
            <PageHeader
                title="Audience"
                subtitle="Qui visite NiceThings, dans quelle ville, et qui revient. Anonyme, sans les visites de l'équipe."
                actions={
                    <div className="flex gap-1.5">
                        {[7, 30, 90].map((value) => (
                            <button key={value} type="button" className="a-chip" aria-pressed={days === value} onClick={() => setDays(value)}>
                                {value} jours
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
                    <p className="font-bold">Une dernière étape pour activer les statistiques</p>
                    <ol className="mt-3 max-w-md list-decimal pl-5 text-left text-sm text-text-2">
                        <li>Ouvre ton projet sur supabase.com, puis « SQL Editor ».</li>
                        <li>
                            Colle tout le contenu du fichier <span className="font-mono text-xs font-bold">database/migrations/002_analytics.sql</span>.
                        </li>
                        <li>Clique sur « Run ». Les visites sont comptées à partir de ce moment.</li>
                    </ol>
                </div>
            ) : data.views === 0 ? (
                <Empty
                    title="Pas encore de visites"
                    body="Les visites apparaissent ici dès que quelqu'un ouvre le site. Celles de l'équipe (connectée à cet espace) ne sont pas comptées."
                />
            ) : (
                <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
                    <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <Stat icon={Users} label="Visiteurs" value={number(data.visitors)} hint={`sur ${days} jours`} tone="brand" />
                        <Stat icon={UserPlus} label="Nouveaux visiteurs" value={number(data.fresh)} hint="première visite sur la période" />
                        <Stat
                            icon={Repeat2}
                            label="Sont revenus"
                            value={number(data.returned)}
                            hint={`${percent(data.returned, data.visitors)}% des visiteurs, un autre jour`}
                            tone="good"
                        />
                        <Stat icon={Eye} label="Pages vues" value={number(data.views)} hint={`${(data.views / data.visitors).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} par visiteur`} />
                    </section>

                    <DailyChart perDay={data.perDay} />

                    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <Card title="Villes" hint="Visiteurs par ville explorée.">
                            {data.cities.length === 0 ? (
                                <p className="text-sm text-muted">Aucune ville explorée sur la période.</p>
                            ) : (
                                <Ranking
                                    rows={data.cities.map((row) => ({
                                        key: row.city,
                                        label: cityBySlug(row.city)?.name ?? row.city,
                                        detail: `${number(row.returned)} revenu${row.returned > 1 ? "s" : ""} · ${number(row.views)} pages vues`,
                                        value: row.visitors,
                                        href: `/admin/spots?city=${row.city}`,
                                    }))}
                                />
                            )}
                        </Card>

                        <Card title="D'où viennent les visites" hint="Compté à l'arrivée sur le site.">
                            <Ranking rows={data.sources.map((row) => ({ key: row.source, label: SOURCE_LABELS[row.source] ?? row.source, value: row.visits }))} />
                        </Card>

                        <Card title="Lieux les plus vus" hint="Les fiches à soigner en premier : photos, prix, horaires.">
                            {data.places.length === 0 ? (
                                <p className="text-sm text-muted">Aucune fiche ouverte sur la période.</p>
                            ) : (
                                <Ranking
                                    rows={data.places.map((row) => ({
                                        key: row.slug,
                                        label: row.name ?? row.slug,
                                        detail: row.city ?? "Lieu introuvable",
                                        value: row.views,
                                        href: row.id ? `/admin/spots/${row.id}` : undefined,
                                    }))}
                                />
                            )}
                        </Card>

                        <div className="flex min-w-0 flex-col gap-4">
                            <Card title="Pages les plus vues">
                                <Ranking rows={data.pages.map((row) => ({ key: row.page, label: PAGE_LABELS[row.page] ?? row.page, value: row.views }))} />
                            </Card>

                            <Card title="Langue et appareil" hint="Part des visiteurs.">
                                <div className="flex flex-col gap-3 text-sm font-semibold">
                                    <div>
                                        <p className="mb-1">En français</p>
                                        <Bar value={french} total={total(data.langs)} />
                                    </div>
                                    <div>
                                        <p className="mb-1">Sur téléphone</p>
                                        <Bar value={phones} total={total(data.devices)} />
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>

                    <Link href="/admin/recherches" className="a-btn a-btn-soft mt-6">
                        <Search size={16} />
                        Voir ce que les visiteurs cherchent
                    </Link>
                </div>
            )}
        </>
    );
}
