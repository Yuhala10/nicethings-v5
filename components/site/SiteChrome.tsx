"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, Lock, Map as MapIcon, Plus, Search } from "lucide-react";
import { CITIES, DEFAULT_CITY, cityBySlug } from "@/lib/cities";
import { LOCALE_COOKIE, otherLocale } from "@/lib/i18n/config";
import { paths } from "@/lib/places/paths";
import Analytics from "./Analytics";
import { useLocale } from "./LocaleProvider";
import LocationHelp from "./LocationHelp";
import NavProgress from "./NavProgress";
import { OfflineBanner, ToastProvider } from "./Toast";

type Layout = "map" | "navigation" | "page";

// Map screens own the whole viewport; navigation hides even the tab bar.
function layoutFor(pathname: string): Layout {
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
            <img src="/brand/mark.svg" alt="" width={compact ? 28 : 32} height={compact ? 28 : 32} />
            <span className={`text-[1.15rem] font-bold tracking-[-0.03em] ${light ? "text-white" : "text-text"}`}>
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
        { href: paths.blog(locale), label: t.nav.blog, match: "/blog" },
        { href: paths.saved(locale), label: t.nav.saved },
    ];

    return (
        <header className="nt-glass sticky top-0 z-40 hidden border-b border-line md:block">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-10 px-6">
                <Logo />
                <nav className="flex items-center gap-6 text-[0.9rem] font-medium">
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
                                aria-current={active ? "page" : undefined}
                                className={`relative py-2 transition-colors duration-200 ${
                                    active
                                        ? "text-text after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-text"
                                        : "text-muted hover:text-text"
                                }`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="ml-auto flex items-center gap-2">
                    <Link href={paths.submit(locale)} className="nt-btn nt-btn-outline h-10 px-4 text-[0.88rem]">
                        <Plus size={16} />
                        {t.nav.suggest}
                    </Link>
                    <LanguageSwitch />
                </div>
            </div>
        </header>
    );
}

// Phone navigation: four separate tiles floating over the page, the
// current one in ink. Each tile carries its own border and shadow, so it
// reads over photos, paper and the dark footer alike.
export function TabBar() {
    const { locale, t } = useLocale();
    const pathname = usePathname();
    const tabs = [
        { key: "home", href: paths.home(locale), label: t.nav.home, icon: Home, active: pathname === paths.home(locale) },
        { key: "search", href: paths.searchEntry(locale), label: t.nav.search, icon: Search, active: pathname.includes("/recherche") },
        { key: "map", href: paths.map(locale), label: t.nav.map, icon: MapIcon, active: pathname.includes("/carte") },
        { key: "saved", href: paths.saved(locale), label: t.nav.saved, icon: Heart, active: pathname.startsWith(paths.saved(locale)) },
    ];

    return (
        <nav
            className="pointer-events-none fixed inset-x-0 bottom-0 z-50 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:hidden"
            aria-label={t.nav.menu}
        >
            <ul className="pointer-events-auto mx-auto flex w-fit gap-2">
                {tabs.map(({ key, href, label, icon: Icon, active }) => (
                    <li key={key}>
                        <Link
                            href={href}
                            prefetch={key === "map" || key === "search" ? false : undefined}
                            className="nt-tab flex h-[3.55rem] w-[clamp(4rem,20vw,4.6rem)] flex-col items-center justify-center gap-[0.2rem] rounded-[1.1rem] text-[0.66rem] font-semibold tracking-[0.01em]"
                            aria-current={active ? "page" : undefined}
                        >
                            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
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
        { href: paths.blog(locale), label: t.nav.blog },
        { href: paths.submit(locale), label: t.nav.suggest },
        { href: paths.privacy(locale), label: t.footer.privacy },
        { href: paths.terms(locale), label: t.footer.terms },
    ];

    return (
        <footer className="mt-24 bg-[#15110e] text-white">
            <div className="mx-auto grid max-w-6xl gap-12 px-5 pt-16 pb-32 md:grid-cols-[1.4fr_1fr_0.8fr] md:px-6 md:pb-14">
                <div>
                    <Logo light />
                    <p className="nt-serif mt-6 max-w-sm text-[1.85rem] text-white/90">{t.footer.motto}</p>
                    <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">{t.footer.about}</p>
                    <Link
                        href={paths.pro(locale)}
                        className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/85 transition hover:border-white/40 hover:text-white"
                    >
                        {t.footer.forOwners}
                    </Link>
                </div>
                <nav aria-label={t.nav.cities}>
                    <p className="mb-4 text-[0.7rem] font-semibold tracking-[0.14em] text-white/40 uppercase">{t.nav.cities}</p>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[0.9rem]">
                        {CITIES.slice(0, 12).map((city) => (
                            <li key={city.slug}>
                                <Link href={paths.city(locale, city.slug)} className="text-white/75 transition-colors hover:text-white">
                                    {city.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
                <nav aria-label="Footer" className="flex flex-col gap-2.5 text-[0.9rem]">
                    <p className="mb-1.5 text-[0.7rem] font-semibold tracking-[0.14em] text-white/40 uppercase">NiceThings</p>
                    {links.map((link) => (
                        <Link key={link.href} href={link.href} className="text-white/75 transition-colors hover:text-white">
                            {link.label}
                        </Link>
                    ))}
                    <LanguageSwitch className="mt-2 w-fit border-white/20 bg-white/10 text-white hover:text-white" />
                </nav>
                <div className="flex flex-col gap-1 border-t border-white/10 pt-6 text-xs text-white/45 md:col-span-3 md:flex-row md:justify-between">
                    <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        {t.footer.madeIn}
                        {/* Discreet way in for the NiceThings team (PIN-protected). */}
                        <Link href="/admin-login" prefetch={false} className="inline-flex items-center gap-1 text-white/45 hover:text-white" rel="nofollow">
                            <Lock size={12} />
                            {t.footer.team}
                        </Link>
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
            {/* Desktop only; phones get the tab bar and each page's own top. */}
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
