"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    BadgeCheck,
    Camera,
    Check,
    CheckCircle2,
    Copy,
    FileText,
    Globe,
    IdCard,
    LocateFixed,
    MessageSquareWarning,
    Phone,
    ShieldCheck,
    Trash2,
    type LucideIcon,
} from "lucide-react";
import type { PublicClaim } from "@/lib/claims/server";
import { fill } from "@/lib/i18n";
import { formatRelativeDays } from "@/lib/i18n/format";
import { paths } from "@/lib/places/paths";
import type { PlaceSummary } from "@/lib/places/types";
import { PlaceThumb } from "../place/bits";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";
import GoogleButton from "./GoogleButton";
import { proCall, useOwner } from "./useOwner";

type Step = 1 | 2 | 3;

// Confirmed only right at the place, with a precise reading.
function onSite(claim: PublicClaim) {
    return claim.onsite_distance_m !== null && claim.onsite_distance_m <= 50 && (claim.onsite_accuracy ?? 999) <= 50;
}

function strengthOf(claim: PublicClaim) {
    const strong = Number(Boolean(claim.phone_verified_at)) + Number(claim.documents.some((file) => file.kind === "business" || file.kind === "id"));
    const support =
        Number(claim.documents.some((file) => file.kind === "storefront")) +
        Number(Boolean(claim.social_url)) +
        Number(onSite(claim)) +
        Number(claim.phone_code_requested && !claim.phone_verified_at);
    return Math.min(100, strong * 40 + support * 15);
}

