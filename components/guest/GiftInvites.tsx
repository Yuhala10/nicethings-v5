"use client";

import { useState } from "react";
import { Copy, Gift, MessageCircle, Star } from "lucide-react";
import { fill } from "@/lib/i18n";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";

type Given = { name: string; link: string };

// A guest of honour's three invitations to give (their own invitation link,
// once their page is out): a name in, an invitation out, with a message
// ready to send in private. Green and gold, like their rank.
export default function GiftInvites({ code, left: initial, total }: { code: string; left: number; total: number }) {
    const { t } = useLocale();
    const toast = useToast();
    const [left, setLeft] = useState(initial);
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const [given, setGiven] = useState<Given[]>([]);

    const give = async (event: React.FormEvent) => {
        event.preventDefault();
        if (busy || name.trim().length < 2 || left <= 0) return;
        setBusy(true);
        try {
            const response = await fetch("/api/invitations/gift", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, name }) });
            const data = (await response.json().catch(() => null)) as { ok?: boolean; name?: string; path?: string; left?: number; why?: string } | null;
            if (data?.ok && data.path && data.name) {
                setGiven((list) => [{ name: data.name!, link: `${window.location.origin}${data.path}` }, ...list]);
                setLeft(data.left ?? left - 1);
                setName("");
            } else {
                if (data?.why === "none-left") setLeft(0);
                toast(data?.why === "none-left" ? t.honour.giftNone : t.honour.giftFailed);
            }
        } catch {
            toast(t.honour.giftFailed);
        }
        setBusy(false);
    };

    const copy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast(t.honour.giftCopied);
        } catch {
            toast(text);
        }
    };

    return (
        <div className="relative overflow-hidden rounded-[2rem] bg-[#0a3326] p-6 text-[#fbf6e9] md:p-10">
            <span className="pointer-events-none absolute inset-2.5 rounded-[1.6rem] border border-[#e2c065]/45" aria-hidden />
            <div className="relative">
                <p className="flex items-center gap-2 text-[0.75rem] font-bold tracking-[0.24em] text-[#f3d77e] uppercase">
                    <Gift size={14} />
                    {t.honour.giftEyebrow}
                </p>
                <p className="nt-serif mt-3 text-[2.25rem] leading-[1.02] md:text-[3rem]">{t.honour.giftTitle}</p>
                {/* The three invitations, as three stars: gold while they are left. */}
                <p className="mt-4 flex gap-2" aria-label={`${left} / ${total}`}>
                    {Array.from({ length: total }, (_, index) => (
                        <Star key={index} size={22} className={index < left ? "fill-[#f3d77e] text-[#f3d77e]" : "text-[#fbf6e9]/25"} />
                    ))}
                </p>
                <p className="mt-4 max-w-xl text-[1rem] leading-relaxed text-[#fbf6e9]/75">{left > 0 ? fill(t.honour.giftLead, { left, total }) : t.honour.giftNone}</p>

                {left > 0 && (
                    <form onSubmit={give} className="mt-6 flex flex-col gap-2 sm:flex-row">
                        <label className="sr-only" htmlFor="gift-name">
                            {t.honour.giftName}
                        </label>
                        <input
                            id="gift-name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            maxLength={40}
                            placeholder={t.honour.giftName}
                            className="h-12 min-w-0 flex-1 rounded-[0.9rem] border border-[#e2c065]/40 bg-white/[0.06] px-4 text-[1rem] text-[#fbf6e9] outline-none placeholder:text-[#fbf6e9]/40 focus:border-[#e2c065]"
                        />
                        <button type="submit" disabled={busy || name.trim().length < 2} className="nt-foil-bg nt-tap h-12 shrink-0 rounded-full px-6 text-[1rem] font-bold text-[#06231a] disabled:opacity-60">
                            {t.honour.giftCreate}
                        </button>
                    </form>
                )}

                {given.length > 0 && (
                    <ul className="mt-6 grid gap-2">
                        {given.map((item) => (
                            <li key={item.link} className="rounded-[1.1rem] border border-[#e2c065]/35 bg-white/[0.04] p-4">
                                <p className="text-[0.875rem] font-semibold">{fill(t.honour.giftReady, { name: item.name })}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => void copy(fill(t.honour.giftMessage, { first: item.name.split(" ")[0], link: item.link }))}
                                        className="nt-tap inline-flex min-h-11 items-center gap-2 rounded-full bg-[#fbf6e9] px-4 text-[0.875rem] font-bold text-[#06231a]"
                                    >
                                        <MessageCircle size={15} />
                                        {t.honour.giftCopy}
                                    </button>
                                    <button type="button" onClick={() => void copy(item.link)} className="nt-tap inline-flex min-h-11 items-center gap-2 rounded-full border border-[#fbf6e9]/30 px-4 text-[0.875rem] font-bold">
                                        <Copy size={15} />
                                        {t.guestKit.copyLink}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
