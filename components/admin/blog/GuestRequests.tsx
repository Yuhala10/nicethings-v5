"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Eye, Inbox, MessageCircle, Star, X } from "lucide-react";
import { useTr } from "@/components/admin/i18n";
import { timeAgo, useAdminData, useAdminToast } from "@/components/admin/ui";
import { adminPatch } from "@/lib/admin-client";
import { cityBySlug } from "@/lib/cities";
import { profileUrl } from "@/lib/guest-request";

type Request = {
    id: string;
    name: string;
    handle: string;
    platform: string;
    link: string | null;
    city: string | null;
    likes: string[];
    why: string | null;
    status: "PENDING" | "INVITED" | "DECLINED";
    created_at: string;
};
type Card = { ref: string; slug: string; name: string; handle: string | null; portrait_url: string | null; created_at: string; number: number | null; tier?: string | null };
type Data = { requests: Request[]; guests: Card[]; setup?: boolean };

const LIKES: Record<string, [string, string]> = {
    food: ["Restaurants", "Restaurants"],
    cafe: ["Cafés", "Cafés"],
    street: ["Cuisine de rue", "Street food"],
    nature: ["Nature", "Nature"],
    night: ["Sorties", "Nights out"],
    culture: ["Culture", "Culture"],
    stay: ["Hôtels", "Hotels"],
    shopping: ["Shopping", "Shopping"],
};
const PLATFORM: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", youtube: "YouTube", other: "Autre" };

