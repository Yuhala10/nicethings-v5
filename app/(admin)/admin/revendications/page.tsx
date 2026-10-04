"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, BadgeCheck, Check, Database, FileText, Phone, ShieldCheck, Wrench, X } from "lucide-react";
import { useAdminLang, useTr } from "@/components/admin/i18n";
import { Empty, PageHeader, Skeleton, timeAgo, useAdminData, useAdminToast } from "@/components/admin/ui";
import { ScoreBadge } from "@/components/admin/claims";
import { adminPatch } from "@/lib/admin-client";
import { CATEGORIES } from "@/lib/tags";

type Row = {
    id: string;
    status: string;
    full_name: string;
    role: string;
    user_email: string | null;
    trust_score: number;
    risk_flags: { label: string }[];
    phone_verified_at: string | null;
    phone_code_requested_at: string | null;
    phone_code_sent_at: string | null;
    documents: unknown[];
    documents_checked_at: string | null;
    field_visit_at: string | null;
    submitted_at: string | null;
    updated_at: string;
    spot: { slug: string; name: string; city: string; neighborhood: string | null } | null;
};

type Request = {
    id: number;
    created_at: string;
    old_value: { name?: string; category?: string; address?: string | null };
    new_value: { name?: string | null; category?: string | null; address?: string | null; position?: { lat: number; lng: number } | null; note?: string | null };
    spot: { slug: string; name: string; city: string } | null;
};

const TABS = [
    ["open", "À traiter", "To review"],
    ["drafts", "En cours de saisie", "Being filled in"],
    ["approved", "Validées", "Approved"],
    ["closed", "Refusées / retirées", "Declined / withdrawn"],
] as const;