function ProofCard({ icon: Icon, title, badge, done, children }: { icon: LucideIcon; title: string; badge: string; done: boolean; children: ReactNode }) {
    return (
        <section className={`rounded-[1.6rem] border bg-surface p-5 shadow-card transition ${done ? "border-open/40" : "border-line"}`}>
            <div className="flex items-start gap-3">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${done ? "bg-open/15 text-open" : "nt-sunset text-white"}`}>
                    {done ? <Check size={20} strokeWidth={2.6} /> : <Icon size={20} />}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[0.7rem] font-extrabold tracking-wider text-brand-600 uppercase">{badge}</p>
                    <h3 className="font-display text-lg leading-tight font-extrabold">{title}</h3>
                </div>
            </div>
            <div className="mt-3 text-sm text-text-2">{children}</div>
        </section>
    );
}

// Claiming a place: who you are, your proofs, then the team checks.
export default function ClaimWizard({ place }: { place: PlaceSummary }) {
    const { locale, t } = useLocale();
    const toast = useToast();
    const { data, loading } = useOwner();
    const [claim, setClaim] = useState<PublicClaim | null>(null);
    const [owned, setOwned] = useState(false);
    const [step, setStep] = useState<Step>(1);
    const [busy, setBusy] = useState<string | null>(null);
    const [form, setForm] = useState({ full_name: "", role: "OWNER", phone: "", statement: false, social_url: "" });
    const [code, setCode] = useState("");
    const [previews, setPreviews] = useState<Record<string, string>>({});
    const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
    const here = paths.claim(locale, place.slug);

    // Signed in: open (or resume) the claim.
    useEffect(() => {
        if (!data?.user || data.setup) return;
        proCall<{ claim?: PublicClaim; owned?: boolean }>("claims", { method: "POST", body: JSON.stringify({ slug: place.slug }) })
            .then((result) => {
                if (result.owned) setOwned(true);
                if (result.claim) {
                    setClaim(result.claim);
                    setForm((current) => ({
                        ...current,
                        full_name: result.claim!.full_name || data.user?.name || "",
                        role: result.claim!.role,
                        phone: result.claim!.phone,
                        statement: Boolean(result.claim!.statement_accepted_at),
                        social_url: result.claim!.social_url ?? "",
                    }));
                    if (result.claim.full_name && result.claim.phone && result.claim.statement_accepted_at) setStep(2);
                }
            })
            .catch((error) => toast((error as Error).message));
    }, [data?.user?.id]);

    const run = async (key: string, task: () => Promise<{ claim: PublicClaim }>, success?: string) => {
        setBusy(key);
        try {
            const result = await task();
            setClaim(result.claim);
            if (success) toast(success);
            return true;
        } catch (error) {
            toast((error as Error).message);
            return false;
        } finally {
            setBusy(null);
        }
    };

    const post = (body: Record<string, unknown>) => proCall<{ claim: PublicClaim }>(`claims/${claim!.id}`, { method: "POST", body: JSON.stringify(body) });

    const upload = (kind: string) => async (file: File | undefined) => {
        if (!file || !claim) return;
        const body = new FormData();
        body.set("kind", kind);
        body.set("file", file);
        const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
        await run(`file-${kind}`, async () => {
            const result = await proCall<{ claim: PublicClaim }>(`claims/${claim.id}/files`, { method: "POST", body });
            const added = result.claim.documents[result.claim.documents.length - 1];
            if (preview && added) setPreviews((current) => ({ ...current, [added.id]: preview }));
            return result;
        });
    };

    const locate = () => {
        if (!("geolocation" in navigator) || !claim) return;
        setBusy("onsite");
        navigator.geolocation.getCurrentPosition(
            (position) => {
                void run("onsite", () => post({ action: "onsite", lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy }));
            },
            () => {
                setBusy(null);
                toast(t.submit.denied);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const header = (
        <header className="flex items-center gap-4">
            <PlaceThumb cover={place.cover} category={place.category} name={place.name} sizes="80px" className="h-20 w-20 shrink-0 rounded-[1.4rem]" iconSize={28} />
            <div className="min-w-0">
                <p className="nt-eyebrow">{t.pro.title}</p>
                <h1 className="font-display text-[1.6rem] leading-tight font-extrabold md:text-3xl">{fill(t.claim.title, { name: place.name })}</h1>
            </div>
        </header>
    );

    if (loading) {
        return (
            <div className="mx-auto max-w-2xl px-4 pt-6 md:px-6">
                {header}
                <div className="nt-skeleton mt-6 h-64 rounded-3xl" />
            </div>
        );
    }

    if (!data?.user) {
        return (
            <div className="mx-auto max-w-2xl px-4 pt-6 pb-10 md:px-6 md:pt-10">
                {header}
                <p className="mt-4 text-text-2">{t.claim.lead}</p>
                <div className="mt-6 rounded-[1.8rem] border border-line bg-surface p-6 shadow-card">
                    <p className="mb-4 font-semibold">{t.claim.signInFirst}</p>
                    <GoogleButton next={here} />
                </div>
            </div>
        );
    }

    if (owned) {
        return (
            <div className="mx-auto max-w-2xl px-4 pt-6 pb-10 md:px-6 md:pt-10">
                {header}
                <div className="mt-6 rounded-3xl bg-open/10 p-6 text-center">
                    <BadgeCheck size={40} className="mx-auto text-open" />
                    <p className="mt-2 font-display text-xl font-extrabold">{t.claim.alreadyOwner}</p>
                    <Link href={paths.manage(locale, place.slug)} className="nt-btn nt-btn-primary mt-4">
                        {t.claim.manageNow}
                    </Link>
                </div>
            </div>
        );
    }

    if (!claim) {
        return (
            <div className="mx-auto max-w-2xl px-4 pt-6 md:px-6">
                {header}
                {data.setup ? <p className="mt-6 rounded-2xl bg-surface-2 px-4 py-3 font-semibold">{t.pro.notSetUp}</p> : <div className="nt-skeleton mt-6 h-64 rounded-3xl" />}
            </div>
        );
    }

    const strength = strengthOf(claim);
    const editable = claim.status === "DRAFT" || claim.status === "NEEDS_INFO";
    const proofsOpen = editable || claim.status === "PENDING";

    const proofs = (
        <div className="grid gap-4">
            <div className="rounded-[1.6rem] bg-ink p-5 text-white">
                <p className="text-xs font-bold tracking-wider text-white/60 uppercase">{t.claim.yourCode}</p>
                <div className="mt-1 flex items-center gap-3">
                    <p className="font-mono text-3xl font-extrabold tracking-[0.12em]">{claim.code}</p>
                    <button
                        type="button"
                        onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(claim.code);
                                toast(t.common.copied);
                            } catch {}
                        }}
                        className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
                        aria-label="Copier"
                    >
                        <Copy size={17} />
                    </button>
                </div>
                <p className="mt-2 text-sm text-white/70">{t.claim.yourCodeHint}</p>
            </div>

            <ProofCard icon={Phone} title={t.claim.phoneTitle} badge={t.claim.strong} done={Boolean(claim.phone_verified_at)}>
                {!claim.listing_phone ? (
                    <p>{t.claim.phoneNone}</p>
                ) : claim.phone_verified_at ? (
                    <p className="font-bold text-open">{t.claim.phoneVerified}</p>
                ) : (
                    <>
                        <p>{fill(t.claim.phoneBody, { phone: claim.listing_phone })}</p>
                        {!claim.phone_code_requested ? (
                            <button type="button" disabled={!proofsOpen || busy !== null} onClick={() => run("phone", () => post({ action: "phone_request" }), t.claim.phoneRequested)} className="nt-btn nt-btn-primary mt-3 h-11 text-sm">
                                <Phone size={16} />
                                {t.claim.phoneRequest}
                            </button>
                        ) : (
                            <div className="mt-3">
                                <p className="font-semibold text-text">
                                    {claim.phone_code_sent_at ? fill(t.claim.phoneSent, { ago: formatRelativeDays(claim.phone_code_sent_at, locale) }) : t.claim.phoneRequested}
                                </p>
                                <form
                                    className="mt-2 flex gap-2"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        void run("verify", () => post({ action: "phone_verify", code }), t.claim.phoneVerified).then((ok) => ok && setCode(""));
                                    }}
                                >
                                    <input
                                        value={code}
                                        onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        placeholder={t.claim.phoneEnter}
                                        className="nt-input h-12 max-w-[11rem] text-center font-mono text-lg tracking-[0.3em]"
                                    />
                                    <button type="submit" disabled={code.length !== 6 || busy !== null} className="nt-btn nt-btn-primary h-12 px-4 text-sm">
                                        {t.claim.phoneVerify}
                                    </button>
                                </form>
                            </div>
                        )}
                    </>
                )}
            </ProofCard>

            <ProofCard icon={Camera} title={t.claim.photoTitle} badge={t.claim.support} done={claim.documents.some((file) => file.kind === "storefront")}>
                <p>{fill(t.claim.photoBody, { code: claim.code })}</p>
            </ProofCard>

            <ProofCard icon={FileText} title={t.claim.papersTitle} badge={t.claim.strong} done={claim.documents.some((file) => file.kind === "business" || file.kind === "id")}>
                <p>{t.claim.papersBody}</p>
            </ProofCard>

            {proofsOpen && (
                <div className="grid grid-cols-3 gap-2">
                    {(
                        [
                            ["storefront", Camera, t.claim.addStorefront, "image/*"],
                            ["business", FileText, t.claim.addBusiness, "image/*,application/pdf"],
                            ["id", IdCard, t.claim.addId, "image/*,application/pdf"],
                        ] as const
                    ).map(([kind, Icon, label, accept]) => (
                        <div key={kind}>
                            <button
                                type="button"
                                disabled={busy !== null}
                                onClick={() => fileInputs.current[kind]?.click()}
                                className="flex h-full w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line-strong px-2 py-4 text-center text-xs font-bold text-text-2 transition hover:border-brand-500 hover:text-brand-600"
                            >
                                <Icon size={22} />
                                {busy === `file-${kind}` ? t.claim.uploading : label}
                            </button>
                            <input
                                ref={(node) => {
                                    fileInputs.current[kind] = node;
                                }}
                                type="file"
                                accept={accept}
                                capture={kind === "storefront" ? "environment" : undefined}
                                hidden
                                onChange={(event) => {
                                    void upload(kind)(event.target.files?.[0]);
                                    event.target.value = "";
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}

            {claim.documents.length > 0 && (
                <ul className="grid gap-2">
                    {claim.documents.map((file) => (
                        <li key={file.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-2 pr-3">
                            {previews[file.id] ? (
                                <img src={previews[file.id]} alt="" className="h-12 w-12 rounded-xl object-cover" />
                            ) : (
                                <span className="grid h-12 w-12 place-items-center rounded-xl bg-surface text-muted">
                                    <FileText size={18} />
                                </span>
                            )}
                            <span className="min-w-0 flex-1 truncate text-sm font-bold">{t.claim.fileKinds[file.kind]}</span>
                            {proofsOpen && (
                                <button
                                    type="button"
                                    disabled={busy !== null}
                                    onClick={() => run("remove", () => proCall(`claims/${claim.id}/files?file=${encodeURIComponent(file.id)}`, { method: "DELETE" }))}
                                    className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-closed/10 hover:text-closed"
                                    aria-label={t.claim.remove}
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <ProofCard icon={Globe} title={t.claim.socialTitle} badge={t.claim.support} done={Boolean(claim.social_url)}>
                <p>{fill(t.claim.socialBody, { code: claim.code })}</p>
                {editable ? (
                    <div className="mt-3 flex gap-2">
                        <input value={form.social_url} onChange={(event) => setForm({ ...form, social_url: event.target.value })} placeholder={t.claim.socialPlaceholder} className="nt-input h-11" />
                        <button
                            type="button"
                            disabled={busy !== null || form.social_url === (claim.social_url ?? "")}
                            onClick={() => run("social", () => proCall(`claims/${claim.id}`, { method: "PATCH", body: JSON.stringify({ social_url: form.social_url }) }), t.claim.saved)}
                            className="nt-btn nt-btn-soft h-11 px-4 text-sm"
                        >
                            {t.claim.save}
                        </button>
                    </div>
                ) : (
                    claim.social_url && <p className="mt-2 font-semibold break-all">{claim.social_url}</p>
                )}
            </ProofCard>

            <ProofCard icon={LocateFixed} title={t.claim.onsiteTitle} badge={t.claim.support} done={onSite(claim)}>
                <p>{t.claim.onsiteBody}</p>
                {claim.onsite_distance_m !== null && (
                    <p className={`mt-2 font-bold ${onSite(claim) ? "text-open" : "text-closed"}`}>
                        {onSite(claim)
                            ? fill(t.claim.onsiteNear, { m: claim.onsite_distance_m })
                            : claim.onsite_distance_m < 1000
                              ? fill(t.claim.onsiteClose, { m: claim.onsite_distance_m, accuracy: claim.onsite_accuracy ?? 0 })
                              : fill(t.claim.onsiteFar, { km: Math.round(claim.onsite_distance_m / 100) / 10 })}
                    </p>
                )}
                {proofsOpen && (
                    <button type="button" disabled={busy !== null} onClick={locate} className="nt-btn nt-btn-soft mt-3 h-11 text-sm">
                        <LocateFixed size={16} className={busy === "onsite" ? "animate-pulse" : ""} />
                        {t.claim.onsiteButton}
                    </button>
                )}
            </ProofCard>
        </div>
    );

    const meter = (
        <div className="rounded-[1.4rem] border border-line bg-surface p-4">
            <div className="flex items-center justify-between text-sm font-bold">
                <span>{t.claim.strength}</span>
                <span className={strength >= 70 ? "text-open" : strength >= 40 ? "text-brand-600" : "text-muted"}>
                    {strength >= 70 ? t.claim.strengthHigh : strength >= 40 ? t.claim.strengthOk : t.claim.strengthLow}
                </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2">
                <motion.div className="nt-sunset h-full rounded-full" initial={false} animate={{ width: `${Math.max(6, strength)}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
            </div>
        </div>
    );

    return (
        <div className="mx-auto max-w-2xl px-4 pt-6 pb-12 md:px-6 md:pt-10">
            {header}

            {claim.status === "APPROVED" ? (
                <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-6 overflow-hidden rounded-[2rem] bg-ink p-8 text-center text-white">
                    <motion.div initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.15 }}>
                        <CheckCircle2 size={56} className="mx-auto text-open" />
                    </motion.div>
                    <p className="mt-3 font-display text-2xl font-extrabold">{t.claim.approvedTitle}</p>
                    <p className="mt-1 text-white/70">{t.claim.approvedBody}</p>
                    <Link href={paths.manage(locale, place.slug)} className="nt-btn nt-btn-primary mt-5">
                        {t.claim.manageNow}
                    </Link>
                </motion.div>
            ) : claim.status === "REJECTED" || claim.status === "WITHDRAWN" ? (
                <div className="mt-6 rounded-3xl bg-surface-2 p-6">
                    <p className="font-display text-xl font-extrabold">{claim.status === "REJECTED" ? t.claim.rejectedTitle : t.pro.status.WITHDRAWN}</p>
                    {claim.message_to_owner && <p className="mt-2 text-text-2">« {claim.message_to_owner} »</p>}
                </div>
            ) : (
                <>
                    {claim.status === "PENDING" && (
                        <div className="mt-6 flex gap-3 rounded-3xl bg-amber-500/10 p-5">
                            <ShieldCheck size={24} className="shrink-0 text-amber-600" />
                            <div>
                                <p className="font-display text-lg font-extrabold">{t.claim.pendingTitle}</p>
                                <p className="text-sm text-text-2">{t.claim.pendingBody}</p>
                            </div>
                        </div>
                    )}
                    {claim.status === "NEEDS_INFO" && claim.message_to_owner && (
                        <div className="mt-6 flex gap-3 rounded-3xl bg-brand-500/10 p-5">
                            <MessageSquareWarning size={24} className="shrink-0 text-brand-600" />
                            <div>
                                <p className="font-display text-lg font-extrabold">{t.claim.needsInfoTitle}</p>
                                <p className="mt-1 text-text-2">« {claim.message_to_owner} »</p>
                            </div>
                        </div>
                    )}

                    {editable && (
                        <ol className="mt-6 flex gap-2" aria-label="Étapes">
                            {([1, 2, 3] as const).map((value) => (
                                <li key={value} className="flex-1">
                                    <button
                                        type="button"
                                        disabled={value > 1 && !(claim.full_name && claim.phone && claim.statement_accepted_at)}
                                        onClick={() => setStep(value)}
                                        className={`w-full rounded-2xl px-3 py-2.5 text-left text-xs font-bold transition ${step === value ? "nt-sunset text-white shadow-[var(--nt-glow)]" : "bg-surface-2 text-text-2"}`}
                                    >
                                        <span className="block opacity-70">{value}</span>
                                        {[t.claim.step1, t.claim.step2, t.claim.step3][value - 1]}
                                    </button>
                                </li>
                            ))}
                        </ol>
                    )}

                    <div className="mt-5 grid gap-4">
                        {editable && step === 1 ? (
                            <form
                                className="grid gap-4 rounded-[1.8rem] border border-line bg-surface p-5 shadow-card"
                                onSubmit={async (event) => {
                                    event.preventDefault();
                                    const ok = await run("details", () =>
                                        proCall(`claims/${claim.id}`, { method: "PATCH", body: JSON.stringify({ full_name: form.full_name, role: form.role, phone: form.phone, statement: form.statement }) })
                                    );
                                    if (ok) setStep(2);
                                }}
                            >
                                <label className="grid gap-1.5">
                                    <span className="text-sm font-semibold">{t.claim.fullName}</span>
                                    <input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required minLength={3} autoComplete="name" className="nt-input" />
                                </label>
                                <fieldset className="grid gap-1.5">
                                    <legend className="mb-1.5 text-sm font-semibold">{t.claim.role}</legend>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(["OWNER", "MANAGER"] as const).map((role) => (
                                            <button key={role} type="button" onClick={() => setForm({ ...form, role })} className={`h-12 rounded-2xl border text-sm font-bold transition ${form.role === role ? "border-brand-500 bg-brand-500/10 text-brand-600" : "border-line-strong"}`}>
                                                {role === "OWNER" ? t.claim.owner : t.claim.manager}
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>
                                <label className="grid gap-1.5">
                                    <span className="text-sm font-semibold">{t.claim.phone}</span>
                                    <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required type="tel" inputMode="tel" autoComplete="tel" className="nt-input" />
                                </label>
                                <label className="flex items-start gap-3 rounded-2xl bg-surface-2 p-4 text-sm">
                                    <input type="checkbox" checked={form.statement} onChange={(event) => setForm({ ...form, statement: event.target.checked })} required className="mt-0.5 h-5 w-5 shrink-0 accent-[#ff5b36]" />
                                    <span>{t.claim.statement}</span>
                                </label>
                                <button type="submit" disabled={busy !== null || !form.statement} className="nt-btn nt-btn-primary h-12">
                                    {t.claim.next}
                                </button>
                            </form>
                        ) : editable && step === 3 ? (
                            <div className="grid gap-4">
                                {meter}
                                <div className="rounded-[1.8rem] border border-line bg-surface p-5 shadow-card">
                                    <p className="text-sm text-text-2">{t.claim.sendHint}</p>
                                    <button
                                        type="button"
                                        disabled={busy !== null || strength === 0}
                                        onClick={() => run("submit", () => post({ action: "submit" }), t.claim.pendingTitle)}
                                        className="nt-btn nt-btn-primary mt-4 h-12 w-full"
                                    >
                                        <ShieldCheck size={18} />
                                        {claim.status === "NEEDS_INFO" ? t.claim.resend : t.claim.send}
                                    </button>
                                    {strength === 0 && <p className="mt-2 text-center text-sm font-semibold text-closed">{t.claim.needOneProof}</p>}
                                </div>
                                <button type="button" onClick={() => setStep(2)} className="text-sm font-bold text-muted">
                                    ← {t.claim.back}
                                </button>
                            </div>
                        ) : (
                            <>
                                {meter}
                                {proofs}
                                {editable && (
                                    <button type="button" onClick={() => setStep(3)} className="nt-btn nt-btn-primary h-12">
                                        {t.claim.next}
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => window.confirm(t.claim.withdrawConfirm) && run("withdraw", () => post({ action: "withdraw" }))}
                        className="mt-8 block w-full text-center text-sm font-semibold text-muted hover:text-closed"
                    >
                        {t.claim.withdraw}
                    </button>
                </>
            )}
        </div>
    );
}
