"use client";

import { useState } from "react";
import { BellRing, CloudRain, Send, Sun } from "lucide-react";
import { useTr } from "@/components/admin/i18n";
import { timeAgo, useAdminData, useAdminToast } from "@/components/admin/ui";
import { adminPost } from "@/lib/admin-client";
import { cityBySlug } from "@/lib/cities";

type Status = { ready: boolean; phones: number; cities: { city: string; phones: number }[]; notices: { city: string; sky: string; sent: number; created_at: string }[] };
type Trial = { sent: boolean; why?: "keys" | "nobody" | "gone" | "refused"; city?: string };

// Weather notices, for the team: how many phones asked to be told, what was
// last sent, and a button to send a trial notice to the phone that signed up
// last, so one can be seen arriving without waiting for the rain.
export default function WeatherNotices() {
    const tr = useTr();
    const toast = useAdminToast();
    const { data, reload } = useAdminData<Status>("push");
    const [busy, setBusy] = useState(false);
    if (!data?.ready) return null;

    const name = (slug: string) => cityBySlug(slug)?.name ?? slug;
    const trial = async () => {
        setBusy(true);
        try {
            const answer = await adminPost<Trial>("push", {});
            if (answer.sent) toast(tr(`Alerte d'essai envoyée au dernier téléphone inscrit (${answer.city}). Regarde-le.`, `Trial alert sent to the phone that signed up last (${answer.city}). Look at it.`));
            else if (answer.why === "nobody") toast(tr("Aucun téléphone n'est encore inscrit. Fais d'abord l'étape ci-dessous sur ton téléphone.", "No phone has signed up yet. Do the step below on your phone first."), true);
            else if (answer.why === "gone") toast(tr("Ce téléphone s'était désinscrit : il a été retiré. Réinscris-toi et réessaie.", "That phone had signed off: it was removed. Sign up again and retry."), true);
            else toast(tr("Le service de notifications a refusé l'envoi. Réessaie dans un moment.", "The notification service refused it. Try again in a moment."), true);
            await reload();
        } catch (error) {
            toast((error as Error).message, true);
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="a-card mb-3 p-4 md:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <p className="flex items-center gap-2 font-bold">
                        <BellRing size={17} className="text-brand-600" />
                        {tr("Alertes météo", "Weather alerts")}
                    </p>
                    <p className="mt-1 text-sm text-text-2">
                        {data.phones === 0
                            ? tr("Activées. Aucun téléphone inscrit pour l'instant.", "Switched on. No phone signed up yet.")
                            : tr(`${data.phones} téléphone${data.phones > 1 ? "s" : ""} inscrit${data.phones > 1 ? "s" : ""} : `, `${data.phones} phone${data.phones > 1 ? "s" : ""} signed up: `) + data.cities.map((item) => `${name(item.city)} ${item.phones}`).join(", ")}
                    </p>
                </div>
                <button type="button" onClick={trial} disabled={busy} className="a-btn a-btn-soft h-10 shrink-0 text-sm">
                    <Send size={15} />
                    {busy ? tr("Envoi…", "Sending…") : tr("M'envoyer une alerte d'essai", "Send me a trial alert")}
                </button>
            </div>
            <p className="mt-3 text-xs text-text-2">
                {tr(
                    "Pour t'inscrire : ouvre nicethings.site sur ton téléphone, descends à « En ce moment », touche « Me prévenir quand il pleut » et autorise les notifications. Puis reviens ici et envoie l'essai.",
                    "To sign up: open nicethings.site on your phone, go down to “Right now”, tap “Tell me when it rains” and allow notifications. Then come back here and send the trial."
                )}
            </p>
            {data.notices.length > 0 && (
                <ul className="mt-3 grid gap-1.5 border-t border-line pt-3 text-sm">
                    {data.notices.map((notice) => (
                        <li key={notice.created_at} className="flex items-center gap-2">
                            {notice.sky === "rain" ? <CloudRain size={15} className="text-text-2" /> : <Sun size={15} className="text-text-2" />}
                            <span className="font-semibold">{name(notice.city)}</span>
                            <span className="text-text-2">
                                {tr(`${notice.sent} téléphone${notice.sent > 1 ? "s" : ""}`, `${notice.sent} phone${notice.sent > 1 ? "s" : ""}`)} · {timeAgo(notice.created_at)}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
