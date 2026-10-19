"use client";

import Link from "next/link";
import { ArrowLeft, Check, Copy, Heart, MessageCircle, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CITIES, DEFAULT_CITY, cityBySlug } from "@/lib/cities";
import { fill } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import { defaultAvatar, randomSeed } from "@/lib/people/avatars";
import { call, dropAfterAuth, runAfterAuth, setMe, type AuthReason } from "@/lib/people/client";
import { normalizeHandle, pinProblem } from "@/lib/people/rules";
import type { Me } from "@/lib/people/types";
import { visitorId } from "../site/Analytics";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";
import AvatarPicker, { type FaceChoice } from "./AvatarPicker";
import HandleField, { type HandleState } from "./HandleField";
import { Face, Ranks, displayName } from "./Person";
import PinInput from "./PinInput";
import Sheet from "./Sheet";

// The profile sheet, opened from anywhere (lib/people/client.ts, openAuth):
// a welcome, then four short steps to join (name, face, area, PIN), the
// rescue code shown once, and a welcome with their rank. Also coming back
// on another phone, and choosing a new PIN with the rescue code.

type Screen = "intro" | "name" | "face" | "area" | "pin" | "login" | "recover" | "recovery" | "welcome";
const STEPS: Screen[] = ["name", "face", "area", "pin"];

