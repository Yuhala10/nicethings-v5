"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, Home, Lock, Map as MapIcon, Plus, Search } from "lucide-react";
import { CITIES, DEFAULT_CITY, cityBySlug } from "@/lib/cities";
import { LOCALE_COOKIE, otherLocale } from "@/lib/i18n/config";
import { paths } from "@/lib/places/paths";
import Analytics from "./Analytics";
import { useLocale } from "./LocaleProvider";
import LocationHelp from "./LocationHelp";
import NavProgress from "./NavProgress";
import { OfflineBanner, ToastProvider } from "./Toast";

type Layout = "landing" | "map" | "navigation" | "page";

// Map screens own the whole viewport; navigation hides even the tab bar;
// the landing page draws its own header over the hero.
function layoutFor(pathname: string): Layout {
    if (/^\/(fr|en)\/?$/.test(pathname)) return "landing";
    if (/^\/(fr|en)\/y-aller\//.test(pathname)) return "navigation";
    if (/^\/(fr|en)\/carte\/?$/.test(pathname) || /^\/(fr|en)\/[^/]+\/carte\/?$/.test(pathname)) return "map";
    return "page";
}

// The city the visitor last explored, for "Guide" links (Yaoundé first).
export function useCurrentCity() {
    const pathname = usePathname();
    const [saved, setSaved] = useState(DEFAULT_CITY.slug);
    const fromPath = cityBySlug(pathname.split("/")[2]);
    useEffect(() => {
        try {
            const value = localStorage.getItem("nt_city");
            if (cityBySlug(value)) setSaved(value!);
        } catch {}
    }, [pathname]);
    return fromPath?.slug ?? saved;
}

export function LanguageSwitch({ className = "" }: { className?: string }) {
    const { locale, t } = useLocale();
    const pathname = usePathname();
    const next = otherLocale(locale);
    const href = pathname.replace(/^\/(fr|en)(?=\/|$)/, `/${next}`);

    return (
        <Link
            href={href}
            hrefLang={next}
            onClick={() => {
                document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
            }}
            className={`inline-flex h-9 items-center rounded-full border border-line-strong bg-surface px-3 text-xs font-bold tracking-wide text-text-2 transition hover:border-brand-500 hover:text-brand-600 ${className}`}
            aria-label={`${t.nav.language}: ${t.nav.switchTo}`}
        >
            {next.toUpperCase()}
        </Link>
    );
}

export function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
    const { locale } = useLocale();
    return (
        <Link href={paths.home(locale)} className="flex items-center gap-2" aria-label="NiceThings">
            { }
            <img src="/brand/mark.svg" alt="" width={compact ? 30 : 34} height={compact ? 30 : 34} />
            <span className={`font-display text-[1.2rem] font-extrabold tracking-tight ${light ? "text-white" : "text-text"}`}>
                Nice<span className="nt-sunset-text">Things</span>
            </span>
        </Link>
    );
}

