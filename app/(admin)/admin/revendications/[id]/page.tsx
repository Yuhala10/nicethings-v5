"use client";

import { use, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, BadgeCheck, Check, ExternalLink, FileText, Globe, MapPin, MessageCircle, Phone, ShieldCheck, Smartphone, X } from "lucide-react";
import { EVENT_LABELS, FILE_LABELS, ScoreBadge } from "@/components/admin/claims";
import { useTr } from "@/components/admin/i18n";
import { Skeleton, timeAgo, useAdminData, useAdminToast } from "@/components/admin/ui";
import { adminPatch } from "@/lib/admin-client";
import type { Assessment } from "@/lib/claims/score";

type Detail = {
    claim: {
        id: string;
        status: string;
        full_name: string;
        role: string;
        phone: string;
        user_email: string | null;
        code: string;
        listing_phone: string | null;
        phone_code_requested_at: string | null;
        phone_code_sent_at: string | null;
        phone_code_attempts: number;
        phone_verified_at: string | null;
        onsite_lat: number | null;
        onsite_lng: number | null;
        onsite_accuracy: number | null;
        onsite_distance_m: number | null;
        onsite_at: string | null;
        documents_checked_at: string | null;
        documents_purged_at: string | null;
        social_url: string | null;
        social_verified_at: string | null;
        field_visit_at: string | null;
        field_visit_note: string | null;
        statement_accepted_at: string | null;
        message_to_owner: string | null;
        review_note: string | null;
        submitted_at: string | null;
        created_at: string;
    };
    code: string | null;
    place: { slug: string; name: string; city: string; neighborhood: string | null; phone: string | null; website: string | null; source: string; latitude: number; longitude: number };
    files: { kind: string; type: string; at: string; url: string | null }[];
    events: { actor: string; action: string; detail: Record<string, unknown>; created_at: string }[];
    others: { id: string; status: string; full_name: string; user_email: string | null; trust_score: number; created_at: string }[];
    owners: { user_id: string; role: string; created_at: string; revoked_at: string | null }[];
    assessment: Assessment;
};

const digits = (phone: string | null) => {
    const raw = (phone ?? "").replace(/\D/g, "");
    return raw.length === 9 ? `237${raw}` : raw;
};

function Proof({ icon: Icon, title, done, children }: { icon: typeof Phone; title: string; done: boolean; children: React.ReactNode }) {
    return (
        <section className={`a-card p-5 ${done ? "border-green-200" : ""}`}>
            <h2 className="mb-3 flex items-center gap-2 font-extrabold">
                <span className={`grid h-8 w-8 place-items-center rounded-lg ${done ? "bg-green-50 text-good" : "bg-soft text-text-2"}`}>{done ? <Check size={16} /> : <Icon size={16} />}</span>
                {title}
            </h2>
            {children}
        </section>
    );
}

