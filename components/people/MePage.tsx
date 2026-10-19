"use client";

import Link from "next/link";
import { ChevronRight, Heart, KeyRound, LifeBuoy, LogOut, Pencil, Share2, Smartphone, Star, Trash2, TrendingUp, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { CITIES } from "@/lib/cities";
import { fill } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import type { PlaceSummary } from "@/lib/places/types";
import { defaultAvatar } from "@/lib/people/avatars";
import { cardVersion } from "@/lib/people/card-version";
import { call, openAuth, setMe, useMe } from "@/lib/people/client";
import { MAX_BIO, MAX_NAME, pinProblem } from "@/lib/people/rules";
import type { Me } from "@/lib/people/types";
import { useSaved } from "@/lib/hooks/useSaved";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";
import AvatarPicker, { type FaceChoice } from "./AvatarPicker";
import { displayName } from "./Person";
import PinInput from "./PinInput";
import ProfileHeader from "./ProfileHeader";
import ShareCard from "./ShareCard";
import Sheet from "./Sheet";

// "Moi": the profile of the person signed in on this phone, and everything
// they can change. Signed out, an invitation to join.

type Panel = "edit" | "top" | "pin" | "recovery" | "delete" | null;

function Row({ icon: Icon, label, onClick, href, danger = false }: { icon: typeof Heart; label: string; onClick?: () => void; href?: string; danger?: boolean }) {
    const inner = (
        <>
            <Icon size={19} strokeWidth={1.8} className={danger ? "text-closed" : "text-muted"} />
            <span className={`flex-1 text-[1rem] font-semibold ${danger ? "text-closed" : ""}`}>{label}</span>
            <ChevronRight size={17} className="text-muted" />
        </>
    );
    const className = "flex min-h-14 w-full items-center gap-3.5 px-4 text-left transition hover:bg-surface-2";
    return href ? (
        <Link href={href} className={className}>
            {inner}
        </Link>
    ) : (
        <button type="button" onClick={onClick} className={className}>
            {inner}
        </button>
    );
}

function Join() {
    const { t } = useLocale();
    const words = t.people;
    const { closed } = useMe();
    return (
        <div className="relative overflow-hidden rounded-[2rem] bg-[#15110e] px-6 pt-10 pb-8 text-white md:px-10">
            <span className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-[#d9572b]/25 blur-3xl" aria-hidden />
            <div className="relative flex -space-x-3">
                {["pp.k3j9x2.0.1", "tn.a8d2kq.1.4", "mc.z71mb3.0.2", "lo.p4n8tt.2.3", "mc.nina44.0.3"].map((sample, index) => (
                    <span key={sample} className="nt-face h-14 w-14 ring-[3px] ring-[#15110e]" style={{ zIndex: 5 - index }}>
                        { }
                        <img src={`/api/avatar/${sample}`} alt="" width={56} height={56} />
                    </span>
                ))}
            </div>
            <p className="relative mt-6 text-[0.75rem] font-semibold tracking-[0.14em] text-white/55 uppercase">{words.join.eyebrow}</p>
            <h1 className="nt-serif relative mt-2 text-[2.75rem] leading-[1.02]">{words.join.title}</h1>
            <p className="relative mt-3 max-w-md text-[1rem] leading-relaxed text-white/80">{words.join.lead}</p>
            <ul className="relative mt-6 flex flex-col gap-3">
                {words.join.perks.map((perk, index) => {
                    const Icon = [Star, Heart, TrendingUp][index] ?? Star;
                    return (
                        <li key={perk} className="flex items-center gap-3 text-[0.875rem] font-medium">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-[#f6dd86]">
                                <Icon size={15} />
                            </span>
                            {perk}
                        </li>
                    );
                })}
            </ul>
            {closed ? (
                <p className="relative mt-7 rounded-[1rem] bg-white/10 px-4 py-3 text-[0.875rem] font-semibold">{words.common.closed}</p>
            ) : (
                <div className="relative mt-7 flex flex-col gap-2.5 sm:flex-row">
                    <button type="button" onClick={() => openAuth("generic")} className="nt-btn nt-btn-primary sm:flex-1">
                        {words.join.create}
                    </button>
                    <button type="button" onClick={() => openAuth("generic", undefined, "login")} className="inline-flex h-12 items-center justify-center rounded-full bg-white/10 px-5 text-[0.875rem] font-semibold sm:flex-1">
                        {words.join.haveOne}
                    </button>
                </div>
            )}
            <p className="relative mt-4 text-[0.75rem] text-white/50">{words.join.free}</p>
        </div>
    );
}

// ---------------------------------------------------------------- editing

function EditSheet({ me, open, onClose }: { me: Me; open: boolean; onClose: () => void }) {
    const { locale, t } = useLocale();
    const words = t.people;
    const toast = useToast();
    const [name, setName] = useState(me.name ?? "");
    const [bio, setBio] = useState(me.bio ?? "");
    const [city, setCity] = useState(me.city ?? "yaounde");
    const [area, setArea] = useState(me.area ?? "");
    const [face, setFace] = useState<FaceChoice>(me.photo ? { kind: "kept", url: me.photo } : { kind: "avatar", code: me.avatar ?? defaultAvatar(me.handle) });
    const [busy, setBusy] = useState(false);
    const [trouble, setTrouble] = useState<string | null>(null);

    const save = async (event: React.FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setTrouble(null);
        const change: Record<string, unknown> = { name: name.trim() || null, bio: bio.trim() || null, city, area: area.trim() || null };
        if (face.kind === "avatar" && (me.photo || face.code !== me.avatar)) change.avatar = face.code;
        const answer = await call<{ me: Me }>("/api/me", "PATCH", change);
        if (answer.ok === false) {
            setBusy(false);
            return setTrouble(words.common.failed);
        }
        let next = answer.me;
        if (face.kind === "photo") {
            try {
                const response = await fetch("/api/me/photo", { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: face.blob });
                const sent = (await response.json()) as { ok?: boolean; me?: Me };
                if (sent.ok && sent.me) next = sent.me;
                else setTrouble(words.common.failed);
            } catch {
                setTrouble(words.common.failed);
            }
        }
        setMe(next);
        setBusy(false);
        toast(words.common.saved);
        onClose();
    };

    return (
        <Sheet open={open} onClose={onClose} closeLabel={words.common.close} title={words.me.editTitle} wide>
            <form onSubmit={save}>
                <p className="nt-eyebrow mb-3">{words.me.face}</p>
                <AvatarPicker value={face} onChange={setFace} words={words} locale={locale} />
                <label htmlFor="me-name" className="mt-6 mb-2 block text-[0.875rem] font-semibold">
                    {words.me.name}
                </label>
                <input id="me-name" value={name} onChange={(event) => setName(event.target.value.slice(0, MAX_NAME))} className="nt-input" />
                <label htmlFor="me-bio" className="mt-4 mb-2 block text-[0.875rem] font-semibold">
                    {words.me.bio}
                </label>
                <textarea id="me-bio" value={bio} onChange={(event) => setBio(event.target.value.slice(0, MAX_BIO))} placeholder={words.me.bioPlaceholder} rows={3} className="nt-input" />
                <p className="mt-1 text-right text-[0.75rem] text-muted tabular-nums">
                    {bio.length}/{MAX_BIO}
                </p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                        <span className="mb-2 block text-[0.875rem] font-semibold">{words.area.city}</span>
                        <select value={city} onChange={(event) => setCity(event.target.value)} className="nt-input">
                            {CITIES.map((item) => (
                                <option key={item.slug} value={item.slug}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-2 block text-[0.875rem] font-semibold">{words.area.area}</span>
                        <input value={area} onChange={(event) => setArea(event.target.value.slice(0, 60))} placeholder={words.area.areaPlaceholder} className="nt-input" />
                    </label>
                </div>
                {trouble && (
                    <p role="alert" className="mt-3 text-[0.875rem] font-semibold text-closed">
                        {trouble}
                    </p>
                )}
                <button type="submit" disabled={busy} className="nt-btn nt-btn-primary sticky bottom-0 mt-6 w-full shadow-float disabled:opacity-60">
                    {busy ? words.common.saving : words.common.save}
                </button>
            </form>
        </Sheet>
    );
}

// Three favourite places, chosen among the saved ones.
function TopSheet({ me, open, onClose }: { me: Me; open: boolean; onClose: () => void }) {
    const { t } = useLocale();
    const words = t.people;
    const toast = useToast();
    const { saved } = useSaved();
    const [places, setPlaces] = useState<PlaceSummary[] | null>(null);
    const [chosen, setChosen] = useState<string[]>(me.topPlaces);
    const [busy, setBusy] = useState(false);
    const key = [...new Set([...me.topPlaces, ...saved])].slice(0, 60).join(",");

    useEffect(() => {
        if (!open || !key) return;
        let gone = false;
        fetch(`/api/places?slugs=${encodeURIComponent(key)}`)
            .then((response) => response.json())
            .then((data: { places: PlaceSummary[] }) => !gone && setPlaces(data.places ?? []))
            .catch(() => !gone && setPlaces([]));
        return () => {
            gone = true;
        };
    }, [open, key]);

    const toggle = (slug: string) => setChosen((list) => (list.includes(slug) ? list.filter((item) => item !== slug) : list.length >= 3 ? list : [...list, slug]));
    const save = async () => {
        setBusy(true);
        const answer = await call<{ me: Me }>("/api/me", "PATCH", { topPlaces: chosen });
        setBusy(false);
        if (answer.ok === true) {
            setMe(answer.me);
            toast(words.common.saved);
            onClose();
        }
    };

    return (
        <Sheet open={open} onClose={onClose} closeLabel={words.common.close} title={words.me.top}>
            <p className="text-[0.875rem] leading-relaxed text-text-2">{words.me.topLead}</p>
            {!key ? (
                <p className="mt-4 rounded-[1rem] bg-surface-2 px-4 py-3 text-[0.875rem] font-semibold">{words.me.topEmpty}</p>
            ) : places === null ? (
                <div className="mt-4 flex flex-col gap-2">
                    {[0, 1, 2].map((index) => (
                        <span key={index} className="nt-skeleton h-14 rounded-[1rem]" />
                    ))}
                </div>
            ) : (
                <ul className="mt-4 flex flex-col gap-2">
                    {places.map((place) => {
                        const rank = chosen.indexOf(place.slug);
                        return (
                            <li key={place.slug}>
                                <button
                                    type="button"
                                    onClick={() => toggle(place.slug)}
                                    aria-pressed={rank >= 0}
                                    className={`flex min-h-14 w-full items-center gap-3 rounded-[1rem] border px-4 text-left transition ${rank >= 0 ? "border-text bg-surface-2" : "border-line"}`}
                                >
                                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[0.875rem] font-bold ${rank >= 0 ? "nt-sunset text-white" : "bg-surface-2 text-muted"}`}>{rank >= 0 ? rank + 1 : ""}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[1rem] font-semibold">{place.name}</span>
                                        {place.neighborhood && <span className="block truncate text-[0.75rem] text-muted">{place.neighborhood}</span>}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
            <button type="button" onClick={save} disabled={busy} className="nt-btn nt-btn-primary sticky bottom-0 mt-5 w-full shadow-float disabled:opacity-60">
                {busy ? words.common.saving : words.common.save}
            </button>
        </Sheet>
    );
}

// The PIN asked before anything sensitive: a new PIN, a new rescue code,
// leaving for good.
function SecretSheet({ panel, onClose }: { panel: "pin" | "recovery" | "delete"; onClose: () => void }) {
    const { locale, t } = useLocale();
    const words = t.people;
    const toast = useToast();
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [again, setAgain] = useState("");
    const [code, setCode] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [trouble, setTrouble] = useState<string | null>(null);
    const pinProps = { showLabel: words.pin.show, hideLabel: words.pin.hide };

    const go = async () => {
        setTrouble(null);
        if (panel === "pin") {
            const problem = pinProblem(next);
            if (problem) return setTrouble(problem === "weak" ? words.pin.weak : words.pin.format);
            if (next !== again) return setTrouble(words.pin.mismatch);
        }
        setBusy(true);
        const answer =
            panel === "delete"
                ? await call("/api/me", "DELETE", { pin: current })
                : await call<{ recovery?: string }>("/api/me/pin", "POST", panel === "pin" ? { current, pin: next } : { current, recovery: true });
        setBusy(false);
        if (answer.ok === false) return setTrouble(answer.why === "wrong" ? words.me.wrongPin : answer.why === "pin_weak" ? words.pin.weak : words.common.failed);
        if (panel === "delete") {
            setMe(null);
            toast(words.me.deleted);
            window.location.href = paths.home(locale);
            return;
        }
        if (panel === "recovery" && typeof answer.recovery === "string") return setCode(answer.recovery);
        toast(words.me.pinChanged);
        onClose();
    };

    const title = panel === "pin" ? words.me.changePin : panel === "recovery" ? words.me.newRecovery : words.me.delete;
    return (
        <Sheet open onClose={onClose} closeLabel={words.common.close} title={title}>
            {code ? (
                <div>
                    <p className="text-[1rem] leading-relaxed text-text-2">{words.recovery.lead}</p>
                    <p className="mt-4 rounded-[1.25rem] bg-[#15110e] px-5 py-6 text-center font-mono text-[1.75rem] font-bold tracking-[0.12em] text-[#f6dd86] select-all">{code}</p>
                    <p className="mt-3 text-[0.875rem] font-semibold text-text-2">{words.recovery.keep}</p>
                    <button type="button" onClick={onClose} className="nt-btn nt-btn-primary mt-5 w-full">
                        {words.recovery.done}
                    </button>
                </div>
            ) : (
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        go();
                    }}
                >
                    {panel === "delete" && <p className="mb-4 text-[1rem] leading-relaxed text-text-2">{words.me.deleteLead}</p>}
                    <PinInput label={words.me.currentPin} value={current} onChange={setCurrent} autoFocus {...pinProps} />
                    {panel === "pin" && (
                        <>
                            <div className="mt-5">
                                <PinInput label={words.me.newPin} value={next} onChange={setNext} {...pinProps} />
                            </div>
                            <div className="mt-4">
                                <PinInput label={words.pin.again} value={again} onChange={setAgain} {...pinProps} />
                            </div>
                            <p className="mt-4 text-[0.75rem] font-semibold text-muted">{words.pin.warn}</p>
                        </>
                    )}
                    {trouble && (
                        <p role="alert" className="mt-3 text-[0.875rem] font-semibold text-closed">
                            {trouble}
                        </p>
                    )}
                    <button type="submit" disabled={busy || current.length < 6} className={`nt-btn mt-6 w-full disabled:opacity-50 ${panel === "delete" ? "nt-btn-dark !bg-closed" : "nt-btn-primary"}`}>
                        {busy ? words.common.saving : panel === "delete" ? words.me.deleteGo : words.common.save}
                    </button>
                </form>
            )}
        </Sheet>
    );
}

// ---------------------------------------------------------------- page

export default function MePage() {
    const { locale, t } = useLocale();
    const words = t.people;
    const { me, ready } = useMe();
    const { saved } = useSaved();
    const [panel, setPanel] = useState<Panel>(null);
    const [sharing, setSharing] = useState(false);
    // The names of their three places, for the list below.
    const [names, setNames] = useState<Record<string, string>>({});
    const topKey = me?.topPlaces.join(",") ?? "";
    useEffect(() => {
        if (!topKey) return;
        let gone = false;
        fetch(`/api/places?slugs=${encodeURIComponent(topKey)}`)
            .then((response) => response.json())
            .then((data: { places?: PlaceSummary[] }) => !gone && setNames(Object.fromEntries((data.places ?? []).map((place) => [place.slug, place.name]))))
            .catch(() => {});
        return () => {
            gone = true;
        };
    }, [topKey]);

    if (!me) {
        if (!ready) return <div className="nt-skeleton h-[28rem] rounded-[2rem]" />;
        return <Join />;
    }


    const signOut = async (everywhere: boolean) => {
        await call("/api/me/logout", "POST", { everywhere });
        setMe(null);
    };

    return (
        <div>
            <ProfileHeader person={me} bio={me.bio} createdAt={me.createdAt} stats={me.stats} locale={locale}>
                <button type="button" onClick={() => setPanel("edit")} className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[0.875rem] font-semibold text-[#15110e]">
                    <Pencil size={15} />
                    {words.me.edit}
                </button>
                <button type="button" onClick={() => setSharing(true)} className="inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-5 text-[0.875rem] font-semibold text-white">
                    <Share2 size={15} />
                    {words.me.share}
                </button>
            </ProfileHeader>

            <p className="mt-3 px-1 text-[0.75rem] leading-relaxed text-muted">{words.howPoints}</p>

            <section className="mt-8">
                <h2 className="nt-section-title mb-4">{words.me.top}</h2>
                <button type="button" onClick={() => setPanel("top")} className="flex w-full items-center gap-3 rounded-[1.25rem] border border-line bg-surface p-4 text-left transition hover:border-text-2">
                    <span className="min-w-0 flex-1">
                        {me.topPlaces.length ? (
                            <span className="flex flex-col gap-1">
                                {me.topPlaces.map((slug, index) => (
                                    <span key={slug} className="truncate text-[1rem] font-semibold">
                                        <span className="nt-sunset-text mr-2">{index + 1}</span>
                                        {names[slug] ?? slug.replace(/-/g, " ")}
                                    </span>
                                ))}
                            </span>
                        ) : (
                            <span className="text-[0.875rem] text-muted">{words.me.topLead}</span>
                        )}
                    </span>
                    <Pencil size={16} className="shrink-0 text-muted" />
                </button>
            </section>

            <section className="mt-8 overflow-hidden rounded-[1.25rem] border border-line bg-surface divide-y divide-line">
                <Row icon={UserRound} label={words.me.view} href={paths.person(locale, me.handle)} />
                <Row icon={Heart} label={`${words.me.saved} · ${saved.length}`} href={paths.saved(locale)} />
            </section>

            <h2 className="nt-eyebrow mt-10 mb-3 px-1">{words.me.security}</h2>
            <section className="overflow-hidden rounded-[1.25rem] border border-line bg-surface divide-y divide-line">
                <Row icon={KeyRound} label={words.me.changePin} onClick={() => setPanel("pin")} />
                <Row icon={LifeBuoy} label={words.me.newRecovery} onClick={() => setPanel("recovery")} />
                <Row icon={LogOut} label={words.me.signout} onClick={() => signOut(false)} />
                <Row icon={Smartphone} label={words.me.signoutAll} onClick={() => signOut(true)} />
            </section>

            <section className="mt-8 overflow-hidden rounded-[1.25rem] border border-line bg-surface">
                <Row icon={Trash2} label={words.me.delete} onClick={() => setPanel("delete")} danger />
            </section>

            <p className="mt-8 text-center text-[0.75rem] text-muted">
                @{me.handle} · {fill(words.memberNo, { number: me.memberNo })}
            </p>

            <ShareCard open={sharing} onClose={() => setSharing(false)} handle={me.handle} name={displayName(me)} version={cardVersion({ person: me, stats: me.stats, top: me.topPlaces.map((slug) => ({ slug })) })} mine />
            {panel === "edit" && <EditSheet me={me} open onClose={() => setPanel(null)} />}
            {panel === "top" && <TopSheet me={me} open onClose={() => setPanel(null)} />}
            {(panel === "pin" || panel === "recovery" || panel === "delete") && <SecretSheet panel={panel} onClose={() => setPanel(null)} />}
        </div>
    );
}
