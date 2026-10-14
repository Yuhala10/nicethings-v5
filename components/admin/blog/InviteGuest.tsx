"use client";

import { useState } from "react";
import { Copy, ExternalLink, MessageCircle, Sparkles, Users } from "lucide-react";
import { useTr } from "@/components/admin/i18n";
import { useAdminToast } from "@/components/admin/ui";
import { adminPost } from "@/lib/admin-client";

type Made = { name: string; path: string; until: string | null };

// How many invitations one paste may make at once.
const MAX_AT_ONCE = 40;

// The team invites people to write a guest's notebook: names in, links out
// (lib/invitations.ts). Each link travels as an invitation card bearing that
// name and opens their notebook space; what they send arrives in this list
// as a draft signed with their name.
//
// For a campaign ("comment INVITE"), many names can be pasted at once, one
// per line: each gets its link and a message ready to send in private.
export default function InviteGuest() {
    const tr = useTr();
    const toast = useAdminToast();
    const [names, setNames] = useState("");
    const [many, setMany] = useState(false);
    const [made, setMade] = useState<Made[]>([]);
    const [busy, setBusy] = useState(false);

    const wanted = [...new Set(names.split(/\n|,/).map((name) => name.replace(/\s+/g, " ").trim()).filter((name) => name.length >= 2))].slice(0, MAX_AT_ONCE);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = (item: Made) => `${origin}${item.path}`;
    const message = (item: Made) =>
        tr(
            `Salut ${item.name.split(" ")[0]} ! Merci pour ton commentaire 🙌 Voici ton invitation personnelle NiceThings : ${link(item)}`,
            `Hi ${item.name.split(" ")[0]}! Thanks for your comment 🙌 Here is your personal NiceThings invitation: ${link(item)}`
        );

    const create = async () => {
        setBusy(true);
        const done: Made[] = [];
        try {
            for (const name of wanted) done.push(await adminPost<Made>("invitations", { name }));
            setMade(done);
            if (done.length > 1) toast(tr(`${done.length} invitations prêtes.`, `${done.length} invitations ready.`));
        } catch (error) {
            setMade(done);
            toast((error as Error).message, true);
        } finally {
            setBusy(false);
        }
    };

    const copy = async (text: string, what: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast(what);
        } catch {
            toast(tr("Copie impossible : sélectionne le texte à la main.", "Could not copy: select the text by hand."), true);
        }
    };

    return (
        <section className="a-card mb-4 p-4 md:p-5">
            <p className="flex items-center gap-2 font-bold">
                <Sparkles size={17} className="text-brand-600" />
                {tr("Inviter quelqu'un à écrire un carnet", "Invite someone to write a notebook")}
            </p>
            <p className="mt-1 max-w-2xl text-sm text-text-2">
                {tr(
                    "Un créateur, un chef, un voyageur. Tu lui envoies un lien à son nom : il arrive comme une carte d'invitation, et la personne écrit son carnet elle-même, avec ses photos et même des lieux qu'on n'a pas encore. Ce qu'elle envoie arrive ici en brouillon, signé de son nom : rien n'est publié sans toi.",
                    "A creator, a chef, a traveller. You send them a link in their name: it arrives as an invitation card, and they write their notebook themselves, with their photos and even places we do not have yet. What they send arrives here as a draft signed with their name: nothing is published without you."
                )}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
                {many ? (
                    <textarea
                        value={names}
                        onChange={(event) => setNames(event.target.value)}
                        rows={5}
                        placeholder={tr("Un nom par ligne (ceux qui ont commenté INVITE)", "One name per line (those who commented INVITE)")}
                        className="a-input min-w-0 flex-1 py-2"
                    />
                ) : (
                    <input value={names} onChange={(event) => setNames(event.target.value)} maxLength={40} placeholder={tr("Le nom de l'invité, comme il sera affiché", "The guest's name, as it will be shown")} className="a-input min-w-0 flex-1" />
                )}
                <button type="button" onClick={create} disabled={busy || wanted.length === 0} className="a-btn a-btn-primary shrink-0">
                    {busy
                        ? tr("Création…", "Creating…")
                        : wanted.length > 1
                          ? tr(`Créer ${wanted.length} invitations`, `Create ${wanted.length} invitations`)
                          : tr("Créer l'invitation", "Create the invitation")}
                </button>
            </div>
            <button type="button" onClick={() => setMany(!many)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-text-2 hover:text-text">
                <Users size={13} />
                {many ? tr("Une seule personne", "Just one person") : tr("Plusieurs à la fois (une campagne « Commente INVITE »)", "Several at once (a “comment INVITE” campaign)")}
            </button>

            {made.length === 1 && (
                <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
                    <img src={`/api/share/invitation?n=${encodeURIComponent(made[0].name)}&l=fr`} alt="" className="w-full rounded-xl border border-line" />
                    <div className="min-w-0">
                        <p className="text-sm font-bold">
                            {tr("Le lien à envoyer à", "The link to send to")} {made[0].name}
                        </p>
                        <p className="mt-1 rounded-lg bg-soft p-2 font-mono text-xs break-all">{link(made[0])}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <button type="button" onClick={() => copy(link(made[0]), tr("Lien copié.", "Link copied."))} className="a-btn a-btn-soft h-10 text-sm">
                                <Copy size={15} />
                                {tr("Copier le lien", "Copy the link")}
                            </button>
                            <button type="button" onClick={() => copy(message(made[0]), tr("Message copié : colle-le en message privé.", "Message copied: paste it in a private message."))} className="a-btn a-btn-soft h-10 text-sm">
                                <MessageCircle size={15} />
                                {tr("Copier le message", "Copy the message")}
                            </button>
                            <a href={made[0].path} target="_blank" rel="noopener noreferrer" className="a-btn a-btn-ghost h-10 text-sm">
                                <ExternalLink size={15} />
                                {tr("Voir ce qu'il verra", "See what they will see")}
                            </a>
                        </div>
                        <p className="mt-2 text-xs text-text-2">
                            {tr(
                                "Valable 60 jours. Envoie-le en message privé, jamais en commentaire public : le lien permet d'écrire sous ce nom.",
                                "Valid for 60 days. Send it in a private message, never in a public comment: the link lets anyone write under that name."
                            )}
                        </p>
                    </div>
                </div>
            )}

            {made.length > 1 && (
                <div className="mt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold">{tr(`${made.length} invitations, chacune avec son message`, `${made.length} invitations, each with its message`)}</p>
                        <button type="button" onClick={() => copy(made.map((item) => `${item.name} : ${link(item)}`).join("\n"), tr("Liste copiée.", "List copied."))} className="a-btn a-btn-ghost h-9 text-xs">
                            <Copy size={14} />
                            {tr("Copier toute la liste", "Copy the whole list")}
                        </button>
                    </div>
                    <ul className="mt-2 grid gap-2">
                        {made.map((item) => (
                            <li key={item.path} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-2.5">
                                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{item.name}</span>
                                <button type="button" onClick={() => copy(message(item), tr(`Message pour ${item.name} copié.`, `Message for ${item.name} copied.`))} className="a-btn a-btn-soft h-9 text-xs">
                                    <MessageCircle size={14} />
                                    {tr("Copier le message", "Copy the message")}
                                </button>
                                <button type="button" onClick={() => copy(link(item), tr("Lien copié.", "Link copied."))} className="a-btn a-btn-ghost h-9 text-xs">
                                    <Copy size={14} />
                                    {tr("Lien", "Link")}
                                </button>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-2 text-xs text-text-2">
                        {tr(
                            "Envoie chaque message en privé (TikTok, Instagram, WhatsApp), jamais en commentaire public : chaque lien permet d'écrire sous ce nom. Valables 60 jours.",
                            "Send each message privately (TikTok, Instagram, WhatsApp), never in a public comment: each link lets anyone write under that name. Valid for 60 days."
                        )}
                    </p>
                </div>
            )}
        </section>
    );
}
