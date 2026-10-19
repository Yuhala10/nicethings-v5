"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, EyeOff, ExternalLink, Flag, ImageOff, Trash2 } from "lucide-react";
import { useTr } from "@/components/admin/i18n";
import { Empty, PageHeader, Skeleton, timeAgo, useAdminData, useAdminToast } from "@/components/admin/ui";
import { adminPatch, adminPost } from "@/lib/admin-client";
import type { Person } from "@/lib/people/types";

// The members of NiceThings and what they write in their own name. Reviews
// and comments go online at once; here the team sees what waits (a link or
// a phone number in it) or was reported, and the latest ones.

type Member = Person & { bio: string | null; status: string; photo: boolean; stats: { reviews: number; photos: number; comments: number; cheers: number }; reports: number; createdAt: string; lastSeen: string };
type Word = { kind: "comment" | "review" | "tip"; id: string; body: string | null; rating: number | null; status: string; reports: number; created_at: string; person: Person | null; where: { label: string; href: string | null } };

const LEVELS = [
    ["Nouveau", "Newcomer"],
    ["Habitué", "Regular"],
    ["Connaisseur", "Connoisseur"],
    ["Ambianceur", "Life of the party"],
    ["Légende du kwat", "Neighbourhood legend"],
] as const;
const RATINGS = ["C'est le ndem", "Bof", "Ça peut aller", "C'est propre", "C'est validé !"];

