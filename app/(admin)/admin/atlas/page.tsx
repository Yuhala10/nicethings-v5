"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Database, ExternalLink, MapPinned, Pause, Play, RefreshCw, ScanSearch, TriangleAlert, Undo2, Wand2, X } from "lucide-react";
import { useTr } from "@/components/admin/i18n";
import { Empty, PageHeader, Skeleton, Stat, formatCount, timeAgo, useAdminData, useAdminToast } from "@/components/admin/ui";
import { adminPost } from "@/lib/admin-client";

type Tr = (fr: string, en: string) => string;
type PlaceRef = { name: string; slug: string | null } | null;
type Source = { url: string; title: string };
type Action = {
    id: string;
    kind: string;
    spot_id: string | null;
    title: string;
    detail?: string | null;
    evidence: Source[];
    after: Record<string, unknown> | null;
    created_at: string;
    place: PlaceRef;
};
type Ref = { id: string; name: string; since?: string };
// What a check saw, by check (lib/atlas/quality.ts): each uses a few of these.
type Evidence = {
    code: string;
    place?: Ref;
    a?: Ref;
    b?: Ref;
    examples?: Ref[];
    post?: { id: string; title: string };
    city?: string;
    actual?: string | null;
    meters?: number;
    km?: number;
    days?: number;
    min?: number | null;
    max?: number | null;
    count?: number;
    years?: number;
    slugs?: string[];
    query?: string;
    times?: number;
    path?: string;
    status?: number;
    cities?: { city: string; count: number }[];
    browser?: string;
    system?: string;
    ref?: string | null;
    message?: string | null;
};
type Issue = {
    id: string;
    area: string;
    severity: "minor" | "normal" | "serious";
    title: string;
    detail: string | null;
    evidence: Evidence;
    times_seen: number;
    first_seen_at: string;
};
type State = {
    setup: boolean;
    paused?: boolean;
    lastRun?: { status: string; stats: Record<string, number>; error: string | null; started_at: string; finished_at: string | null } | null;
    proposed?: Action[];
    recent?: Action[];
    issues?: Issue[];
};

const FIELDS: Record<string, [string, string]> = {
    phone: ["téléphone", "phone"],
    whatsapp: ["WhatsApp", "WhatsApp"],
    website: ["site web", "website"],
    instagram: ["Instagram", "Instagram"],
    cuisine: ["cuisine", "cuisine"],
    opening_time: ["horaires", "opening hours"],
};

// What Atlas writes is kept in French; the console says it in the reader's
// language from what each line is about.
function actionText(action: Action, tr: Tr): { title: string; detail: string | null } {
    const name = action.place?.name ?? "";
    if (action.kind === "place.hide") {
        return {
            title: tr(action.title, `Take “${name}” off the site?`),
            detail: tr(
                action.detail ?? "",
                "The contributors of OpenStreetMap have removed this place from the map or marked it as closed. It may have closed, or it may have been redrawn in another form."
            ),
        };
    }
    if (action.kind === "place.duplicate") {
        return {
            title: tr(action.title, `“${name}” duplicates “${action.evidence[0]?.title ?? ""}”: take this listing off the site?`),
            detail: tr(action.detail ?? "", "Same kind of place, same name, a few metres apart. The listing that stays is the fuller one."),
        };
    }
    if (action.kind === "place.clean") return { title: tr(action.title, `“${name}”: unusable phone number removed`), detail: null };
    if (action.kind === "place.unnamed") {
        return {
            title: tr(action.title, `“${name}” moved back to drafts: it is not the name of a place`),
            detail: tr(action.detail ?? "", "The open map gives a kind of place where the name should be. The listing waits for its real name among the drafts."),
        };
    }
    if (action.kind === "place.private") {
        return {
            title: tr(action.title, `“${name}” moved back to drafts: it looks like a private home`),
            detail: tr(action.detail ?? "", "The open map files this plot or house among the gardens. It is not a place to send visitors to."),
        };
    }
    if (action.kind === "city.areas") {
        const after = action.after as { city?: string; count?: number; groups?: Record<string, string[]> } | null;
        const largest = Object.entries(after?.groups ?? {})
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 6)
            .map(([area, ids]) => `${area} (${ids.length})`)
            .join(", ");
        return {
            title: tr(action.title, `${after?.city}: ${after?.count} places given a neighbourhood from the open map`),
            detail: tr(action.detail ?? "", `${largest}. Each place takes the nearest neighbourhood the map knows, within 700 m. Undo takes them all back.`),
        };
    }
    if (action.kind === "place.fill") {
        const fields = Object.keys(action.after ?? {})
            .map((key) => FIELDS[key]?.[1])
            .filter(Boolean)
            .join(", ");
        return { title: tr(action.title, `“${name}”: ${fields} added from the map`), detail: null };
    }
    return { title: action.title, detail: action.detail ?? null };
}