export default function AuthSheet() {
    const { locale, t } = useLocale();
    const words = t.people;
    const toast = useToast();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState<AuthReason>("generic");
    const [screen, setScreen] = useState<Screen>("intro");
    const [busy, setBusy] = useState(false);
    const [trouble, setTrouble] = useState<string | null>(null);
    const [shake, setShake] = useState(0);

    const [handle, setHandle] = useState("");
    const [handleState, setHandleState] = useState<HandleState>("empty");
    const [name, setName] = useState("");
    const [face, setFace] = useState<FaceChoice>({ kind: "avatar", code: defaultAvatar("nicethings") });
    const [city, setCity] = useState(DEFAULT_CITY.slug);
    const [area, setArea] = useState("");
    const [pin, setPin] = useState("");
    const [pinAgain, setPinAgain] = useState("");
    const [confirming, setConfirming] = useState(false);
    const [code, setCode] = useState("");
    const [recovery, setRecovery] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [me, setNewMe] = useState<Me | null>(null);
    const [trap, setTrap] = useState("");
    // Which way they came to the rescue code: joining, or a new PIN.
    const [flow, setFlow] = useState<"join" | "rescue">("join");

    const reset = useCallback((next: Screen) => {
        setScreen(next);
        setTrouble(null);
        setPin("");
        setPinAgain("");
        setConfirming(false);
        setRecovery(null);
        setCopied(false);
        setCode("");
    }, []);

    useEffect(() => {
        const onOpen = (event: Event) => {
            const detail = (event as CustomEvent<{ reason?: AuthReason; mode?: "join" | "login" }>).detail ?? {};
            setReason(detail.reason ?? "generic");
            reset(detail.mode === "login" ? "login" : "intro");
            setFace({ kind: "avatar", code: defaultAvatar(randomSeed()) });
            try {
                const saved = localStorage.getItem("nt_city");
                if (cityBySlug(saved)) setCity(saved!);
            } catch {}
            setOpen(true);
        };
        window.addEventListener("nt:auth", onOpen);
        return () => window.removeEventListener("nt:auth", onOpen);
    }, [reset]);

    const close = useCallback(() => {
        setOpen(false);
        dropAfterAuth();
    }, []);

    // Signed in: the sheet closes and what was asked for happens.
    const finish = () => {
        setOpen(false);
        runAfterAuth();
    };

    const say = (why: string, more: Record<string, unknown> = {}) => {
        const messages: Record<string, string> = {
            wrong: screen === "recover" ? words.recover.wrong : words.login.wrong,
            slow: words.login.slow,
            suspended: words.login.suspended,
            closed: words.common.closed,
            many: words.common.many,
            pin_weak: words.pin.weak,
            pin_format: words.pin.format,
            taken: words.handle.taken,
            reserved: words.handle.reserved,
        };
        let message = messages[why] ?? words.common.failed;
        if (why === "wrong" && typeof more.left === "number" && more.left <= 3) message += ` ${fill(words.login.left, { count: more.left })}`;
        if (why === "locked" && typeof more.until === "string") {
            message = fill(words.login.locked, { time: new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(more.until)) });
        }
        setTrouble(message);
        setShake((count) => count + 1);
    };

    // ------------------------------------------------------------ joining

    const join = async (finalPin: string) => {
        setBusy(true);
        setTrouble(null);
        const answer = await call<{ me: Me; recovery: string }>("/api/me/signup", "POST", {
            handle,
            name: name.trim() || null,
            pin: finalPin,
            avatar: face.kind === "avatar" ? face.code : defaultAvatar(handle),
            city,
            area: area.trim() || null,
            v: visitorId(),
            website: trap,
        });
        if (answer.ok === false) {
            setBusy(false);
            if (answer.why === "taken" || answer.why === "reserved") {
                setScreen("name");
                setHandleState(answer.why);
            }
            setPin("");
            setPinAgain("");
            setConfirming(false);
            return say(answer.why);
        }
        let profile = answer.me;
        // Their own photo goes up once the profile exists.
        if (face.kind === "photo") {
            try {
                const response = await fetch("/api/me/photo", { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: face.blob });
                const sent = (await response.json()) as { ok?: boolean; me?: Me };
                if (sent.ok && sent.me) profile = sent.me;
            } catch {}
        }
        setMe(profile);
        setNewMe(profile);
        setRecovery(answer.recovery);
        setFlow("join");
        setBusy(false);
        setScreen("recovery");
    };

    const onPin = (value: string) => {
        const problem = pinProblem(value);
        if (problem) return say(`pin_${problem}`);
        setTrouble(null);
        setConfirming(true);
    };

    const onPinAgain = (value: string) => {
        if (value !== pin) {
            setPin("");
            setPinAgain("");
            setConfirming(false);
            setTrouble(words.pin.mismatch);
            setShake((count) => count + 1);
            return;
        }
        join(value);
    };

    // ------------------------------------------------------------ coming back

    const login = async (value = pin) => {
        if (!handle || value.length < 6) return;
        setBusy(true);
        setTrouble(null);
        const answer = await call<{ me: Me }>("/api/me/login", "POST", { handle, pin: value, website: trap });
        setBusy(false);
        if (answer.ok === false) {
            setPin("");
            return say(answer.why, answer);
        }
        setMe(answer.me);
        toast(fill(words.hello, { name: displayName(answer.me) }));
        finish();
    };

    const rescue = async () => {
        const problem = pinProblem(pin);
        if (problem) return say(`pin_${problem}`);
        if (pin !== pinAgain) {
            setPinAgain("");
            setTrouble(words.pin.mismatch);
            return;
        }
        setBusy(true);
        setTrouble(null);
        const answer = await call<{ me: Me; recovery: string }>("/api/me/recover", "POST", { handle, code, pin, website: trap });
        setBusy(false);
        if (answer.ok === false) return say(answer.why, answer);
        setMe(answer.me);
        setNewMe(answer.me);
        setRecovery(answer.recovery);
        setFlow("rescue");
        setScreen("recovery");
    };

    // ------------------------------------------------------------ screens

    const step = STEPS.indexOf(screen);
    const back = () => (step > 0 ? setScreen(STEPS[step - 1]) : setScreen("intro"));
    const pinProps = { showLabel: words.pin.show, hideLabel: words.pin.hide };
    const error = trouble && (
        <p key={shake} role="alert" className="nt-shake mt-3 text-[0.875rem] font-semibold text-closed">
            {trouble}
        </p>
    );

    return (
        <Sheet open={open} onClose={close} closeLabel={words.common.close} title={screen === "login" ? words.login.title : screen === "recover" ? words.recover.title : step >= 0 ? words.steps[step] : undefined}>
            {/* Left empty by people; filled by robots. */}
            <input value={trap} onChange={(event) => setTrap(event.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

            {step >= 0 && (
                <div className="mb-5 flex items-center gap-3">
                    <button type="button" onClick={back} aria-label={words.common.back} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex flex-1 gap-1.5" aria-hidden>
                        {STEPS.map((item, index) => (
                            <span key={item} className={`h-1.5 flex-1 rounded-full transition-colors ${index <= step ? "nt-sunset" : "bg-line"}`} />
                        ))}
                    </div>
                </div>
            )}

            {screen === "intro" && (
                <div className="pb-2">
                    <div className="relative -mx-5 -mt-2 mb-6 overflow-hidden px-5 pt-2 pb-6">
                        <div className="flex -space-x-3">
                            {["pp.k3j9x2.0.1", "tn.a8d2kq.1.4", "mc.z71mb3.0.2", "lo.p4n8tt.2.3", "pp.qq19ve.1.0"].map((sample, index) => (
                                <span key={sample} className="nt-face h-14 w-14 ring-[3px] ring-bg" style={{ zIndex: 5 - index }}>
                                    { }
                                    <img src={`/api/avatar/${sample}`} alt="" width={56} height={56} />
                                </span>
                            ))}
                        </div>
                        <p className="nt-eyebrow mt-5">{words.join.eyebrow}</p>
                        <h2 className="nt-serif mt-1.5 text-[2.25rem] leading-[1.05]">{words.join.title}</h2>
                        <p className="mt-3 text-[1rem] leading-relaxed text-text-2">{reason === "generic" ? words.join.lead : words.join.reasons[reason]}</p>
                        <ul className="mt-5 flex flex-col gap-2.5">
                            {words.join.perks.map((perk, index) => {
                                const Icon = [Star, Heart, MessageCircle][index] ?? Star;
                                return (
                                    <li key={perk} className="flex items-center gap-3 text-[0.875rem] font-medium">
                                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-700/25 dark:text-brand-200">
                                            <Icon size={15} />
                                        </span>
                                        {perk}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                    <button type="button" onClick={() => setScreen("name")} className="nt-btn nt-btn-primary w-full">
                        {words.join.create}
                    </button>
                    <button type="button" onClick={() => reset("login")} className="nt-btn nt-btn-soft mt-2.5 w-full">
                        {words.join.haveOne}
                    </button>
                    <p className="mt-4 text-center text-[0.75rem] leading-relaxed text-muted">{words.join.free}</p>
                </div>
            )}

            {screen === "name" && (
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (handleState === "free") setScreen("face");
                    }}
                >
                    <HandleField value={handle} onChange={setHandle} onState={setHandleState} words={words} area={area} autoFocus />
                    <label htmlFor="nt-name" className="mt-5 mb-2 block text-[0.875rem] font-semibold">
                        {words.handle.nameLabel}
                    </label>
                    <input id="nt-name" value={name} onChange={(event) => setName(event.target.value.slice(0, 40))} placeholder={words.handle.namePlaceholder} autoComplete="nickname" className="nt-input" />
                    {error}
                    <button type="submit" disabled={handleState !== "free"} className="nt-btn nt-btn-primary mt-6 w-full disabled:opacity-50">
                        {words.common.next}
                    </button>
                </form>
            )}

            {screen === "face" && (
                <div>
                    <AvatarPicker value={face} onChange={setFace} words={words} locale={locale} />
                    <button type="button" onClick={() => setScreen("area")} className="nt-btn nt-btn-primary sticky bottom-0 mt-5 w-full shadow-float">
                        {words.common.next}
                    </button>
                </div>
            )}

            {screen === "area" && (
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        setScreen("pin");
                    }}
                >
                    <p className="text-[1rem] leading-relaxed text-text-2">{words.area.lead}</p>
                    <label htmlFor="nt-city" className="mt-5 mb-2 block text-[0.875rem] font-semibold">
                        {words.area.city}
                    </label>
                    <select id="nt-city" value={city} onChange={(event) => setCity(event.target.value)} className="nt-input">
                        {CITIES.map((item) => (
                            <option key={item.slug} value={item.slug}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                    <label htmlFor="nt-area" className="mt-4 mb-2 block text-[0.875rem] font-semibold">
                        {words.area.area}
                    </label>
                    <input id="nt-area" value={area} onChange={(event) => setArea(event.target.value.slice(0, 60))} placeholder={words.area.areaPlaceholder} autoComplete="address-level3" className="nt-input" />
                    <button type="submit" className="nt-btn nt-btn-primary mt-6 w-full">
                        {words.common.next}
                    </button>
                </form>
            )}

            {screen === "pin" && (
                <div>
                    <p className="text-[1rem] leading-relaxed text-text-2">{words.pin.lead}</p>
                    <div className="mt-5">
                        {confirming ? (
                            <PinInput key="again" label={words.pin.again} value={pinAgain} onChange={setPinAgain} onComplete={onPinAgain} autoFocus {...pinProps} />
                        ) : (
                            <PinInput key="first" label={words.pin.title} value={pin} onChange={setPin} onComplete={onPin} autoFocus invalid={Boolean(trouble)} {...pinProps} />
                        )}
                    </div>
                    {error}
                    <p className="mt-4 rounded-[1rem] bg-surface-2 px-4 py-3 text-[0.75rem] leading-relaxed font-semibold text-text-2">{words.pin.warn}</p>
                    {busy && <p className="mt-4 text-center text-[0.875rem] font-semibold text-muted">{words.common.saving}</p>}
                </div>
            )}

            {screen === "recovery" && recovery && (
                <div>
                    <p className="nt-eyebrow">{words.recovery.title}</p>
                    <p className="mt-2 text-[1rem] leading-relaxed text-text-2">{words.recovery.lead}</p>
                    <div className="mt-5 rounded-[1.25rem] bg-[#15110e] px-5 py-6 text-center">
                        <p className="font-mono text-[1.75rem] font-bold tracking-[0.12em] text-[#f6dd86] select-all">{recovery}</p>
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard?.writeText(recovery).then(() => setCopied(true), () => {});
                            }}
                            className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-[0.875rem] font-semibold text-white"
                        >
                            {copied ? <Check size={15} /> : <Copy size={15} />}
                            {copied ? words.recovery.copied : words.recovery.copy}
                        </button>
                    </div>
                    <p className="mt-3 text-[0.875rem] font-semibold text-text-2">{words.recovery.keep}</p>
                    <button type="button" onClick={() => {
                            if (flow === "join") return setScreen("welcome");
                            if (me) toast(fill(words.hello, { name: displayName(me) }));
                            finish();
                        }} className="nt-btn nt-btn-primary mt-6 w-full">
                        {words.recovery.done}
                    </button>
                </div>
            )}

            {screen === "welcome" && me && (
                <div className="pb-2 text-center">
                    <Face person={me} size={104} className="mx-auto shadow-card" />
                    <h2 className="nt-serif mt-5 text-[2.25rem] leading-[1.05]">{fill(words.welcome.title, { name: displayName(me) })}</h2>
                    <p className="mt-1 text-[0.875rem] text-muted">
                        @{me.handle} · {fill(words.memberNo, { number: me.memberNo })}
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <Ranks person={me} locale={locale} />
                    </div>
                    {me.memberNo <= 100 && <p className="mt-4 text-[0.875rem] leading-relaxed font-semibold text-[#9a7424] dark:text-[#e2c065]">{words.welcome.pioneer}</p>}
                    <p className="mt-3 text-[1rem] leading-relaxed text-text-2">{words.welcome.lead}</p>
                    <button type="button" onClick={finish} className="nt-btn nt-btn-primary mt-6 w-full">
                        {words.welcome.go}
                    </button>
                    <Link href={paths.me(locale)} onClick={finish} className="nt-btn nt-btn-soft mt-2.5 w-full">
                        {words.welcome.view}
                    </Link>
                </div>
            )}

            {screen === "login" && (
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        login();
                    }}
                >
                    <p className="text-[1rem] leading-relaxed text-text-2">{words.login.lead}</p>
                    <label htmlFor="nt-login-handle" className="mt-5 mb-2 block text-[0.875rem] font-semibold">
                        {words.handle.label}
                    </label>
                    <div className="flex h-[3.25rem] items-center rounded-[0.9rem] border-[1.5px] border-line-strong bg-surface px-3.5 focus-within:border-text-2">
                        <span className="text-[1.125rem] font-semibold text-muted">@</span>
                        <input
                            id="nt-login-handle"
                            value={handle}
                            onChange={(event) => setHandle(normalizeHandle(event.target.value))}
                            autoCapitalize="none"
                            autoCorrect="off"
                            autoComplete="username"
                            spellCheck={false}
                            autoFocus
                            className="min-w-0 flex-1 bg-transparent pl-0.5 text-[1.125rem] font-semibold outline-none"
                        />
                    </div>
                    <div className="mt-5">
                        <PinInput label={words.pin.title} value={pin} onChange={setPin} onComplete={(value) => login(value)} invalid={Boolean(trouble)} {...pinProps} />
                    </div>
                    {error}
                    <button type="submit" disabled={busy || !handle || pin.length < 6} className="nt-btn nt-btn-primary mt-6 w-full disabled:opacity-50">
                        {busy ? words.common.saving : words.login.go}
                    </button>
                    <div className="mt-4 flex items-center justify-between text-[0.875rem] font-semibold">
                        <button type="button" onClick={() => reset("recover")} className="nt-tap text-brand-600">
                            {words.login.forgot}
                        </button>
                        <button type="button" onClick={() => reset("intro")} className="nt-tap text-muted">
                            {words.login.noProfile}
                        </button>
                    </div>
                </form>
            )}

            {screen === "recover" && (
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        rescue();
                    }}
                >
                    <p className="text-[1rem] leading-relaxed text-text-2">{words.recover.lead}</p>
                    <label htmlFor="nt-rescue-handle" className="mt-5 mb-2 block text-[0.875rem] font-semibold">
                        {words.handle.label}
                    </label>
                    <input id="nt-rescue-handle" value={handle} onChange={(event) => setHandle(normalizeHandle(event.target.value))} autoCapitalize="none" autoCorrect="off" className="nt-input" />
                    <label htmlFor="nt-rescue-code" className="mt-4 mb-2 block text-[0.875rem] font-semibold">
                        {words.recover.code}
                    </label>
                    <input
                        id="nt-rescue-code"
                        value={code}
                        onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 16))}
                        placeholder="XXXX-XXXX-XXXX"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        className="nt-input font-mono tracking-[0.1em]"
                    />
                    <div className="mt-5">
                        <PinInput label={words.me.newPin} value={pin} onChange={setPin} {...pinProps} />
                    </div>
                    <div className="mt-4">
                        <PinInput label={words.pin.again} value={pinAgain} onChange={setPinAgain} {...pinProps} />
                    </div>
                    {error}
                    <button type="submit" disabled={busy || !handle || code.length < 12 || pin.length < 6 || pinAgain.length < 6} className="nt-btn nt-btn-primary mt-6 w-full disabled:opacity-50">
                        {busy ? words.common.saving : words.recover.go}
                    </button>
                </form>
            )}
        </Sheet>
    );
}