// Owners claiming their place, ranked by what needs the team now.
export default function ClaimsPage() {
    const tr = useTr();
    const { lang } = useAdminLang();
    const [tab, setTab] = useState<(typeof TABS)[number][0]>("open");
    const { data, loading } = useAdminData<{ rows: Row[]; setup?: boolean }>(`claims?filter=${tab}`);
    const requests = useAdminData<{ rows: Request[] }>("owner-requests");
    const toast = useAdminToast();

    const decide = async (id: number, action: "apply" | "reject") => {
        try {
            await adminPatch("owner-requests", { id, action });
            toast(action === "apply" ? tr("Correction appliquée ✓", "Correction applied ✓") : tr("Demande refusée", "Request declined"));
            void requests.reload();
        } catch (error) {
            toast((error as Error).message, true);
        }
    };

    return (
        <>
            <PageHeader
                title={tr("Revendications", "Owner claims")}
                subtitle={tr("Des propriétaires prouvent qu'un lieu est à eux. Rien n'est validé sans preuve forte.", "Owners prove a place is theirs. Nothing is approved without strong proof.")}
            />

            {(requests.data?.rows.length ?? 0) > 0 && (
                <section className="a-card mb-6 p-5">
                    <h2 className="a-serif mb-3 flex items-center gap-2 text-[1.55rem]">
                        <Wrench size={18} className="text-brand-600" />
                        {tr("Corrections demandées par des propriétaires", "Corrections requested by owners")}
                    </h2>
                    <ul className="divide-y divide-line">
                        {requests.data!.rows.map((item) => (
                            <li key={item.id} className="flex flex-wrap items-start gap-3 py-3">
                                <div className="min-w-0 flex-1 text-sm">
                                    <p className="font-bold">
                                        {item.spot ? <Link href={`/fr/p/${item.spot.slug}`} target="_blank" className="hover:text-brand-600">{item.spot.name}</Link> : tr("Lieu supprimé", "Deleted place")}
                                        <span className="ml-2 text-xs font-normal text-muted">{timeAgo(item.created_at)}</span>
                                    </p>
                                    <ul className="mt-1 space-y-0.5 text-text-2">
                                        {item.new_value.name && (
                                            <li>
                                                {tr("Nom", "Name")} : « {item.old_value.name} » → <b>« {item.new_value.name} »</b>
                                            </li>
                                        )}
                                        {item.new_value.category && (
                                            <li>
                                                {tr("Type", "Type")} : {CATEGORIES[item.old_value.category as keyof typeof CATEGORIES]?.[lang] ?? item.old_value.category} →{" "}
                                                <b>{CATEGORIES[item.new_value.category as keyof typeof CATEGORIES]?.[lang]}</b>
                                            </li>
                                        )}
                                        {item.new_value.address && (
                                            <li>
                                                {tr("Adresse", "Address")} : <b>{item.new_value.address}</b>
                                            </li>
                                        )}
                                        {item.new_value.position && (
                                            <li>
                                                {tr("Nouvelle position", "New location")} :{" "}
                                                <a className="font-bold text-brand-600" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${item.new_value.position.lat}&mlon=${item.new_value.position.lng}#map=18/${item.new_value.position.lat}/${item.new_value.position.lng}`}>
                                                    {tr("voir sur la carte", "see on the map")}
                                                </a>
                                            </li>
                                        )}
                                        {item.new_value.note && <li className="italic">« {item.new_value.note} »</li>}
                                    </ul>
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => decide(item.id, "apply")} className="a-btn a-btn-soft h-9 px-3 text-xs">
                                        <Check size={14} />
                                        {tr("Appliquer", "Apply")}
                                    </button>
                                    <button type="button" onClick={() => decide(item.id, "reject")} className="a-btn a-btn-ghost h-9 px-3 text-xs">
                                        <X size={14} />
                                        {tr("Refuser", "Decline")}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <div className="mb-4 flex flex-wrap gap-1.5">
                {TABS.map(([value, fr, en]) => (
                    <button key={value} type="button" className="a-chip" aria-pressed={tab === value} onClick={() => setTab(value)}>
                        {tr(fr, en)}
                    </button>
                ))}
            </div>

            {loading && !data ? (
                <div className="grid gap-3">
                    {Array.from({ length: 3 }, (_, index) => (
                        <Skeleton key={index} className="h-24" />
                    ))}
                </div>
            ) : data?.setup ? (
                <div className="a-card flex flex-col items-center px-6 py-12 text-center">
                    <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
                        <Database size={22} />
                    </span>
                    <p className="font-bold">{tr("Une dernière étape pour activer les revendications", "One last step to switch on owner claims")}</p>
                    <p className="mt-2 max-w-md text-sm text-text-2">
                        {tr("Dans Supabase, ouvre « SQL Editor », colle le fichier", "In Supabase, open “SQL Editor”, paste the file")}{" "}
                        <span className="font-mono text-xs font-bold">database/migrations/003_blog_and_claims.sql</span> {tr("et clique sur « Run ».", "and click “Run”.")}
                    </p>
                </div>
            ) : !data?.rows.length ? (
                <Empty
                    title={tr("Rien ici", "Nothing here")}
                    body={
                        tab === "open"
                            ? tr("Aucune demande en attente. Les propriétaires revendiquent leur lieu depuis sa fiche.", "No claim waiting. Owners claim their place from its page.")
                            : tr("Aucune demande dans cette liste.", "No claim in this list.")
                    }
                />
            ) : (
                <ul className="grid gap-3">
                    {data.rows.map((row) => {
                        const waitingCode = row.phone_code_requested_at && !row.phone_code_sent_at && !row.phone_verified_at;
                        return (
                            <li key={row.id}>
                                <Link href={`/admin/revendications/${row.id}`} className="a-card flex items-center gap-4 p-4 transition hover:border-line-strong hover:shadow-sm">
                                    <ScoreBadge score={row.trust_score} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-bold">{row.spot?.name ?? tr("Lieu supprimé", "Deleted place")}</span>
                                        <span className="block truncate text-sm text-text-2">
                                            {row.full_name || "—"} · {row.role === "MANAGER" ? tr("gérant", "manager") : tr("propriétaire", "owner")} · {row.user_email}
                                        </span>
                                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                            {row.phone_verified_at && (
                                                <span className="inline-flex items-center gap-1 font-bold text-good">
                                                    <Phone size={12} /> {tr("Numéro confirmé", "Number confirmed")}
                                                </span>
                                            )}
                                            {waitingCode && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 font-bold text-brand-600">
                                                    <Phone size={12} /> {tr("Code à envoyer", "Code to send")}
                                                </span>
                                            )}
                                            {row.documents.length > 0 && (
                                                <span className={`inline-flex items-center gap-1 font-bold ${row.documents_checked_at ? "text-good" : "text-text-2"}`}>
                                                    <FileText size={12} /> {tr(`${row.documents.length} fichier(s)${row.documents_checked_at ? " vérifiés" : ""}`, `${row.documents.length} file(s)${row.documents_checked_at ? " checked" : ""}`)}
                                                </span>
                                            )}
                                            {row.field_visit_at && (
                                                <span className="inline-flex items-center gap-1 font-bold text-good">
                                                    <ShieldCheck size={12} /> {tr("Visite faite", "Site visit done")}
                                                </span>
                                            )}
                                            {row.risk_flags.length > 0 && (
                                                <span className="inline-flex items-center gap-1 font-bold text-bad">
                                                    <AlertTriangle size={12} /> {tr(`${row.risk_flags.length} alerte(s)`, `${row.risk_flags.length} warning(s)`)}
                                                </span>
                                            )}
                                            {row.status === "NEEDS_INFO" && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-bold text-warn">{tr("Infos demandées", "Info requested")}</span>}
                                            {row.status === "APPROVED" && (
                                                <span className="inline-flex items-center gap-1 font-bold text-good">
                                                    <BadgeCheck size={12} /> {tr("Validée", "Approved")}
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-xs text-muted">{timeAgo(row.submitted_at ?? row.updated_at)}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </>
    );
}