function issueText(issue: Issue, tr: Tr): { title: string; detail: string | null } {
    const e = issue.evidence;
    const place = e.place?.name;
    const post = e.post?.title;
    // For what a visitor's browser reported: where it happened.
    const seenOn = [e.path && `Page: ${e.path}`, e.ref && `arriving from ${e.ref}`].filter(Boolean).join(" · ") || null;
    const english: Record<string, () => [string, string | null]> = {
        duplicate: () => [`Likely duplicate: “${e.a?.name}” and “${e.b?.name}” (${e.city})`, `Same name, ${e.meters} m apart.`],
        "generic-name": () => [`“${place}” (${e.city}) is not the name of a place`, "The open map gives a kind of place where the name should be. It needs the real name, or the listing should come down."],
        "outside-city": () => [`“${place}” is filed under ${e.city} but sits ${e.km} km from its centre`, e.actual ? `Its position is in ${e.actual}.` : "Its position is outside every covered city."],
        "verified-stale": () => [`“${place}” has the blue tick but has not been re-checked for ${e.days} days`, null],
        "price-odd": () => [`Prices to review for “${place}”: ${e.min ?? "?"} – ${e.max ?? "?"} FCFA`, null],
        "aged-source": () => [`${e.city}: ${e.count} listings rest on a map entry unchanged for more than ${e.years} years`, "These are the places to check first: the likeliest to have closed or moved."],
        "phone-unreadable": () => [`${e.city}: ${e.count} unreadable phone number(s) (the Call button does not show)`, null],
        "hours-half": () => [`${e.city}: ${e.count} listing(s) with an opening time but no closing time, or the reverse`, null],
        "no-neighbourhood": () => [`${e.city}: ${e.count} published place(s) without a neighbourhood`, null],
        "cities-without-areas": () => [
            `${e.count} cities have almost no neighbourhood filled in`,
            `${(e.cities ?? []).map((item) => `${item.city} (${item.count})`).join(", ")}. People cannot search or browse by neighbourhood there.`,
        ],
        "article-language": () => [`The article “${post}” is in English in the French fields`, "French readers and Google receive it as a French page written in English. It needs a French version, with the English in the English fields."],
        "article-no-cover": () => [`The article “${post}” has no cover image`, null],
        "article-missing-place": () => [`The article “${post}” mentions ${e.slugs?.length ?? 0} place(s) no longer online`, (e.slugs ?? []).join(", ")],
        "search-no-result": () => [`“${e.query}” was searched ${e.times} times and found nothing`, "A place or kind of place people expect and NiceThings does not have."],
        "health-styles-missing": () => [`Page shown without its design on ${e.browser} (${e.system})`, seenOn],
        "health-translated": () => [`Page machine-translated by the browser (${e.browser}, ${e.system})`, seenOn],
        "health-script-error": () => [`Script error on ${e.browser} (${e.system})`, [e.message, seenOn].filter(Boolean).join(" · ")],
        "health-no-js": () => [`Visit without JavaScript (${e.browser}, ${e.system})`, seenOn],
        "page-down": () => [`The page ${e.path} is not answering properly`, e.status ? `Server answered: ${e.status}.` : "No answer within 12 seconds."],
    };
    const [title, detail] = english[issue.evidence.code]?.() ?? [issue.title, issue.detail];
    return { title: tr(issue.title, title), detail: tr(issue.detail ?? "", detail ?? "") || null };
}

// The places and articles an issue points at, as links into the console.
function issueLinks(issue: Issue) {
    const e = issue.evidence;
    const places = [e.place, e.a, e.b, ...(e.examples ?? [])].filter((place): place is Ref => Boolean(place));
    return { places, post: e.post };
}

