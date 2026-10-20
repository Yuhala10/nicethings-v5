"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { call, useMe } from "@/lib/people/client";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";
import VerifiedTick from "../place/VerifiedTick";
import Sheet from "./Sheet";

// In "Moi": the verified badge. Verified, it says so; otherwise a request
// to the team (who they are, a link that proves it, a word), and where it
// stands.

const KINDS = ["creator", "business", "public", "other"] as const;

export default function VerifyRequest() {
    const { t } = useLocale();
    const words = t.people.verify;
    const toast = useToast();
    const { me } = useMe();
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<"none" | "PENDING" | "DECLINED" | "APPROVED" | null>(null);
    const [kind, setKind] = useState<(typeof KINDS)[number]>("creator");
    const [link, setLink] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [trouble, setTrouble] = useState<string | null>(null);

    useEffect(() => {
        if (!me || me.verified) return;
        let gone = false;
        call<{ request: { status: "PENDING" | "DECLINED" | "APPROVED" } | null }>("/api/me/verify", "GET").then((answer) => {
            if (!gone && answer.ok === true) setStatus(answer.request?.status ?? "none");
        });
        return () => {
            gone = true;
        };
    }, [me]);

    if (!me) return null;
    if (me.verified) {
        return (
            <div className="flex min-h-14 items-center gap-3.5 px-4">
                <VerifiedTick size={20} tone={me.role === "founder" ? "gold" : "blue"} />
                <span className="flex-1 text-[1rem] font-semibold">{words.yours}</span>
                <span className="text-[0.75rem] text-muted">{me.role === "founder" ? words.founder : me.role === "team" ? words.team : (me.verifiedLabel ?? words.badge)}</span>
            </div>
        );
    }

    const send = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!link.trim()) return setTrouble(words.needLink);
        setBusy(true);
        setTrouble(null);
        const answer = await call("/api/me/verify", "POST", { kind, link, note });
        setBusy(false);
        if (answer.ok === false) {
            if (answer.why === "pending") return setStatus("PENDING");
            return setTrouble(answer.why === "many" ? words.declined : answer.why === "link" ? words.needLink : t.people.common.failed);
        }
        setStatus("PENDING");
        setOpen(false);
        toast(words.sent);
    };

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} className="flex min-h-14 w-full items-center gap-3.5 px-4 text-left transition hover:bg-surface-2">
                <VerifiedTick size={19} />
                <span className="min-w-0 flex-1">
                    <span className="block text-[1rem] font-semibold">{words.ask}</span>
                    {status === "PENDING" && <span className="block text-[0.75rem] text-[#b7791f]">{words.pending}</span>}
                    {status === "DECLINED" && <span className="block text-[0.75rem] text-muted">{words.declined}</span>}
                </span>
                <ChevronRight size={17} className="text-muted" />
            </button>
            <Sheet open={open} onClose={() => setOpen(false)} closeLabel={t.people.common.close} title={words.askTitle}>
                <div className="flex items-center gap-3">
                    <VerifiedTick size={40} />
                    <p className="text-[0.875rem] leading-relaxed text-text-2">{words.askLead}</p>
                </div>
                {status === "PENDING" ? (
                    <p className="mt-5 rounded-[1rem] bg-surface-2 px-4 py-3 text-[0.875rem] font-semibold">{words.pending}</p>
                ) : (
                    <form onSubmit={send}>
                        <p className="mt-5 mb-2 text-[0.875rem] font-semibold">{words.kind}</p>
                        <div className="flex flex-wrap gap-2">
                            {KINDS.map((key) => (
                                <button key={key} type="button" aria-pressed={kind === key} onClick={() => setKind(key)} className="nt-chip h-9 text-[0.875rem]">
                                    {words.kinds[key]}
                                </button>
                            ))}
                        </div>
                        <label htmlFor="verify-link" className="mt-5 mb-2 block text-[0.875rem] font-semibold">
                            {words.link}
                        </label>
                        <input id="verify-link" value={link} onChange={(event) => setLink(event.target.value.slice(0, 200))} placeholder={words.linkPlaceholder} inputMode="url" autoCapitalize="none" className="nt-input" />
                        <label htmlFor="verify-note" className="mt-4 mb-2 block text-[0.875rem] font-semibold">
                            {words.note}
                        </label>
                        <textarea id="verify-note" value={note} onChange={(event) => setNote(event.target.value.slice(0, 300))} rows={3} className="nt-input" />
                        {trouble && (
                            <p role="alert" className="mt-3 text-[0.875rem] font-semibold text-closed">
                                {trouble}
                            </p>
                        )}
                        <button type="submit" disabled={busy} className="nt-btn nt-btn-primary mt-5 w-full disabled:opacity-60">
                            {busy ? t.people.common.saving : words.send}
                        </button>
                    </form>
                )}
            </Sheet>
        </>
    );
}
