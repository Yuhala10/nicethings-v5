"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BadgeCheck, BarChart3, Camera, ExternalLink, Flag, Inbox, LayoutDashboard, LogOut, MapPin, Newspaper, Search, type LucideIcon } from "lucide-react";
import { adminGet } from "@/lib/admin-client";
import { AdminLangProvider, LangSwitch, useTr } from "./i18n";
import { AdminToastProvider } from "./ui";

type Counts = { submissions: number; reports: number; claims: number };
type Item = { href: string; label: [string, string]; short: [string, string]; icon: LucideIcon; badge?: keyof Counts; exact?: boolean };

// Grouped by what the team is doing: running the catalogue, answering
// people, growing the audience.
const GROUPS: { title: [string, string]; items: Item[] }[] = [
    {
        title: ["Catalogue", "Catalogue"],
        items: [
            { href: "/admin", label: ["Tableau de bord", "Dashboard"], short: ["Accueil", "Home"], icon: LayoutDashboard, exact: true },
            { href: "/admin/spots", label: ["Lieux", "Places"], short: ["Lieux", "Places"], icon: MapPin },
            { href: "/admin/terrain", label: ["Terrain", "Field kit"], short: ["Terrain", "Field"], icon: Camera },
        ],
    },
    {
        title: ["À traiter", "To handle"],
        items: [
            { href: "/admin/submissions", label: ["Propositions", "Suggestions"], short: ["Propos.", "Suggest."], icon: Inbox, badge: "submissions" },
            { href: "/admin/reports", label: ["Signalements", "Reports"], short: ["Signal.", "Reports"], icon: Flag, badge: "reports" },
            { href: "/admin/revendications", label: ["Revendications", "Owner claims"], short: ["Proprios", "Owners"], icon: BadgeCheck, badge: "claims" },
        ],
    },
    {
        title: ["Croissance", "Growth"],
        items: [
            { href: "/admin/blog", label: ["Blog", "Blog"], short: ["Blog", "Blog"], icon: Newspaper },
            { href: "/admin/audience", label: ["Audience", "Audience"], short: ["Audience", "Audience"], icon: BarChart3 },
            { href: "/admin/recherches", label: ["Recherches", "Searches"], short: ["Recherches", "Searches"], icon: Search },
        ],
    },
];
const NAV = GROUPS.flatMap((group) => group.items);

// On phone: five tabs at the bottom, the rest in the top bar.
const TABS = ["/admin", "/admin/spots", "/admin/submissions", "/admin/reports", "/admin/revendications"];