function SiteHeader() {
    const { locale, t } = useLocale();
    const pathname = usePathname();
    const city = useCurrentCity();
    const links = [
        { href: paths.home(locale), label: t.nav.home, exact: true },
        { href: paths.search(locale, city), label: t.nav.search, match: "/recherche" },
        { href: paths.explore(locale, city), label: t.nav.map, match: "/carte" },
        { href: paths.city(locale, city), label: t.nav.guide },
        { href: paths.saved(locale), label: t.nav.saved },
    ];

    return (
        <header className="nt-glass sticky top-0 z-40 hidden border-b border-line md:block">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
                <Logo />
                <nav className="flex items-center gap-1 text-sm font-semibold">
                    {links.map((link) => {
                        const active = link.exact
                            ? pathname === link.href
                            : link.match
                              ? pathname.includes(link.match)
                              : pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`rounded-full px-3.5 py-2 transition ${active ? "bg-surface-2 text-text" : "text-muted hover:text-text"}`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="ml-auto flex items-center gap-2">
                    <Link href={paths.submit(locale)} className="nt-btn nt-btn-primary h-10 px-4 text-sm">
                        <Plus size={16} strokeWidth={2.5} />
                        {t.nav.suggest}
                    </Link>
                    <LanguageSwitch />
                </div>
            </div>
        </header>
    );
}

// Navigation for full-screen map pages on wide screens.
export function FloatingNav() {
    const { locale, t } = useLocale();
    const city = useCurrentCity();
    const links = [
        { href: paths.home(locale), label: t.nav.home },
        { href: paths.search(locale, city), label: t.nav.search },
        { href: paths.city(locale, city), label: t.nav.guide },
        { href: paths.saved(locale), label: t.nav.saved },
    ];
    return (
        <nav className="nt-glass hidden items-center gap-1 rounded-full p-1 text-sm font-semibold shadow-card md:flex" aria-label={t.nav.menu}>
            {links.map((link) => (
                <Link key={link.href} href={link.href} className="rounded-full px-3.5 py-2 text-text-2 transition hover:bg-surface-2 hover:text-text">
                    {link.label}
                </Link>
            ))}
            <Link href={paths.submit(locale)} className="nt-sunset inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-white">
                <Plus size={15} strokeWidth={2.5} />
                {t.nav.suggest}
            </Link>
        </nav>
    );
}

export function TabBar() {
    const { locale, t } = useLocale();
    const pathname = usePathname();
    const city = useCurrentCity();
    const tabs = [
        { key: "home", href: paths.home(locale), label: t.nav.home, icon: Home, active: pathname === paths.home(locale) },
        { key: "search", href: paths.searchEntry(locale), label: t.nav.search, icon: Search, active: pathname.includes("/recherche") },
        { key: "map", href: paths.map(locale), label: t.nav.map, icon: MapIcon, active: pathname.includes("/carte") },
        { key: "saved", href: paths.saved(locale), label: t.nav.saved, icon: Heart, active: pathname.startsWith(paths.saved(locale)) },
    ];

    return (
        <nav
            className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),0.6rem)] md:hidden"
            aria-label={t.nav.menu}
        >
            <ul className="nt-glass-strong pointer-events-auto mx-auto flex max-w-md justify-between rounded-[1.6rem] border border-line p-1.5 shadow-float">
                {tabs.map(({ key, href, label, icon: Icon, active }) => (
                    <li key={key} className="relative flex-1">
                        {active && (
                            <motion.span
                                layoutId="nt-tab"
                                className="absolute inset-0 rounded-[1.2rem] bg-surface-2"
                                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                            />
                        )}
                        <Link
                            href={href}
                            prefetch={key === "map" || key === "search" ? false : undefined}
                            className={`relative flex flex-col items-center gap-0.5 rounded-[1.2rem] py-1.5 text-[0.68rem] font-bold transition ${active ? "text-text" : "text-muted"}`}
                            aria-current={active ? "page" : undefined}
                        >
                            <Icon size={21} strokeWidth={active ? 2.5 : 2} className={active ? "text-brand-500" : ""} />
                            {label}
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

function SiteFooter() {
    const { locale, t } = useLocale();
    const links = [
        { href: paths.map(locale), label: t.nav.map },
        { href: paths.submit(locale), label: t.nav.suggest },
        { href: paths.privacy(locale), label: t.footer.privacy },
        { href: paths.terms(locale), label: t.footer.terms },
    ];

    return (
        <footer className="mt-20 bg-[#0b0806] text-white">
            <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-14 pb-28 md:grid-cols-[1.3fr_1fr_1fr] md:px-6 md:pb-12">
                <div>
                    <Logo light />
                    <p className="mt-4 max-w-sm text-sm text-white/60">{t.footer.about}</p>
                </div>
                <nav aria-label={t.nav.cities}>
                    <p className="mb-3 text-[0.72rem] font-bold tracking-[0.12em] text-white/45 uppercase">{t.nav.cities}</p>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm font-semibold">
                        {CITIES.slice(0, 12).map((city) => (
                            <li key={city.slug}>
                                <Link href={paths.city(locale, city.slug)} className="text-white/80 hover:text-brand-400">
                                    {city.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
                <nav aria-label="Footer" className="flex flex-col gap-2 text-sm font-semibold">
                    <p className="mb-1 text-[0.72rem] font-bold tracking-[0.12em] text-white/45 uppercase">NiceThings</p>
                    {links.map((link) => (
                        <Link key={link.href} href={link.href} className="text-white/80 hover:text-brand-400">
                            {link.label}
                        </Link>
                    ))}
                    <LanguageSwitch className="mt-2 w-fit border-white/20 bg-white/10 text-white hover:text-white" />
                </nav>
                <div className="flex flex-col gap-1 border-t border-white/10 pt-6 text-xs text-white/45 md:col-span-3 md:flex-row md:justify-between">
                    <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        {t.footer.madeIn}
                        {/* Discreet way in for the NiceThings team (PIN-protected). */}
                        <a href="/admin-login" className="inline-flex items-center gap-1 text-white/45 hover:text-white" rel="nofollow">
                            <Lock size={12} />
                            {t.footer.team}
                        </a>
                    </span>
                    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                        {t.footer.osm}
                    </a>
                </div>
            </div>
        </footer>
    );
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const layout = layoutFor(pathname);

    return (
        <ToastProvider>
            <OfflineBanner />
            <LocationHelp />
            <NavProgress />
            <Analytics />
            {layout === "page" && <SiteHeader />}
            {layout === "map" || layout === "navigation" ? (
                children
            ) : (
                <div className="flex min-h-dvh flex-col">
                    <main id="main" className="flex-1">
                        {children}
                    </main>
                    <SiteFooter />
                </div>
            )}
            {layout !== "navigation" && <TabBar />}
        </ToastProvider>
    );
}
