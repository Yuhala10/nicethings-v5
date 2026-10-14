"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import { CITIES, DEFAULT_CITY } from "@/lib/cities";
import { LIKES, PLATFORMS, type Like, type Platform } from "@/lib/guest-request";
import { fill } from "@/lib/i18n";
import { visitorId } from "../site/Analytics";
import { useLocale } from "../site/LocaleProvider";

// "Demande ton invitation": who you are, where to find you, what you love
// to show. It goes to the team, who look at the account and invite, or not
// (app/api/invitations/request). It promises nothing it cannot keep.

const FIELD = "h-12 w-full rounded-[0.9rem] border border-white/15 bg-white/[0.06] px-4 text-[1rem] text-[#faf7f2] outline-none transition placeholder:text-[#faf7f2]/35 focus:border-[#d9bc8c]";
const LABEL = "text-[0.875rem] font-semibold text-[#faf7f2]/85";
const CHIP = "nt-tap min-h-11 rounded-full border px-4 text-[0.875rem] font-semibold transition";

export default function RequestInvitation() {
    const { t } = useLocale();
    const words = t.guestRequest;
    const [name, setName] = useState("");
    const [handle, setHandle] = useState("");
    const [platform, setPlatform] = useState<Platform>("instagram");
    const [likes, setLikes] = useState<Like[]>([]);
    const [city, setCity] = useState(DEFAULT_CITY.slug);
    const [link, setLink] = useState("");
    const [why, setWhy] = useState("");
    const [trap, setTrap] = useState("");
    const [state, setState] = useState<"idle" | "sending" | "done">("idle");
    const [trouble, setTrouble] = useState<string | null>(null);

    const send = async (event: React.FormEvent) => {
        event.preventDefault();
        setTrouble(null);
        if (name.trim().length < 2) return setTrouble(words.needName);
        if (!/^@?[A-Za-z0-9._]{2,30}$/.test(handle.trim()) && !/^https?:\/\//.test(handle.trim())) return setTrouble(words.needHandle);
        setState("sending");
        try {
            const response = await fetch("/api/invitations/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, handle, platform, likes, city, link: link.trim(), why, v: visitorId(), website: trap }),
            });
            const answer = (await response.json().catch(() => ({}))) as { ok?: boolean; why?: string };
            if (answer.ok) {
                setState("done");
                return;
            }
            setTrouble(answer.why === "handle" ? words.needHandle : answer.why === "name" ? words.needName : answer.why === "many" ? words.tooMany : answer.why === "closed" ? words.closed : words.failed);
        } catch {
            setTrouble(words.failed);
        }
        setState("idle");
    };

    if (state === "done") {
        return (
            <div className="text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#d9bc8c]/60 text-[#d9bc8c]">
                    <Check size={26} />
                </span>
                <p className="nt-serif mt-6 text-[2.75rem] leading-[1]">{fill(words.doneTitle, { name: name.trim().split(" ")[0] })}</p>
                <p className="mx-auto mt-4 max-w-md text-[1.125rem] leading-relaxed text-[#faf7f2]/75">{fill(words.doneBody, { platform: words.platforms[platform] })}</p>
            </div>
        );
    }

    return (
        <form onSubmit={send} className="grid gap-5">
            <label className="grid gap-1.5">
                <span className={LABEL}>{words.name}</span>
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} autoComplete="name" className={FIELD} />
            </label>

            <div className="grid gap-2">
                <span className={LABEL}>{words.platform}</span>
                <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((item) => (
                        <button key={item} type="button" onClick={() => setPlatform(item)} aria-pressed={platform === item} className={`${CHIP} ${platform === item ? "border-[#d9bc8c] bg-[#d9bc8c] text-[#15110e]" : "border-white/20 text-[#faf7f2]/85 hover:bg-white/10"}`}>
                            {words.platforms[item]}
                        </button>
                    ))}
                </div>
            </div>

            <label className="grid gap-1.5">
                <span className={LABEL}>{words.handle}</span>
                <input value={handle} onChange={(event) => setHandle(event.target.value)} maxLength={120} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder={words.handleHint} className={FIELD} />
            </label>

            <div className="grid gap-2">
                <span className={LABEL}>{words.likes}</span>
                <div className="flex flex-wrap gap-2">
                    {LIKES.map((item) => {
                        const on = likes.includes(item);
                        return (
                            <button key={item} type="button" onClick={() => setLikes(on ? likes.filter((like) => like !== item) : [...likes, item])} aria-pressed={on} className={`${CHIP} ${on ? "border-[#d9bc8c] bg-[#d9bc8c] text-[#15110e]" : "border-white/20 text-[#faf7f2]/85 hover:bg-white/10"}`}>
                                {words.likeOptions[item]}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5">
                    <span className={LABEL}>{words.city}</span>
                    <select value={city} onChange={(event) => setCity(event.target.value)} className={`${FIELD} [&>option]:text-[#15110e]`}>
                        {CITIES.map((item) => (
                            <option key={item.slug} value={item.slug}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="grid gap-1.5">
                    <span className={LABEL}>{words.link}</span>
                    <input value={link} onChange={(event) => setLink(event.target.value)} maxLength={200} inputMode="url" placeholder="https://…" className={FIELD} />
                </label>
            </div>

            <label className="grid gap-1.5">
                <span className={LABEL}>{words.why}</span>
                <textarea
                    value={why}
                    onChange={(event) => setWhy(event.target.value)}
                    maxLength={400}
                    rows={3}
                    placeholder={words.whyHint}
                    className="w-full rounded-[0.9rem] border border-white/15 bg-white/[0.06] px-4 py-3 text-[1rem] leading-relaxed text-[#faf7f2] outline-none transition placeholder:text-[#faf7f2]/35 focus:border-[#d9bc8c]"
                />
            </label>
            {/* Left empty by people; filled by robots. */}
            <input value={trap} onChange={(event) => setTrap(event.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

            <div>
                <button type="submit" disabled={state === "sending"} className="nt-btn h-14 w-full bg-[#faf7f2] text-[1.125rem] text-[#15110e] hover:bg-white disabled:opacity-60">
                    <Send size={18} />
                    {state === "sending" ? words.sending : words.send}
                </button>
                {trouble && (
                    <p role="alert" className="mt-3 text-center text-[0.875rem] font-semibold text-[#ffb59a]">
                        {trouble}
                    </p>
                )}
                <p className="mt-4 text-center text-[0.875rem] leading-relaxed text-[#faf7f2]/70">{words.promise}</p>
                <p className="mt-1 text-center text-[0.75rem] text-[#faf7f2]/45">{words.privacy}</p>
            </div>
        </form>
    );
}
