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
            <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1.5 text-[0.68rem] font-extrabold text-white">{counts[item.badge]}</span>
        ) : null;

    return (
        <div className="min-h-dvh md:flex">
            {/* Sidebar (computer) */}
            <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto bg-ink p-4 text-white md:flex">
                <Link href="/admin" className="mb-7 flex items-center gap-2.5 px-2 pt-2">
                    <img src="/brand/mark.svg" alt="" width={34} height={34} />
                    <span>
                        <span className="block font-display text-[1.1rem] leading-tight font-extrabold">NiceThings</span>
                        <span className="block text-xs font-semibold text-white/50">{tr("Espace équipe", "Team console")}</span>
                    </span>
                </Link>
                <nav className="flex flex-col gap-5">
                    {GROUPS.map((group) => (
                        <div key={group.title[0]}>
                            <p className="mb-1.5 px-3 text-[0.65rem] font-extrabold tracking-[0.14em] text-white/35 uppercase">{tr(...group.title)}</p>
                            <div className="flex flex-col gap-0.5">
                                {group.items.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                                            active(item) ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"
                                        }`}
                                    >
                                        {active(item) && <span className="nt-admin-sunset absolute top-2 bottom-2 left-0 w-1 rounded-full" />}
                                        <item.icon size={18} className={active(item) ? "text-brand-500" : ""} />
                                        {label(item)}
                                        {badge(item)}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
                <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between px-3 py-1.5">
                        <span className="text-xs font-semibold text-white/50">{tr("Langue", "Language")}</span>
                        <LangSwitch />
                    </div>
                    <a href="/fr" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/65 hover:bg-white/5 hover:text-white">
                        <ExternalLink size={18} />
                        {tr("Voir le site", "Open the site")}
                    </a>
                    <button
                        type="button"
                        onClick={signOut}
                        disabled={signingOut}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/65 hover:bg-white/5 hover:text-white"
                    >
                        <LogOut size={18} />
                        {signingOut ? tr("Déconnexion…", "Signing out…") : tr("Se déconnecter", "Sign out")}
                    </button>
                </div>
            </aside>

            {/* Top bar (phone) */}
            <header className="sticky top-0 z-40 flex items-center justify-between gap-2 bg-ink px-3 pt-[max(env(safe-area-inset-top),0.6rem)] pb-3 text-white md:hidden">
                <Link href="/admin" className="flex shrink-0 items-center gap-2">
                    <img src="/brand/mark.svg" alt="" width={28} height={28} />
                </Link>
                <div className="flex min-w-0 items-center gap-0.5">
                    {NAV.filter((item) => !TABS.includes(item.href)).map((item) => (
                        <Link key={item.href} href={item.href} className={`grid h-10 w-10 place-items-center rounded-full ${active(item) ? "bg-white/10 text-brand-500" : "text-white/75"}`} aria-label={label(item)}>
                            <item.icon size={19} />
                        </Link>
                    ))}
                    <LangSwitch className="ml-1" />
                    <button type="button" onClick={signOut} className="grid h-10 w-10 place-items-center rounded-full text-white/75" aria-label={tr("Se déconnecter", "Sign out")}>
                        <LogOut size={19} />
                    </button>
                </div>
            </header>

            <main className="min-w-0 flex-1 px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-12">
                <div className="mx-auto max-w-6xl">{children}</div>
            </main>

            {/* Bottom tabs (phone) */}
            <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-1 pt-1 pb-[max(env(safe-area-inset-bottom),0.4rem)] backdrop-blur md:hidden">
                <ul className="flex">
                    {NAV.filter((item) => TABS.includes(item.href)).map((item) => (
                        <li key={item.href} className="flex-1">
                            <Link href={item.href} className={`relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[0.66rem] font-bold ${active(item) ? "text-ink" : "text-muted"}`}>
                                <item.icon size={20} className={active(item) ? "text-brand-500" : ""} />
                                {tr(...item.short)}
                                {item.badge && counts[item.badge] > 0 && (
                                    <span className="absolute top-0.5 right-[22%] grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[0.6rem] font-extrabold text-white">
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
