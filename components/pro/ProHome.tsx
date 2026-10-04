"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, BarChart3, Camera, ChevronRight, Clock3, LogOut, Search, ShieldCheck, Store } from "lucide-react";
import { cityBySlug } from "@/lib/cities";
import { fill } from "@/lib/i18n";
import { categoryStyle } from "@/lib/places/display";
import { paths } from "@/lib/places/paths";
import { useLocale } from "../site/LocaleProvider";
import GoogleButton from "./GoogleButton";
import { useOwner } from "./useOwner";

const STATUS_TONE: Record<string, string> = {
    DRAFT: "bg-surface-2 text-text-2",
    PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    NEEDS_INFO: "bg-brand-500/15 text-brand-600",
    APPROVED: "bg-open/15 text-open",
    REJECTED: "bg-closed/10 text-closed",
    WITHDRAWN: "bg-surface-2 text-muted",
};

// The business space: who you are, what you manage, where your claims stand.
export default function ProHome() {
    const { locale, t } = useLocale();
    const { data, loading, reload } = useOwner();
    const failed = useSearchParams().get("login") === "failed";

    const benefits = [
        { icon: Clock3, title: t.pro.benefit1, body: t.pro.benefit1Body },
        { icon: Camera, title: t.pro.benefit2, body: t.pro.benefit2Body },
        { icon: BarChart3, title: t.pro.benefit3, body: t.pro.benefit3Body },
        { icon: ShieldCheck, title: t.pro.benefit4, body: t.pro.benefit4Body },
    ];

    return (
        <div className="mx-auto max-w-3xl px-4 pt-6 pb-10 md:px-6 md:pt-10">
            <section className="relative overflow-hidden rounded-[2rem] bg-ink px-6 pt-8 pb-7 text-white shadow-float md:px-10 md:pt-12">
                <div className="nt-sunset absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-40 blur-3xl" aria-hidden />
                <p className="relative inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                    <Store size={14} />
                    {t.pro.title}
                </p>
                <h1 className="relative mt-4 font-display text-[2.1rem] leading-[1.05] font-extrabold tracking-tight md:text-5xl">{t.pro.heroTitle}</h1>
                <p className="relative mt-3 max-w-xl text-white/75 md:text-lg">{t.pro.heroLead}</p>
                {!loading && !data?.user && (
                    <div className="relative mt-6 max-w-sm">
                        <GoogleButton next={paths.pro(locale)} />
                        {failed && <p className="mt-2 text-sm font-semibold text-brand-400">{t.pro.loginFailed}</p>}
                    </div>
                )}
            </section>

            {loading ? (
                <div className="mt-6 grid gap-3">
                    <div className="nt-skeleton h-20 rounded-3xl" />
                    <div className="nt-skeleton h-20 rounded-3xl" />
                </div>
            ) : !data?.user ? (
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                    {benefits.map(({ icon: Icon, title, body }) => (
                        <li key={title} className="rounded-3xl border border-line bg-surface p-5 shadow-card">
                            <span className="nt-sunset grid h-11 w-11 place-items-center rounded-2xl text-white">
                                <Icon size={20} />
                            </span>
                            <p className="mt-3 font-display text-lg font-extrabold">{title}</p>
                            <p className="mt-1 text-sm text-text-2">{body}</p>
                        </li>
                    ))}
                </ul>
            ) : (
                <>
                    <div className="mt-6 flex items-center gap-3">
                        {data.user.avatar ? (
                            <img src={data.user.avatar} alt="" referrerPolicy="no-referrer" className="h-12 w-12 rounded-full" />
                        ) : (
                            <span className="nt-sunset grid h-12 w-12 place-items-center rounded-full font-bold text-white">{(data.user.name ?? "?")[0]}</span>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-xl font-extrabold">{fill(t.pro.hello, { name: data.user.name?.split(" ")[0] ?? "" })}</p>
                            <p className="truncate text-sm text-muted">{data.user.email}</p>
                        </div>
                        <button
                            type="button"
                            onClick={async () => {
                                await fetch("/api/auth/signout", { method: "POST" });
                                await reload();
                            }}
                            className="nt-btn nt-btn-soft h-10 px-3 text-sm"
                        >
                            <LogOut size={16} />
                            <span className="hidden sm:inline">{t.pro.signOut}</span>
                        </button>
                    </div>

                    {data.setup && <p className="mt-6 rounded-2xl bg-surface-2 px-4 py-3 text-sm font-semibold">{t.pro.notSetUp}</p>}

                    <section className="mt-8">
                        <h2 className="nt-section-title mb-3">{t.pro.myPlaces}</h2>
                        {data.places.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-line-strong p-6 text-center">
                                <p className="font-semibold">{t.pro.noPlaces}</p>
                                <p className="mx-auto mt-1 max-w-md text-sm text-muted">{t.pro.findPlace}</p>
                                <Link href={paths.searchEntry(locale)} className="nt-btn nt-btn-primary mt-4">
                                    <Search size={17} />
                                    {t.pro.search}
                                </Link>
                            </div>
                        ) : (
                            <ul className="grid gap-3">
                                {data.places.map(({ place }) => {
                                    if (!place) return null;
                                    const Icon = categoryStyle(place.category).icon;
                                    return (
                                        <li key={place.slug}>
                                            <Link href={paths.manage(locale, place.slug)} className="nt-pressable flex items-center gap-4 rounded-3xl border border-line bg-surface p-4 shadow-card">
                                                <span className="nt-art grid h-14 w-14 shrink-0 place-items-center rounded-2xl" style={{ "--tone": categoryStyle(place.category).tone } as React.CSSProperties}>
                                                    <Icon size={24} />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex items-center gap-1.5 font-display text-lg font-extrabold">
                                                        <span className="truncate">{place.name}</span>
                                                        <BadgeCheck size={18} className="shrink-0 text-open" />
                                                    </span>
                                                    <span className="block truncate text-sm text-muted">{[place.neighborhood, cityBySlug(place.city)?.name].filter(Boolean).join(", ")}</span>
                                                </span>
                                                <span className="nt-btn nt-btn-primary h-10 px-4 text-sm">{t.pro.manage}</span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>

                    {data.claims.length > 0 && (
                        <section className="mt-8">
                            <h2 className="nt-section-title mb-3">{t.pro.myClaims}</h2>
                            <ul className="grid gap-2">
                                {data.claims.map((claim) =>
                                    claim.place ? (
                                        <li key={claim.id}>
                                            <Link href={paths.claim(locale, claim.place.slug)} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 hover:bg-surface-3">
                                                <span className="min-w-0 flex-1 truncate font-bold">{claim.place.name}</span>
                                                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_TONE[claim.status]}`}>{t.pro.status[claim.status]}</span>
                                                <ChevronRight size={18} className="shrink-0 text-muted" />
                                            </Link>
                                        </li>
                                    ) : null
                                )}
                            </ul>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
