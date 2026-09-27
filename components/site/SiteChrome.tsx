"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, Map as MapIcon, Plus, Search } from "lucide-react";
import { LOCALE_COOKIE, otherLocale } from "@/lib/i18n/config";
import { paths } from "@/lib/places/paths";
import { useLocale } from "./LocaleProvider";
import { OfflineBanner, ToastProvider } from "./Toast";

// Pages that own the whole screen (map experiences) hide the desktop header
// and let the tab bar float.
function isImmersive(pathname: string) {
    return /^\/(fr|en)(\/recherche)?\/?$/.test(pathname) || /^\/(fr|en)\/y-aller\//.test(pathname);
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

export function Logo({ compact = false }: { compact?: boolean }) {
    const { locale } = useLocale();
    return (
        <Link href={paths.explore(locale)} className="flex items-center gap-2" aria-label="NiceThings">
            { }
            <img src="/brand/mark.svg" alt="" width={compact ? 30 : 34} height={compact ? 30 : 34} />
            <span className="font-display text-[1.15rem] font-extrabold tracking-tight text-text">
                Nice<span className="text-brand-500">Things</span>
            </span>
        </Link>
    );
}

function SiteHeader() {
    const { locale, t } = useLocale();
    const pathname = usePathname();
    const links = [
        { href: paths.explore(locale), label: t.nav.explore },
        { href: paths.city(locale), label: t.nav.city },
        { href: paths.search(locale), label: t.nav.search },
        { href: paths.saved(locale), label: t.nav.saved },
    ];

    return (
        <header className="sticky top-0 z-40 hidden border-b border-line bg-glass backdrop-blur-xl md:block">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
                <Logo />
                <nav className="flex items-center gap-1 text-sm font-semibold">
                    {links.map((link) => {
                        const active =
                            link.href === paths.explore(locale)
                                ? pathname === link.href
                                : pathname.startsWith(link.href);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                // The search page carries the whole catalogue: load it on tap only.
                                prefetch={link.href === paths.search(locale) ? false : undefined}
                                className={`rounded-full px-3.5 py-2 transition ${active ? "bg-surface-2 text-text" : "text-muted hover:text-text"}`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="ml-auto flex items-center gap-2">
                    <Link href={paths.submit(locale)} className="nt-btn nt-btn-soft h-9 px-3.5 text-sm">
                        <Plus size={16} strokeWidth={2.5} />
                        {t.nav.suggest}
                    </Link>
                    <LanguageSwitch />
                </div>
            </div>
        </header>
    );
}

// Navigation for full-screen map pages on wide screens, where the mobile
// tab bar is hidden and there is no page header.
export function FloatingNav() {
    const { locale, t } = useLocale();
    const links = [
        { href: paths.city(locale), label: t.nav.city },
        { href: paths.saved(locale), label: t.nav.saved },
    ];
    return (
        <nav className="hidden items-center gap-1 rounded-full bg-glass p-1 text-sm font-semibold shadow-card backdrop-blur-xl md:flex" aria-label={t.nav.menu}>
            {links.map((link) => (
                <Link key={link.href} href={link.href} className="rounded-full px-3.5 py-2 text-text-2 transition hover:bg-surface-2 hover:text-text">
                    {link.label}
                </Link>
            ))}
            <Link href={paths.submit(locale)} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-white transition hover:bg-black">
                <Plus size={15} strokeWidth={2.5} />
                {t.nav.suggest}
            </Link>
        </nav>
    );
}

export function TabBar() {
    const { locale, t } = useLocale();
    const pathname = usePathname();
    const tabs = [
        { href: paths.explore(locale), label: t.nav.explore, icon: Compass, exact: true },
        { href: paths.search(locale), label: t.nav.search, icon: Search, prefetch: false },
        { href: paths.city(locale), label: t.nav.city, icon: MapIcon },
        { href: paths.saved(locale), label: t.nav.saved, icon: Heart },
    ];

    return (
        <nav
            className="nt-safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-line bg-glass px-2 pt-1.5 backdrop-blur-xl md:hidden"
            aria-label={t.nav.menu}
        >
            <ul className="mx-auto flex max-w-md justify-between">
                {tabs.map(({ href, label, icon: Icon, exact, prefetch }) => {
                    const active = exact ? pathname === href : pathname.startsWith(href);
                    return (
                        <li key={href} className="flex-1">
                            <Link
                                href={href}
                                prefetch={prefetch}
                                className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[0.7rem] font-semibold transition ${active ? "text-brand-600" : "text-muted"}`}
                                aria-current={active ? "page" : undefined}
                            >
                                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                                {label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

function SiteFooter() {
    const { locale, t } = useLocale();
    const links = [
        { href: paths.city(locale), label: t.nav.city },
        { href: paths.submit(locale), label: t.nav.suggest },
        { href: paths.privacy(locale), label: t.footer.privacy },
        { href: paths.terms(locale), label: t.footer.terms },
    ];

    return (
        <footer className="mt-16 border-t border-line bg-surface-2/50">
            <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 md:grid-cols-[1.4fr_1fr] md:px-6">
                <div>
                    <Logo />
                    <p className="mt-3 max-w-sm text-sm text-muted">{t.footer.about}</p>
                </div>
                <nav aria-label="Footer" className="flex flex-col gap-2 text-sm font-semibold md:items-end">
                    {links.map((link) => (
                        <Link key={link.href} href={link.href} className="text-text-2 hover:text-brand-600">
                            {link.label}
                        </Link>
                    ))}
                </nav>
                <div className="flex flex-col gap-1 border-t border-line pt-5 text-xs text-muted md:col-span-2 md:flex-row md:justify-between">
                    <span>{t.footer.madeIn}</span>
                    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:text-text">
                        {t.footer.osm}
                    </a>
                </div>
            </div>
        </footer>
    );
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const immersive = isImmersive(pathname);

    return (
        <ToastProvider>
            <OfflineBanner />
            {!immersive && <SiteHeader />}
            {immersive ? (
                children
            ) : (
                <div className="flex min-h-dvh flex-col pb-20 md:pb-0">
                    <main id="main" className="flex-1">
                        {children}
                    </main>
                    <SiteFooter />
                </div>
            )}
            <TabBar />
        </ToastProvider>
    );
}