function Frame({ children }: { children: ReactNode }) {
    const tr = useTr();
    const pathname = usePathname();
    const router = useRouter();
    const [counts, setCounts] = useState<Counts>({ submissions: 0, reports: 0, claims: 0 });
    const [signingOut, setSigningOut] = useState(false);

    useEffect(() => {
        adminGet<Counts>("counts")
            .then((data) => setCounts({ submissions: data.submissions, reports: data.reports, claims: data.claims ?? 0 }))
            .catch(() => {});
    }, [pathname]);

    const active = (item: Item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));
    const label = (item: Item) => tr(...item.label);

    const signOut = async () => {
        setSigningOut(true);
        try {
            await fetch("/api/admin/logout", { method: "POST" });
        } finally {
            router.replace("/admin-login");
            router.refresh();
        }
    };

    const badge = (item: Item) =>
        item.badge && counts[item.badge] > 0 ? (
            <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1.5 text-[0.68rem] font-bold text-white">{counts[item.badge]}</span>
        ) : null;

    return (
        <div className="min-h-dvh md:flex">
            {/* Sidebar (computer): paper, hairline, the current page in ink. */}
            <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-line bg-card p-4 md:flex">
                <Link href="/admin" className="mb-8 flex items-center gap-2.5 px-2 pt-2">
                    <img src="/brand/mark.svg" alt="" width={32} height={32} />
                    <span>
                        <span className="block text-[1.05rem] leading-tight font-bold tracking-[-0.03em]">NiceThings</span>
                        <span className="block text-xs text-muted">{tr("Espace équipe", "Team console")}</span>
                    </span>
                </Link>
                <nav className="flex flex-col gap-6">
                    {GROUPS.map((group) => (
                        <div key={group.title[0]}>
                            <p className="a-eyebrow mb-2 px-3">{tr(...group.title)}</p>
                            <div className="flex flex-col gap-0.5">
                                {group.items.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        aria-current={active(item) ? "page" : undefined}
                                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                                            active(item) ? "bg-ink text-white" : "text-text-2 hover:bg-soft hover:text-ink"
                                        }`}
                                    >
                                        <item.icon size={18} strokeWidth={active(item) ? 2.1 : 1.8} />
                                        {label(item)}
                                        {badge(item)}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
                <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4">
                    <div className="flex items-center justify-between px-3 py-1.5">
                        <span className="text-xs text-muted">{tr("Langue", "Language")}</span>
                        <LangSwitch />
                    </div>
                    <a href="/fr" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-2 hover:bg-soft hover:text-ink">
                        <ExternalLink size={18} strokeWidth={1.8} />
                        {tr("Voir le site", "Open the site")}
                    </a>
                    <button
                        type="button"
                        onClick={signOut}
                        disabled={signingOut}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-text-2 hover:bg-soft hover:text-ink"
                    >
                        <LogOut size={18} strokeWidth={1.8} />
                        {signingOut ? tr("Déconnexion…", "Signing out…") : tr("Se déconnecter", "Sign out")}
                    </button>
                </div>
            </aside>

            {/* Top bar (phone) */}
            <header className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-line bg-paper/90 px-3 pt-[max(env(safe-area-inset-top),0.6rem)] pb-2.5 backdrop-blur-xl md:hidden">
                <Link href="/admin" className="flex shrink-0 items-center gap-2">
                    <img src="/brand/mark.svg" alt="" width={28} height={28} />
                </Link>
                <div className="flex min-w-0 items-center gap-0.5">
                    {NAV.filter((item) => !TABS.includes(item.href)).map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active(item) ? "page" : undefined}
                            className={`grid h-10 w-10 place-items-center rounded-full ${active(item) ? "bg-ink text-white" : "text-text-2"}`}
                            aria-label={label(item)}
                        >
                            <item.icon size={19} strokeWidth={1.8} />
                        </Link>
                    ))}
                    <LangSwitch className="ml-1" />
                    <button type="button" onClick={signOut} className="grid h-10 w-10 place-items-center rounded-full text-text-2" aria-label={tr("Se déconnecter", "Sign out")}>
                        <LogOut size={19} strokeWidth={1.8} />
                    </button>
                </div>
            </header>

            <main className="min-w-0 flex-1 px-4 pt-6 pb-32 md:px-10 md:pt-10 md:pb-14">
                <div className="mx-auto max-w-6xl">{children}</div>
            </main>

            {/* Bottom tabs (phone): separate tiles, as on the public site. */}
            <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:hidden">
                <ul className="pointer-events-auto mx-auto flex w-fit gap-1.5">
                    {NAV.filter((item) => TABS.includes(item.href)).map((item) => (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                aria-current={active(item) ? "page" : undefined}
                                className="a-tab relative flex h-[3.4rem] w-[clamp(3.6rem,17vw,4.3rem)] flex-col items-center justify-center gap-[0.2rem] rounded-[1rem] text-[0.62rem] font-semibold"
                            >
                                <item.icon size={19} strokeWidth={active(item) ? 2.1 : 1.8} />
                                {tr(...item.short)}
                                {item.badge && counts[item.badge] > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[0.62rem] font-bold text-white ring-2 ring-paper">
                                        {counts[item.badge]}
                                    </span>
                                )}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
}

// The team console frame: sidebar on computer, top bar + bottom tabs on
// phone. Badges show what is waiting, refreshed on every page change.
export default function AdminShell({ children }: { children: ReactNode }) {
    return (
        <AdminLangProvider>
            <AdminToastProvider>
                <Frame>{children}</Frame>
            </AdminToastProvider>
        </AdminLangProvider>
    );
}