// Under the invitations card: the people who asked to be invited (the form
// on /fr/invites), to invite in one tap or set aside, and every guest's
// card with its page, out or still being read.
export default function GuestRequests() {
    const tr = useTr();
    const toast = useAdminToast();
    const { data, reload } = useAdminData<Data>("guest-requests");
    const [made, setMade] = useState<Record<string, { link: string; honour: boolean }>>({}); // request id → invitation made
    const [busy, setBusy] = useState<string | null>(null);
    const [showDone, setShowDone] = useState(false);

    if (!data) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const message = (name: string, link: string, honour: boolean) =>
        honour
            ? tr(
                  `${name.split(" ")[0]}, tu as demandé une invitation NiceThings : on te reçoit comme invité(e) d'honneur 🌟 La voici, en vert et or : ${link}`,
                  `${name.split(" ")[0]}, you asked for a NiceThings invitation: we are welcoming you as a guest of honour 🌟 Here it is, in green and gold: ${link}`
              )
            : tr(
                  `Salut ${name.split(" ")[0]} ! Tu as demandé une invitation NiceThings : la voici, à ton nom 🙌 ${link}`,
                  `Hi ${name.split(" ")[0]}! You asked for a NiceThings invitation: here it is, in your name 🙌 ${link}`
              );

    const decide = async (row: Request, status: "INVITED" | "DECLINED", honour = false) => {
        setBusy(row.id);
        try {
            const answer = await adminPatch<{ path?: string }>("guest-requests", { id: row.id, status, tier: honour ? "honour" : "guest" });
            if (answer.path) setMade((current) => ({ ...current, [row.id]: { link: `${origin}${answer.path}`, honour } }));
            await reload();
        } catch (error) {
            toast((error as Error).message, true);
        } finally {
            setBusy(null);
        }
    };
    const copy = async (text: string, done: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast(done);
        } catch {
            toast(tr("Copie impossible : sélectionne le texte à la main.", "Could not copy: select the text by hand."), true);
        }
    };

    if (data.setup) {
        return (
            <section className="a-card mb-4 p-4 md:p-5">
                <p className="flex items-center gap-2 font-bold">
                    <Inbox size={17} className="text-brand-600" />
                    {tr("Demandes d'invitation et pages d'invités", "Invitation requests and guest pages")}
                </p>
                <p className="mt-1 max-w-2xl text-sm text-text-2">
                    {tr(
                        "Pour les ouvrir, lance une fois le script database/migrations/009_guests.sql dans l'éditeur SQL de Supabase.",
                        "To open them, run database/migrations/009_guests.sql once in Supabase's SQL editor."
                    )}
                </p>
            </section>
        );
    }

    const waiting = data.requests.filter((row) => row.status === "PENDING" || made[row.id]);
    const done = data.requests.filter((row) => row.status !== "PENDING" && !made[row.id]);

    const renderRow = (row: Request) => {
        const profile = profileUrl(row.platform, row.handle);
        const link = made[row.id]?.link;
        const honourMade = made[row.id]?.honour ?? false;
        return (
            <li key={row.id} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                            {row.name}{" "}
                            {profile ? (
                                <a href={profile} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-normal text-brand-600 hover:underline">
                                    {row.handle}
                                    <ExternalLink size={12} />
                                </a>
                            ) : (
                                <span className="font-normal text-text-2">{row.handle}</span>
                            )}
                        </p>
                        <p className="mt-0.5 text-xs text-text-2">
                            {[PLATFORM[row.platform] ?? row.platform, cityBySlug(row.city)?.name, timeAgo(row.created_at)].filter(Boolean).join(" · ")}
                        </p>
                        {row.likes.length > 0 && (
                            <p className="mt-1.5 flex flex-wrap gap-1">
                                {row.likes.map((like) => (
                                    <span key={like} className="rounded-full bg-soft px-2 py-0.5 text-xs">
                                        {tr(...(LIKES[like] ?? [like, like]))}
                                    </span>
                                ))}
                            </p>
                        )}
                        {row.why && <p className="mt-1.5 text-sm text-text-2">« {row.why} »</p>}
                        {row.link && (
                            <a href={row.link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
                                {tr("Une de ses publications", "One of their posts")}
                                <ExternalLink size={11} />
                            </a>
                        )}
                    </div>
                    {row.status === "PENDING" && !link && (
                        <div className="flex gap-1.5">
                            <button type="button" disabled={busy === row.id} onClick={() => void decide(row, "INVITED")} className="a-btn a-btn-primary h-9 text-xs">
                                <Check size={14} />
                                {tr("Inviter", "Invite")}
                            </button>
                            <button
                                type="button"
                                disabled={busy === row.id}
                                onClick={() => void decide(row, "INVITED", true)}
                                className="a-btn h-9 border border-[#e2c065] bg-[#0a3326] text-xs text-[#f3d77e] hover:brightness-110"
                                title={tr("Invité d'honneur : vert et or, en tête, adresse @, trois invitations à offrir", "Guest of honour: green and gold, first, @ address, three invitations to give")}
                            >
                                <Star size={14} className="fill-[#f3d77e]" />
                                {tr("Honneur", "Honour")}
                            </button>
                            <button type="button" disabled={busy === row.id} onClick={() => void decide(row, "DECLINED")} className="a-btn a-btn-ghost h-9 text-xs">
                                <X size={14} />
                                {tr("Pas maintenant", "Not now")}
                            </button>
                        </div>
                    )}
                    {row.status !== "PENDING" && !link && <span className="rounded-full bg-soft px-2 py-0.5 text-xs text-text-2">{row.status === "INVITED" ? tr("Invité", "Invited") : tr("Mis de côté", "Set aside")}</span>}
                </div>
                {link && (
                    <div className="mt-2 rounded-lg bg-soft p-2.5">
                        <p className="text-xs font-semibold">{honourMade && "★ "}{tr(`Invitation prête pour ${row.name}. Envoie-la en message privé sur ${PLATFORM[row.platform] ?? row.platform}.`, `Invitation ready for ${row.name}. Send it in a private message on ${PLATFORM[row.platform] ?? row.platform}.`)}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            <button type="button" onClick={() => void copy(message(row.name, link, honourMade), tr("Message copié : colle-le en message privé.", "Message copied: paste it in a private message."))} className="a-btn a-btn-soft h-9 text-xs">
                                <MessageCircle size={14} />
                                {tr("Copier le message", "Copy the message")}
                            </button>
                            <button type="button" onClick={() => void copy(link, tr("Lien copié.", "Link copied."))} className="a-btn a-btn-ghost h-9 text-xs">
                                <Copy size={14} />
                                {tr("Lien", "Link")}
                            </button>
                            {profile && (
                                <a href={profile} target="_blank" rel="noopener noreferrer" className="a-btn a-btn-ghost h-9 text-xs">
                                    <ExternalLink size={14} />
                                    {tr("Ouvrir son compte", "Open their account")}
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </li>
        );
    };

    return (
        <section className="a-card mb-4 p-4 md:p-5">
            <p className="flex items-center gap-2 font-bold">
                <Inbox size={17} className="text-brand-600" />
                {tr("Demandes d'invitation", "Invitation requests")}
                {waiting.length > 0 && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">{waiting.length}</span>}
            </p>
            <p className="mt-1 max-w-2xl text-sm text-text-2">
                {tr(
                    "Les personnes qui ont rempli « Demande ton invitation ». Regarde leur compte, puis invite d'un geste : le message est prêt à envoyer en privé.",
                    "People who filled in “Ask for your invitation”. Look at their account, then invite in one tap: the message is ready to send privately."
                )}
            </p>
            {waiting.length === 0 ? (
                <p className="mt-3 text-sm text-text-2">{tr("Aucune demande en attente.", "No request waiting.")}</p>
            ) : (
                <ul className="mt-3 grid gap-2">
                    {waiting.map(renderRow)}
                </ul>
            )}
            {done.length > 0 && (
                <button type="button" onClick={() => setShowDone(!showDone)} className="mt-2 text-xs font-semibold text-text-2 hover:text-text">
                    {showDone ? tr("Masquer les demandes traitées", "Hide handled requests") : tr(`Demandes traitées (${done.length})`, `Handled requests (${done.length})`)}
                </button>
            )}
            {showDone && (
                <ul className="mt-2 grid gap-2">
                    {done.map(renderRow)}
                </ul>
            )}

            {data.guests.length > 0 && (
                <div className="mt-5 border-t border-line pt-4">
                    <p className="text-sm font-bold">{tr("Pages d'invités", "Guest pages")}</p>
                    <p className="mt-0.5 text-xs text-text-2">{tr("Une page sort quand tu publies un carnet de l'invité.", "A page comes out when you publish one of the guest's notebooks.")}</p>
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                        {data.guests.map((card) => (
                            <li key={card.ref} className="flex items-center gap-3 rounded-xl border border-line p-2.5">
                                <span className="h-12 w-10 shrink-0 overflow-hidden rounded-t-full rounded-b-md bg-soft">{card.portrait_url && <img src={card.portrait_url} alt="" className="h-full w-full object-cover" />}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold">{card.name}</span>
                                    <span className="block truncate text-xs text-text-2">
                                        {card.tier === "honour" ? "★ " : ""}
                                        {card.number ? tr(`En ligne · n°${String(card.number).padStart(2, "0")}`, `Live · no. ${String(card.number).padStart(2, "0")}`) : tr("Carnet en relecture", "Notebook being read")}
                                        {card.handle ? ` · ${card.handle}` : ""}
                                    </span>
                                </span>
                                <a href={card.number ? `/fr/invites/${card.slug}` : `/api/admin/guest-preview?slug=${card.slug}`} target="_blank" rel="noopener noreferrer" className="a-btn a-btn-ghost h-9 shrink-0 text-xs">
                                    <Eye size={14} />
                                    {card.number ? tr("Voir", "View") : tr("Aperçu", "Preview")}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