// One claim, every proof, and the decision. Each action is written to the
// history; approval stays locked until the rules are met.
export default function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const tr = useTr();
    const { data, error, reload } = useAdminData<Detail>(`claims/${id}`);
    const toast = useAdminToast();
    const [note, setNote] = useState("");
    const [override, setOverride] = useState(false);
    const [busy, setBusy] = useState(false);

    const act = async (action: string, extra: Record<string, unknown> = {}, success = tr("Enregistré ✓", "Saved ✓")) => {
        setBusy(true);
        try {
            await adminPatch(`claims/${id}`, { action, ...extra });
            toast(success);
            setNote("");
            setOverride(false);
            await reload();
        } catch (caught) {
            toast((caught as Error).message, true);
        } finally {
            setBusy(false);
        }
    };

    if (error) return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-bad">{error}</p>;
    if (!data) return <Skeleton className="h-[40rem]" />;
    const { claim, place, assessment } = data;
    const open = ["PENDING", "NEEDS_INFO", "DRAFT"].includes(claim.status);
    const message = data.code
        ? `NiceThings : ton code pour confirmer que tu gères « ${place.name} » est ${data.code}. Saisis-le sur nicethings.site. Si tu n'as rien demandé, ignore ce message.`
        : "";

    return (
        <div className="pb-16">
            <Link href="/admin/revendications" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-text-2 hover:text-ink">
                <ArrowLeft size={16} />
                {tr("Revendications", "Owner claims")}
            </Link>

            <header className="a-card mb-5 flex flex-wrap items-center gap-4 p-5">
                <ScoreBadge score={assessment.score} large />
                <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-extrabold">
                        <a href={`/fr/p/${place.slug}`} target="_blank" rel="noreferrer" className="hover:text-brand-600">
                            {place.name}
                        </a>
                    </h1>
                    <p className="text-sm text-text-2">
                        {claim.full_name || "—"} · {claim.role === "MANAGER" ? tr("gérant", "manager") : tr("propriétaire", "owner")} ·{" "}
                        <a href={`tel:${claim.phone}`} className="font-bold">
                            {claim.phone || tr("pas de numéro", "no number")}
                        </a>{" "}
                        · {tr("compte Google", "Google account")} {claim.user_email}
                    </p>
                    <p className="text-xs text-muted">
                        {tr("Commencée", "Started")} {timeAgo(claim.created_at)}
                        {claim.submitted_at && ` · ${tr("envoyée", "sent")} ${timeAgo(claim.submitted_at)}`} · {tr("code de la demande", "claim code")} <b className="font-mono">{claim.code}</b>
                        {claim.statement_accepted_at ? tr(" · déclaration sur l'honneur signée", " · sworn statement signed") : tr(" · déclaration non signée", " · statement not signed")}
                    </p>
                </div>
                <span className="rounded-full bg-soft px-3 py-1 text-xs font-bold">{claim.status}</span>
            </header>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="grid content-start gap-5">
                    <Proof icon={Phone} title={tr("Code envoyé au numéro de la fiche (preuve forte)", "Code sent to the listing's number (strong proof)")} done={Boolean(claim.phone_verified_at)}>
                        <p className="text-sm text-text-2">
                            {tr("Numéro sur la fiche", "Number on the listing")} : <b>{place.phone ?? tr("aucun", "none")}</b>
                            {place.source === "submission" && <span className="ml-2 text-warn">{tr("(proposé par un visiteur)", "(suggested by a visitor)")}</span>}
                        </p>
                        {claim.phone_verified_at ? (
                            <p className="mt-2 text-sm font-bold text-good">
                                {tr("Confirmé", "Confirmed")} {timeAgo(claim.phone_verified_at)} : {tr("le demandeur a saisi le bon code.", "the claimant entered the right code.")}
                            </p>
                        ) : data.code ? (
                            <div className="mt-3 rounded-2xl bg-soft p-4">
                                <p className="text-xs font-bold text-muted">{tr("Code à envoyer depuis le téléphone NiceThings", "Code to send from the NiceThings phone")}</p>
                                <p className="font-mono text-3xl font-extrabold tracking-[0.2em]">{data.code.replace(/(\d{3})(\d{3})/, "$1 $2")}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <a href={`https://wa.me/${digits(place.phone)}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className="a-btn h-10 bg-[#25d366] px-3 text-sm text-white">
                                        <MessageCircle size={16} />
                                        WhatsApp
                                    </a>
                                    <a href={`sms:+${digits(place.phone)}?&body=${encodeURIComponent(message)}`} className="a-btn a-btn-soft h-10 bg-white px-3 text-sm">
                                        <Smartphone size={16} />
                                        SMS
                                    </a>
                                    <button type="button" disabled={busy} onClick={() => act("code_sent", {}, tr("Marqué comme envoyé", "Marked as sent"))} className="a-btn a-btn-dark h-10 px-3 text-sm">
                                        <Check size={16} />
                                        {claim.phone_code_sent_at ? `${tr("Envoyé", "Sent")} ${timeAgo(claim.phone_code_sent_at)}` : tr("Marquer comme envoyé", "Mark as sent")}
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-muted">
                                    {tr("Envoie-le uniquement au numéro de la fiche, jamais à celui que donne le demandeur.", "Send it only to the listing's number, never to the one the claimant gives.")}{" "}
                                    {tr(`${claim.phone_code_attempts} essai(s) raté(s).`, `${claim.phone_code_attempts} failed attempt(s).`)}
                                </p>
                            </div>
                        ) : (
                            <p className="mt-2 text-sm text-muted">{tr("Pas de code demandé.", "No code requested.")}</p>
                        )}
                    </Proof>

                    <Proof icon={FileText} title={tr("Fichiers : devanture avec le code, papiers (preuve forte une fois vérifiés)", "Files: storefront with the code, papers (strong proof once checked)")} done={Boolean(claim.documents_checked_at)}>
                        {claim.documents_purged_at ? (
                            <p className="text-sm text-muted">
                                {tr("Fichiers supprimés", "Files deleted")} {timeAgo(claim.documents_purged_at)} {tr("(30 jours après la décision).", "(30 days after the decision).")}
                            </p>
                        ) : data.files.length === 0 ? (
                            <p className="text-sm text-muted">{tr("Aucun fichier.", "No files.")}</p>
                        ) : (
                            <>
                                <p className="mb-3 text-sm text-text-2">
                                    {tr("Sur la photo de devanture, le code", "On the storefront photo, the code")} <b className="font-mono">{claim.code}</b>{" "}
                                    {tr("doit être écrit à la main, à côté de l'enseigne. Les noms sur les papiers doivent correspondre à", "must be handwritten next to the sign. Names on the papers must match")} <b>{claim.full_name}</b>{" "}
                                    {tr("ou au lieu.", "or the place.")}
                                </p>
                                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {data.files.map((file, index) => (
                                        <li key={index} className="overflow-hidden rounded-xl border border-line">
                                            <a href={file.url ?? "#"} target="_blank" rel="noreferrer" className="block">
                                                {file.type.startsWith("image/") && file.url ? (
                                                    <img src={file.url} alt={FILE_LABELS[file.kind] ? tr(...FILE_LABELS[file.kind]) : file.kind} className="aspect-square w-full object-cover" />
                                                ) : (
                                                    <span className="grid aspect-square place-items-center bg-soft text-sm font-bold text-text-2">PDF</span>
                                                )}
                                            </a>
                                            <p className="px-2 py-1.5 text-xs font-bold">{FILE_LABELS[file.kind] ? tr(...FILE_LABELS[file.kind]) : file.kind}</p>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-2 text-xs text-muted">{tr("Liens valables une minute : recharge la page si une image ne s'ouvre plus.", "Links last one minute: reload the page if an image no longer opens.")}</p>
                                <div className="mt-3 flex gap-2">
                                    <button type="button" disabled={busy} onClick={() => act("papers", { ok: true }, tr("Pièces validées", "Files approved"))} className="a-btn a-btn-soft h-10 px-3 text-sm">
                                        <Check size={16} />
                                        {tr("Pièces conformes", "Files are valid")}
                                    </button>
                                    {claim.documents_checked_at && (
                                        <button type="button" disabled={busy} onClick={() => act("papers", { ok: false })} className="a-btn a-btn-ghost h-10 px-3 text-sm">
                                            <X size={16} />
                                            {tr("Annuler", "Undo")}
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </Proof>

                    <Proof icon={Globe} title={tr("Page officielle avec le code", "Official page with the code")} done={Boolean(claim.social_verified_at)}>
                        {claim.social_url ? (
                            <>
                                <a href={claim.social_url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-sm font-bold break-all text-brand-600">
                                    {claim.social_url}
                                    <ExternalLink size={13} />
                                </a>
                                <p className="mt-1 text-sm text-text-2">
                                    {tr("Vérifie que la page est bien celle du lieu (ancienneté, photos, abonnés) et que", "Check the page really belongs to the place (age, photos, followers) and that")}{" "}
                                    <b className="font-mono">{claim.code}</b> {tr("apparaît dans la bio ou une publication récente.", "appears in the bio or a recent post.")}
                                </p>
                                <button type="button" disabled={busy} onClick={() => act("social", { ok: !claim.social_verified_at })} className="a-btn a-btn-soft mt-3 h-10 px-3 text-sm">
                                    {claim.social_verified_at ? tr("Annuler", "Undo") : tr("Code vu sur la page", "Code seen on the page")}
                                </button>
                            </>
                        ) : (
                            <p className="text-sm text-muted">{tr("Pas de page indiquée.", "No page given.")}</p>
                        )}
                    </Proof>

                    <Proof
                        icon={MapPin}
                        title={tr("Test de position (indice, facile à truquer seul)", "Location check (a hint, easy to fake on its own)")}
                        done={claim.onsite_distance_m !== null && claim.onsite_distance_m <= 50 && (claim.onsite_accuracy ?? 999) <= 50}
                    >
                        {claim.onsite_at ? (
                            <p className="text-sm text-text-2">
                                {tr("À", "At")} <b>{claim.onsite_distance_m} m</b> {tr("du lieu", "from the place")} ({tr("précision", "accuracy")} ± {claim.onsite_accuracy} m), {timeAgo(claim.onsite_at)}.{" "}
                                <a
                                    className="font-bold text-brand-600"
                                    target="_blank"
                                    rel="noreferrer"
                                    href={`https://www.openstreetmap.org/directions?route=${claim.onsite_lat}%2C${claim.onsite_lng}%3B${place.latitude}%2C${place.longitude}`}
                                >
                                    {tr("Voir les deux points", "See both points")}
                                </a>
                            </p>
                        ) : (
                            <p className="text-sm text-muted">{tr("Pas fait.", "Not done.")}</p>
                        )}
                    </Proof>

                    <Proof icon={ShieldCheck} title={tr("Visite de l'équipe sur place (preuve la plus forte)", "Team visit on site (strongest proof)")} done={Boolean(claim.field_visit_at)}>
                        {claim.field_visit_at ? (
                            <p className="text-sm text-text-2">
                                {tr("Faite", "Done")} {timeAgo(claim.field_visit_at)}
                                {claim.field_visit_note && ` : « ${claim.field_visit_note} »`}
                            </p>
                        ) : (
                            <p className="text-sm text-text-2">
                                {tr(
                                    "Sur place, demande à voir le demandeur et un document au nom du lieu. Écris ce que tu as vu dans la note ci-dessous, puis :",
                                    "On site, ask to see the claimant and a document in the place's name. Write what you saw in the note below, then:"
                                )}
                            </p>
                        )}
                        {!claim.field_visit_at && (
                            <button type="button" disabled={busy || !note.trim()} onClick={() => act("field_visit", { note }, tr("Visite enregistrée", "Visit saved"))} className="a-btn a-btn-soft mt-3 h-10 px-3 text-sm">
                                <ShieldCheck size={16} />
                                {tr("Visite faite (avec la note)", "Visit done (with the note)")}
                            </button>
                        )}
                    </Proof>
                </div>

                <aside className="grid content-start gap-5">
                    <section className="a-card p-5">
                        <h2 className="mb-3 font-extrabold">{tr("Confiance", "Trust")}</h2>
                        <ul className="space-y-1.5 text-sm">
                            {assessment.checks.map((check) => (
                                <li key={check.key} className="flex items-start gap-2">
                                    <span className="w-9 shrink-0 font-bold text-good tabular-nums">+{check.points}</span>
                                    <span>
                                        {tr(check.label, check.en)}
                                        {check.strong && <b className="ml-1 text-good">· {tr("forte", "strong")}</b>}
                                    </span>
                                </li>
                            ))}
                            {assessment.flags.map((flag) => (
                                <li key={flag.key} className="flex items-start gap-2 text-bad">
                                    <span className="w-9 shrink-0 font-bold tabular-nums">{flag.points}</span>
                                    <span className="flex gap-1">
                                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                        {tr(flag.label, flag.en)}
                                    </span>
                                </li>
                            ))}
                            {!assessment.checks.length && !assessment.flags.length && <li className="text-muted">{tr("Aucune preuve pour l'instant.", "No proof yet.")}</li>}
                        </ul>
                        {assessment.blocker && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-warn">{tr(assessment.blocker, assessment.blockerEn ?? assessment.blocker)}</p>}
                    </section>

                    {open && (
                        <section className="a-card grid gap-3 p-5">
                            <h2 className="font-extrabold">{tr("Décision", "Decision")}</h2>
                            <textarea
                                value={note}
                                onChange={(event) => setNote(event.target.value)}
                                rows={4}
                                placeholder={tr("Message au demandeur ou note de visite / motif", "Message to the claimant, or visit note / reason")}
                                className="a-input"
                            />
                            <button
                                type="button"
                                disabled={busy || (!assessment.canApprove && !(override && note.trim().length >= 15))}
                                onClick={() => act("approve", { note, override }, tr("Validée : le propriétaire peut gérer sa fiche", "Approved: the owner can manage the listing"))}
                                className="a-btn a-btn-primary h-11"
                            >
                                <BadgeCheck size={17} />
                                {tr("Valider la revendication", "Approve the claim")}
                            </button>
                            {!assessment.canApprove && (
                                <label className="flex items-start gap-2 text-xs text-text-2">
                                    <input type="checkbox" checked={override} onChange={(event) => setOverride(event.target.checked)} className="mt-0.5" />
                                    {tr(
                                        "Forcer malgré les règles (motif écrit obligatoire, 15 caractères minimum, gardé dans l'historique)",
                                        "Force past the rules (written reason required, 15 characters minimum, kept in the history)"
                                    )}
                                </label>
                            )}
                            <button type="button" disabled={busy || !note.trim()} onClick={() => act("needs_info", { message: note }, tr("Demande envoyée au demandeur", "Request sent to the claimant"))} className="a-btn a-btn-soft h-10 text-sm">
                                {tr("Demander des compléments", "Ask for more")}
                            </button>
                            <button type="button" disabled={busy || !note.trim()} onClick={() => act("reject", { reason: note }, tr("Refusée", "Declined"))} className="a-btn a-btn-danger h-10 text-sm">
                                {tr("Refuser (avec le motif)", "Decline (with the reason)")}
                            </button>
                        </section>
                    )}

                    {claim.status === "APPROVED" && (
                        <section className="a-card grid gap-3 p-5">
                            <h2 className="font-extrabold">{tr("Accès propriétaire", "Owner access")}</h2>
                            <p className="text-sm text-text-2">
                                {tr("Validée. En cas de litige ou d'abus, tu peux retirer l'accès (motif obligatoire).", "Approved. In case of dispute or abuse, you can remove access (reason required).")}
                            </p>
                            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder={tr("Motif", "Reason")} className="a-input" />
                            <button type="button" disabled={busy || !note.trim()} onClick={() => act("revoke", { note }, tr("Accès retiré", "Access removed"))} className="a-btn a-btn-danger h-10 text-sm">
                                {tr("Retirer l'accès", "Remove access")}
                            </button>
                        </section>
                    )}

                    {(data.others.length > 0 || data.owners.length > 0) && (
                        <section className="a-card p-5">
                            <h2 className="mb-2 font-extrabold">{tr("Autour de ce lieu", "Around this place")}</h2>
                            {data.owners.filter((owner) => !owner.revoked_at).length > 0 && (
                                <p className="mb-2 text-sm font-semibold text-bad">
                                    {tr(
                                        `Déjà géré par ${data.owners.filter((owner) => !owner.revoked_at).length} compte(s).`,
                                        `Already managed by ${data.owners.filter((owner) => !owner.revoked_at).length} account(s).`
                                    )}
                                </p>
                            )}
                            <ul className="space-y-1.5 text-sm">
                                {data.others.map((other) => (
                                    <li key={other.id}>
                                        <Link href={`/admin/revendications/${other.id}`} className="flex items-center gap-2 hover:text-brand-600">
                                            <ScoreBadge score={other.trust_score} />
                                            <span className="min-w-0 truncate">
                                                {other.full_name || other.user_email} · {other.status}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <section className="a-card p-5">
                        <h2 className="mb-3 font-extrabold">{tr("Historique", "History")}</h2>
                        <ol className="space-y-2 border-l-2 border-line pl-4 text-sm">
                            {data.events.map((event, index) => (
                                <li key={index}>
                                    <p className="font-semibold">
                                        {EVENT_LABELS[event.action] ? tr(...EVENT_LABELS[event.action]) : event.action}
                                        <span className="ml-1 text-xs font-normal text-muted">
                                            · {event.actor === "team" ? tr("équipe", "team") : event.actor === "owner" ? tr("demandeur", "claimant") : tr("système", "system")} · {timeAgo(event.created_at)}
                                        </span>
                                    </p>
                                    {typeof event.detail.note === "string" && <p className="text-xs text-text-2">« {event.detail.note} »</p>}
                                    {typeof event.detail.distance === "number" && <p className="text-xs text-text-2">{tr("à", "at")} {event.detail.distance} m</p>}
                                </li>
                            ))}
                        </ol>
                        {claim.review_note && (
                            <p className="mt-3 rounded-xl bg-soft px-3 py-2 text-sm">
                                {tr("Note", "Note")} : {claim.review_note}
                            </p>
                        )}
                    </section>
                </aside>
            </div>
        </div>
    );
}
