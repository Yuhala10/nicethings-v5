"use client";

import { useState } from "react";
import { formatNumber } from "@/lib/i18n/format";
import { call } from "@/lib/people/client";
import { COMPANIES, MAX_OUTING_BODY, MOODS } from "@/lib/people/rules";
import type { OutingView } from "@/lib/people/types";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";
import Sheet from "./Sheet";
import SoundPicker from "./SoundPicker";

// "Modifier": its author changes what was said about the outing (the vibe,
// the music, who with, the price, the words). The photos and the place stay.
// Mounted when opened, so it starts from the outing as it is.

export default function OutingEdit({ outing, onClose, onSaved }: { outing: OutingView; onClose: () => void; onSaved: (outing: OutingView) => void }) {
    const { locale, t } = useLocale();
    const words = t.people.outing;
    const toast = useToast();
    const [mood, setMood] = useState(outing.mood);
    const [sound, setSound] = useState(outing.sound);
    const [company, setCompany] = useState(outing.company);
    const [price, setPrice] = useState(outing.pricePaid ? formatNumber(outing.pricePaid, locale) : "");
    const [body, setBody] = useState(outing.body ?? "");
    const [busy, setBusy] = useState(false);
    const [trouble, setTrouble] = useState("");
    const video = outing.media.some((item) => item.kind === "video");
    const chip = "nt-chip h-9 text-[0.875rem]";

    const save = async () => {
        setBusy(true);
        setTrouble("");
        const answer = await call<{ outing?: OutingView; status: OutingView["status"] }>("/api/outings", "PATCH", {
            id: outing.id,
            action: "edit",
            body,
            mood,
            sound,
            company,
            pricePaid: Number(price.replace(/\D/g, "")) || null,
        });
        setBusy(false);
        if (answer.ok !== true) return setTrouble(t.people.common.failed);
        onSaved(answer.outing ?? { ...outing, mood, sound, company, body: body.trim() || null, status: answer.status });
        toast(answer.status === "PENDING" && outing.status === "PUBLISHED" ? t.people.post.rereading : t.people.post.saved);
        onClose();
    };

    return (
        <Sheet open onClose={onClose} closeLabel={t.people.common.close} title={t.people.post.editTitle}>
            <p className="mt-1 mb-2 text-[0.875rem] font-semibold">{words.mood}</p>
            <div className="flex flex-wrap gap-2">
                {MOODS.map((key) => (
                    <button key={key} type="button" aria-pressed={mood === key} onClick={() => setMood(mood === key ? null : key)} className={chip}>
                        {words.moods[key]}
                    </button>
                ))}
            </div>
            <p className="mt-5 mb-1 text-[0.875rem] font-semibold">🎵 {t.people.post.music}</p>
            <SoundPicker value={sound} onChange={setSound} video={video} />
            <p className="mt-5 mb-2 text-[0.875rem] font-semibold">{words.with}</p>
            <div className="flex flex-wrap gap-2">
                {COMPANIES.map((key) => (
                    <button key={key} type="button" aria-pressed={company === key} onClick={() => setCompany(company === key ? null : key)} className={chip}>
                        {t.people.companies[key]}
                    </button>
                ))}
            </div>
            <label htmlFor={`edit-price-${outing.id}`} className="mt-5 mb-2 block text-[0.875rem] font-semibold">
                {words.paid}
            </label>
            <div className="flex items-center gap-2">
                <input
                    id={`edit-price-${outing.id}`}
                    value={price}
                    inputMode="numeric"
                    onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, "").slice(0, 7);
                        setPrice(digits ? formatNumber(Number(digits), locale) : "");
                    }}
                    placeholder={t.people.reviews.paidPlaceholder}
                    className="nt-input max-w-[11rem]"
                />
                <span className="text-[0.875rem] font-semibold text-muted">{t.common.currency}</span>
            </div>
            <label htmlFor={`edit-body-${outing.id}`} className="mt-5 mb-2 block text-[0.875rem] font-semibold">
                {words.body}
            </label>
            <textarea id={`edit-body-${outing.id}`} value={body} onChange={(event) => setBody(event.target.value.slice(0, MAX_OUTING_BODY))} placeholder={words.bodyPlaceholder} rows={4} className="nt-input" />
            {trouble && (
                <p role="alert" className="mt-3 text-[0.875rem] font-semibold text-closed">
                    {trouble}
                </p>
            )}
            <button type="button" onClick={save} disabled={busy} className="nt-btn nt-btn-primary sticky bottom-0 mt-5 w-full shadow-float disabled:opacity-60">
                {busy ? t.people.common.saving : t.people.common.save}
            </button>
        </Sheet>
    );
}