const AREAS: [string, [string, string]][] = [
    ["all", ["Tout", "All"]],
    ["catalogue", ["Catalogue", "Catalogue"]],
    ["content", ["Articles", "Articles"]],
    ["search", ["Recherche", "Search"]],
    ["pages", ["Pages", "Pages"]],
    ["health", ["Navigateurs", "Browsers"]],
];
const SEVERITY = { serious: 0, normal: 1, minor: 2 } as const;

// Atlas's control room: what it did last night, what waits for a yes or a
// no, and the problems it wrote down on the platform.
export default function AtlasPage() {
    const tr = useTr();
    const toast = useAdminToast();
    const { data, loading, reload } = useAdminData<State>("atlas");
    const [busy, setBusy] = useState<string | null>(null);
    const [area, setArea] = useState("all");

    const act = async (action: string, id?: string, done?: string) => {
        setBusy(id ?? action);
        try {
            await adminPost("atlas", { action, ...(id && { id }) });
            if (done) toast(done);
            await reload();
        } catch (error) {
            toast((error as Error).message, true);
        } finally {
            setBusy(null);
        }
    };

    const stats = data?.lastRun?.stats ?? {};
    const issues = [...(data?.issues ?? [])].sort((a, b) => SEVERITY[a.severity] - SEVERITY[b.severity]);
    const shown = issues.filter((issue) => area === "all" || issue.area === area);

    return (
        <>
            <PageHeader
                title="Atlas"
                subtitle={tr(
                    "L'opérateur de NiceThings. Chaque nuit, il compare le catalogue à la carte ouverte, complète ce qu'il peut prouver et note ce qui ne va pas sur la plateforme.",
                    "The operator of NiceThings. Every night it compares the catalogue with the open map, fills in what it can prove and writes down what is wrong on the platform."
                )}
                actions={
                    data &&
                    !data.setup && (
                        <>
                            <button type="button" onClick={() => act("run", undefined, tr("Passage terminé", "Shift finished"))} disabled={busy !== null} className="a-btn a-btn-primary">
                                <RefreshCw size={17} className={busy === "run" ? "animate-spin" : ""} />
                                {busy === "run" ? tr("Atlas travaille…", "Atlas is working…") : tr("Lancer un passage", "Run a shift now")}
                            </button>
                            <button type="button" onClick={() => act(data.paused ? "resume" : "pause")} disabled={busy !== null} className="a-btn a-btn-soft">
                                {data.paused ? <Play size={17} /> : <Pause size={17} />}
                                {data.paused ? tr("Reprendre", "Resume") : tr("Mettre en pause", "Pause")}
                            </button>
                        </>
                    )
                }
            />

            {loading && !data ? (
                <div className="grid gap-3">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-64" />
                </div>
            ) : data?.setup ? (
                <div className="a-card flex flex-col items-center px-6 py-12 text-center">
                    <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
                        <Database size={22} />
                    </span>
                    <p className="font-bold">{tr("Une dernière étape pour réveiller Atlas", "One last step to wake Atlas up")}</p>
                    <p className="mt-2 max-w-md text-sm text-text-2">
                        {tr("Dans Supabase, ouvre « SQL Editor », colle tout le fichier", "In Supabase, open “SQL Editor”, paste the whole file")}{" "}
                        <span className="font-mono text-xs font-bold">database/migrations/004_atlas.sql</span> {tr("et clique sur « Run ».", "and click “Run”.")}
                    </p>
                </div>
            ) : (
                <>
                    {data?.paused && (
                        <p className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-warn">
                            <Pause size={16} />
                            {tr("Atlas est en pause : il ne fera rien cette nuit.", "Atlas is paused: it will do nothing tonight.")}
                        </p>
                    )}

                    {/* ---------------- The last shift ---------------- */}
                    {data?.lastRun ? (
                        <section>
                            <p className="a-eyebrow mb-3">
                                {tr("Dernier passage", "Last shift")} · {timeAgo(data.lastRun.started_at)}
                                {data.lastRun.status === "failed" && <span className="ml-2 text-bad">{tr("interrompu", "interrupted")}</span>}
                            </p>
                            {data.lastRun.status === "failed" && <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-bad">{data.lastRun.error}</p>}
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                <Stat
                                    icon={MapPinned}
                                    label={tr("Lieux comparés à la carte", "Places compared with the map")}
                                    value={formatCount(stats.map_answered ?? 0)}
                                    hint={tr(`sur ${formatCount(stats.published ?? 0)} publiés`, `of ${formatCount(stats.published ?? 0)} published`)}
                                />
                                <Stat
                                    icon={Wand2}
                                    tone="good"
                                    label={tr("Fiches complétées ou corrigées", "Listings filled in or put right")}
                                    value={formatCount((stats.filled ?? 0) + (stats.cleaned ?? 0) + (stats.arranged ?? 0))}
                                    hint={tr("à ce passage", "on that shift")}
                                />
                                <Stat icon={ScanSearch} tone="brand" label={tr("À valider", "Waiting for you")} value={formatCount(data.proposed?.length ?? 0)} />
                                <Stat
                                    icon={TriangleAlert}
                                    tone="warn"
                                    label={tr("Problèmes ouverts", "Open problems")}
                                    value={formatCount(issues.length)}
                                    hint={tr(`${stats.issues_new ?? 0} nouveaux · ${stats.issues_fixed ?? 0} réglés`, `${stats.issues_new ?? 0} new · ${stats.issues_fixed ?? 0} fixed`)}
                                />
                            </div>
                            {stats.map_suspicious === 1 && (
                                <p className="mt-3 text-sm text-muted">
                                    {tr(
                                        "La carte a répondu de façon anormale cette nuit-là : Atlas n'a proposé aucun retrait.",
                                        "The map answered abnormally that night: Atlas proposed no removal."
                                    )}
                                </p>
                            )}
                        </section>
                    ) : (
                        <Empty
                            title={tr("Atlas n'a pas encore travaillé", "Atlas has not worked yet")}
                            body={tr("Lance un premier passage : il prend moins d'une minute.", "Run a first shift: it takes less than a minute.")}
                        />
                    )}

                    {/* ---------------- Waiting for a decision ---------------- */}
                    {(data?.proposed?.length ?? 0) > 0 && (
                        <section className="mt-8">
                            <h2 className="a-serif mb-3 text-[1.7rem]">{tr("À valider", "Waiting for you")}</h2>
                            <ul className="grid gap-3">
                                {data!.proposed!.map((action) => {
                                    const text = actionText(action, tr);
                                    return (
                                        <li key={action.id} className="a-card min-w-0 p-4 md:p-5">
                                            <p className="font-bold">{text.title}</p>
                                            {text.detail && <p className="mt-1 text-sm leading-relaxed text-text-2">{text.detail}</p>}
                                            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                                                {action.evidence.map((source) => (
                                                    <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-600">
                                                        {action.kind === "place.duplicate" ? tr("Comparer", "Compare") : tr("Voir la preuve", "See the proof")} · {source.title}
                                                        <ExternalLink size={12} />
                                                    </a>
                                                ))}
                                                {action.spot_id && (
                                                    <Link href={`/admin/spots/${action.spot_id}`} className="font-semibold text-text-2 underline">
                                                        {tr("Ouvrir la fiche", "Open the listing")}
                                                    </Link>
                                                )}
                                            </p>
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <button type="button" onClick={() => act("approve", action.id, tr("Appliqué", "Applied"))} disabled={busy !== null} className="a-btn a-btn-primary h-10 px-4 text-sm">
                                                    <Check size={16} />
                                                    {tr("Oui, appliquer", "Yes, apply")}
                                                </button>
                                                <button type="button" onClick={() => act("decline", action.id, tr("Refusé : Atlas ne le reproposera pas", "Declined: Atlas will not propose it again"))} disabled={busy !== null} className="a-btn a-btn-soft h-10 px-4 text-sm">
                                                    <X size={16} />
                                                    {tr("Non", "No")}
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    )}

                    {/* ---------------- Done by Atlas ---------------- */}
                    {(data?.recent?.length ?? 0) > 0 && (
                        <section className="a-card mt-8 min-w-0 p-5">
                            <h2 className="a-serif text-[1.55rem]">{tr("Fait par Atlas", "Done by Atlas")}</h2>
                            <p className="text-sm text-muted">{tr("Chaque changement peut être annulé : la fiche redevient exactement comme avant.", "Every change can be undone: the listing goes back exactly as it was.")}</p>
                            <ul className="mt-3 divide-y divide-line">
                                {data!.recent!.map((action) => (
                                    <li key={action.id} className="flex items-center gap-3 py-3">
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-semibold">{actionText(action, tr).title}</span>
                                            <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
                                                {timeAgo(action.created_at)}
                                                {action.evidence[0] && (
                                                    <a href={action.evidence[0].url} target="_blank" rel="noreferrer" className="font-semibold text-brand-600">
                                                        {tr("preuve", "proof")}
                                                    </a>
                                                )}
                                                {action.spot_id && (
                                                    <Link href={`/admin/spots/${action.spot_id}`} className="underline">
                                                        {tr("fiche", "listing")}
                                                    </Link>
                                                )}
                                            </span>
                                        </span>
                                        <button type="button" onClick={() => act("undo", action.id, tr("Annulé", "Undone"))} disabled={busy !== null} className="a-btn a-btn-soft h-9 shrink-0 px-3 text-xs">
                                            <Undo2 size={14} />
                                            {tr("Annuler", "Undo")}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* ---------------- Problems on the platform ---------------- */}
                    {data?.lastRun && (
                        <section className="mt-8">
                            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                                <div>
                                    <h2 className="a-serif text-[1.7rem]">{tr("Problèmes repérés", "Problems found")}</h2>
                                    <p className="text-sm text-muted">{tr("Ce qui ne va pas ou reste à finir. Un problème réglé disparaît tout seul au passage suivant.", "What is wrong or unfinished. A problem that gets fixed disappears by itself at the next shift.")}</p>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {AREAS.filter(([key]) => key === "all" || issues.some((issue) => issue.area === key)).map(([key, label]) => (
                                        <button key={key} type="button" className="a-chip" aria-pressed={area === key} onClick={() => setArea(key)}>
                                            {tr(...label)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {shown.length === 0 ? (
                                <Empty title={tr("Rien à signaler", "Nothing to report")} body={tr("Atlas n'a trouvé aucun problème ici.", "Atlas found no problem here.")} />
                            ) : (
                                <ul className="grid gap-3">
                                    {shown.map((issue) => {
                                        const text = issueText(issue, tr);
                                        const links = issueLinks(issue);
                                        return (
                                            <li key={issue.id} className="a-card min-w-0 p-4 md:p-5">
                                                <p className="flex items-start gap-2.5 font-bold">
                                                    <span className={`mt-[0.45rem] h-2.5 w-2.5 shrink-0 rounded-full ${issue.severity === "serious" ? "bg-bad" : issue.severity === "normal" ? "bg-warn" : "bg-line-strong"}`} />
                                                    <span className="min-w-0 [overflow-wrap:anywhere]">{text.title}</span>
                                                </p>
                                                {text.detail && <p className="mt-1 pl-5 text-sm leading-relaxed text-text-2">{text.detail}</p>}
                                                {(links.places.length > 0 || links.post) && (
                                                    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 pl-5 text-xs">
                                                        {links.places.map((place) => (
                                                            <Link key={place.id} href={`/admin/spots/${place.id}`} className="font-semibold text-brand-600">
                                                                {place.name}
                                                                {place.since ? ` (${place.since})` : ""}
                                                            </Link>
                                                        ))}
                                                        {links.post && (
                                                            <Link href={`/admin/blog/${links.post.id}`} className="font-semibold text-brand-600">
                                                                {tr("Ouvrir l'article", "Open the article")}
                                                            </Link>
                                                        )}
                                                    </p>
                                                )}
                                                <div className="mt-3 flex flex-wrap items-center gap-2 pl-5">
                                                    <button type="button" onClick={() => act("issue-dismiss", issue.id, tr("Ignoré", "Ignored"))} disabled={busy !== null} className="a-btn a-btn-soft h-9 px-3 text-xs">
                                                        {tr("Ignorer", "Ignore")}
                                                    </button>
                                                    <span className="text-xs text-muted">
                                                        {tr(`vu ${issue.times_seen} fois, depuis`, `seen ${issue.times_seen} time${issue.times_seen > 1 ? "s" : ""}, since`)} {timeAgo(issue.first_seen_at)}
                                                    </span>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </section>
                    )}

                    <p className="mt-10 text-xs leading-relaxed text-muted">
                        {tr(
                            "Atlas travaille pour l'instant sans service payant : la carte ouverte et ses propres vérifications. La recherche sur le web (lire la page d'un lieu, un menu en photo) s'ajoutera avec une clé d'accès.",
                            "For now Atlas works without any paid service: the open map and its own checks. Web research (reading a place's own page, a menu photo) will be added with an access key."
                        )}
                    </p>
                </>
            )}
        </>
    );
}
