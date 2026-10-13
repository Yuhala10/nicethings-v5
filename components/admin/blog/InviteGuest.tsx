"use client";

import { useState } from "react";
import { Copy, ExternalLink, MessageCircle, Sparkles } from "lucide-react";
import { useTr } from "@/components/admin/i18n";
import { useAdminToast } from "@/components/admin/ui";
import { adminPost } from "@/lib/admin-client";

type Made = { name: string; path: string; until: string | null };

// The team invites one person to write a guest's notebook: a name in, a link
// out (lib/invitations.ts). The link travels as an invitation card bearing
// that name, and opens their notebook space; what they send arrives in this
// list as a draft signed with their name.
export default function InviteGuest() {
    const tr = useTr();
    const toast = useAdminToast();
    const [name, setName] = useState("");
    const [made, setMade] = useState<Made | null>(null);
    const [busy, setBusy] = useState(false);

    const create = async () => {
        setBusy(true);
        try {
            setMade(await adminPost<Made>("invitations", { name }));
        } catch (error) {
            toast((error as Error).message, true);
        } finally {
            setBusy(false);
        }
    };

    const link = made && typeof window !== "undefined" ? `${window.location.origin}${made.path}` : "";
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            toast(tr("Lien copié.", "Link copied."));
        } catch {
            toast(tr("Copie impossible : sélectionne le lien à la main.", "Could not copy: select the link by hand."), true);
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
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} placeholder={tr("Le nom de l'invité, comme il sera affiché", "The guest's name, as it will be shown")} className="a-input min-w-0 flex-1" />
                <button type="button" onClick={create} disabled={busy || name.trim().length < 2} className="a-btn a-btn-primary shrink-0">
                    {busy ? tr("Création…", "Creating…") : tr("Créer l'invitation", "Create the invitation")}
                </button>
            </div>

            {made && (
                <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
                    <img src={`/api/share/invitation?n=${encodeURIComponent(made.name)}&l=fr`} alt="" className="w-full rounded-xl border border-line" />
                    <div className="min-w-0">
                        <p className="text-sm font-bold">
                            {tr("Le lien à envoyer à", "The link to send to")} {made.name}
                        </p>
                        <p className="mt-1 rounded-lg bg-soft p-2 font-mono text-xs break-all">{link}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <button type="button" onClick={copy} className="a-btn a-btn-soft h-10 text-sm">
                                <Copy size={15} />
                                {tr("Copier", "Copy")}
                            </button>
                            <a href={`https://wa.me/?text=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer" className="a-btn a-btn-soft h-10 text-sm">
                                <MessageCircle size={15} />
                                WhatsApp
                            </a>
                            <a href={made.path} target="_blank" rel="noopener noreferrer" className="a-btn a-btn-ghost h-10 text-sm">
                                <ExternalLink size={15} />
                                {tr("Voir ce qu'il verra", "See what they will see")}
                            </a>
                        </div>
                        <p className="mt-2 text-xs text-text-2">
                            {tr(
                                "Valable 60 jours. Envoie le lien seul, sans texte autour : la carte s'affiche avec son nom.",
                                "Valid for 60 days. Send the link alone, with no text around it: the card shows with their name."
                            )}
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
}