export default function MembersPage() {
    const tr = useTr();
    const toast = useAdminToast();
    const [busy, setBusy] = useState<string | null>(null);
    const people = useAdminData<{ setup: boolean; total: number; week: number; people: Member[] }>("people");
    const words = useAdminData<{ setup: boolean; waiting: Word[]; recent: Word[] }>("comments");

    const act = async (member: Member, action: "suspend" | "restore" | "photo" | "role", role?: string) => {
        if (action === "suspend" && !window.confirm(tr(`Suspendre @${member.handle} ? Il est déconnecté partout.`, `Suspend @${member.handle}? They are signed out everywhere.`))) return;
        setBusy(member.id);
        try {
            await adminPatch("people", { id: member.id, action, role });
            toast(tr("C'est fait", "Done"));
            await people.reload();
        } catch (caught) {
            toast((caught as Error).message, true);
        } finally {
            setBusy(null);
        }
    };

    const settle = async (word: Word, action: "approve" | "hide" | "delete") => {
        if (action === "delete" && !window.confirm(tr("Supprimer pour de bon ?", "Delete for good?"))) return;
        setBusy(word.id);
        try {
            await adminPost("comments", { kind: word.kind, id: word.id, action });
            toast(action === "approve" ? tr("Publié", "Published") : action === "hide" ? tr("Masqué", "Hidden") : tr("Supprimé", "Deleted"));
            await words.reload();
        } catch (caught) {
            toast((caught as Error).message, true);
        } finally {
            setBusy(null);
        }
    };

    const word = (item: Word, waiting: boolean) => (
        <li key={`${item.kind}-${item.id}`} className="a-card flex flex-col gap-3 p-4">
            <div className="flex items-center gap-3">
                { }
                {item.person && <img src={item.person.face} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-full object-cover" />}
                <div className="min-w-0 text-sm">
                    <p className="truncate font-semibold">{item.person ? `@${item.person.handle}` : "—"}</p>
                    <p className="text-xs text-muted">
                        {item.kind === "review" ? tr("Avis", "Review") : item.kind === "tip" ? tr("Chemin", "Way") : tr("Commentaire", "Comment")} · {timeAgo(item.created_at)}
                    </p>
                </div>
                {item.reports > 0 && (
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-bad">
                        <Flag size={11} />
                        {item.reports}
                    </span>
                )}
            </div>
            {item.where.href ? (
                <Link href={item.where.href} target="_blank" className="flex items-center gap-1 text-xs text-muted hover:underline">
                    {item.where.label}
                    <ExternalLink size={12} />
                </Link>
            ) : (
                <p className="text-xs text-muted">{item.where.label}</p>
            )}
            {item.rating && <p className="text-sm font-semibold">{RATINGS[item.rating - 1]}</p>}
            {item.body && <p className="text-sm whitespace-pre-line text-text-2">{item.body}</p>}
            <p className="text-xs font-semibold text-muted">
                {item.status === "PENDING" ? tr("En attente (lien ou numéro)", "Waiting (link or number)") : item.status === "HIDDEN" ? tr("Masqué", "Hidden") : tr("En ligne", "Online")}
            </p>
            <div className="flex gap-2">
                {(waiting || item.status !== "PUBLISHED") && item.status !== "PUBLISHED" ? (
                    <button type="button" className="a-btn a-btn-primary h-10 flex-1" disabled={busy !== null} onClick={() => settle(item, "approve")}>
                        <Check size={15} />
                        {tr("Publier", "Publish")}
                    </button>
                ) : waiting ? (
                    <button type="button" className="a-btn a-btn-soft h-10 flex-1" disabled={busy !== null} onClick={() => settle(item, "approve")}>
                        <Check size={15} />
                        {tr("Garder", "Keep")}
                    </button>
                ) : null}
                {item.status === "PUBLISHED" && (
                    <button type="button" className="a-btn a-btn-soft h-10 flex-1" disabled={busy !== null} onClick={() => settle(item, "hide")}>
                        <EyeOff size={15} />
                        {tr("Masquer", "Hide")}
                    </button>
                )}
                <button type="button" className="a-btn a-btn-soft h-10 w-10 !px-0 text-bad" aria-label={tr("Supprimer", "Delete")} disabled={busy !== null} onClick={() => settle(item, "delete")}>
                    <Trash2 size={15} />
                </button>
            </div>
        </li>
    );

    return (
        <>
            <PageHeader
                title={tr("Membres", "Members")}
                subtitle={
                    people.data?.setup
                        ? undefined
                        : tr(`${people.data?.total ?? "…"} profils · ${people.data?.week ?? "…"} cette semaine`, `${people.data?.total ?? "…"} profiles · ${people.data?.week ?? "…"} this week`)
                }
            />

            {people.data?.setup ? (
                <p className="a-card mb-10 p-4 text-sm text-muted">
                    {tr("Les profils s'ouvrent une fois le script 011_profiles.sql lancé dans Supabase.", "Profiles open once the script 011_profiles.sql has been run in Supabase.")}
                </p>
            ) : (
                <>
                    {/* ---- What waits, or was reported ---- */}
                    <h2 className="a-serif mb-3 text-2xl">
                        {tr("À regarder", "To look at")} <span className="text-muted">· {words.data?.waiting.length ?? 0}</span>
                    </h2>
                    {words.loading && !words.data ? (
                        <Skeleton className="mb-8 h-32" />
                    ) : words.data?.waiting.length ? (
                        <ul className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{words.data.waiting.map((item) => word(item, true))}</ul>
                    ) : (
                        <p className="a-card mb-8 p-4 text-sm text-muted">{tr("Rien en attente, rien de signalé.", "Nothing waiting, nothing reported.")}</p>
                    )}
                    {Boolean(words.data?.recent.length) && (
                        <details className="mb-10">
                            <summary className="cursor-pointer text-sm font-semibold">
                                {tr("Derniers avis et commentaires", "Latest reviews and comments")} · {words.data?.recent.length}
                            </summary>
                            <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{words.data?.recent.map((item) => word(item, false))}</ul>
                        </details>
                    )}

                    {/* ---- The members ---- */}
                    <h2 className="a-serif mb-3 text-2xl">{tr("Profils", "Profiles")}</h2>
                    {people.error && <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-bad">{people.error}</p>}
                    {people.loading && !people.data ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Skeleton className="h-36" />
                            <Skeleton className="h-36" />
                        </div>
                    ) : !people.data?.people.length ? (
                        <Empty title={tr("Personne pour l'instant", "Nobody yet")} body={tr("Les profils créés sur le site apparaîtront ici.", "Profiles made on the site will show here.")} />
                    ) : (
                        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {people.data.people.map((member) => (
                                <li key={member.id} className={`a-card flex flex-col gap-3 p-4 ${member.status === "SUSPENDED" ? "opacity-60" : ""}`}>
                                    <div className="flex items-center gap-3">
                                        { }
                                        <img src={member.face} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-full object-cover" />
                                        <div className="min-w-0 flex-1">
                                            <a href={`/fr/u/${member.handle}`} target="_blank" rel="noreferrer" className="block truncate font-semibold hover:underline">
                                                {member.name ? `${member.name} · ` : ""}@{member.handle}
                                            </a>
                                            <p className="truncate text-xs text-muted">
                                                n°{member.memberNo} · {tr(...(LEVELS[member.level] ?? LEVELS[0]) as [string, string])} · {member.points} pts
                                            </p>
                                        </div>
                                        {member.reports > 0 && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-bad">
                                                <Flag size={11} />
                                                {member.reports}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted">
                                        {[member.area, member.city].filter(Boolean).join(", ") || "—"} · {tr("inscrit", "joined")} {timeAgo(member.createdAt)} · {tr("vu", "seen")} {timeAgo(member.lastSeen)}
                                    </p>
                                    <p className="text-xs">
                                        {member.stats.reviews} {tr("avis", "reviews")} · {member.stats.photos} photos · {member.stats.comments} {tr("commentaires", "comments")} · {member.stats.cheers} {tr("j'aime reçus", "likes received")}
                                    </p>
                                    {member.bio && <p className="line-clamp-2 text-sm text-text-2">{member.bio}</p>}
                                    <div className="flex flex-wrap gap-2">
                                        <select
                                            value={member.role}
                                            disabled={busy !== null}
                                            onChange={(event) => act(member, "role", event.target.value)}
                                            className="a-input h-10 w-auto flex-1 text-sm"
                                            aria-label={tr("Rôle", "Role")}
                                        >
                                            <option value="member">{tr("Membre", "Member")}</option>
                                            <option value="team">{tr("Équipe NiceThings", "NiceThings team")}</option>
                                            <option value="founder">{tr("Fondateur", "Founder")}</option>
                                        </select>
                                        {member.photo && (
                                            <button type="button" className="a-btn a-btn-soft h-10" disabled={busy !== null} onClick={() => act(member, "photo")} title={tr("Retirer la photo", "Take the photo down")}>
                                                <ImageOff size={15} />
                                            </button>
                                        )}
                                        <button type="button" className="a-btn a-btn-soft h-10" disabled={busy !== null} onClick={() => act(member, member.status === "SUSPENDED" ? "restore" : "suspend")}>
                                            {member.status === "SUSPENDED" ? tr("Rétablir", "Restore") : tr("Suspendre", "Suspend")}
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </>
    );
}
