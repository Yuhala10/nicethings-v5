"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Camera, ExternalLink, Flag, Inbox, LayoutDashboard, LogOut, MapPin, Search, type LucideIcon } from "lucide-react";
import { adminGet } from "@/lib/admin-client";
import { AdminToastProvider } from "./ui";

type Counts = { submissions: number; reports: number };

const NAV: { href: string; label: string; short: string; icon: LucideIcon; badge?: keyof Counts; exact?: boolean }[] = [
    { href: "/admin", label: "Tableau de bord", short: "Accueil", icon: LayoutDashboard, exact: true },
    { href: "/admin/spots", label: "Lieux", short: "Lieux", icon: MapPin },
    { href: "/admin/submissions", label: "Propositions", short: "Propos.", icon: Inbox, badge: "submissions" },
    { href: "/admin/reports", label: "Signalements", short: "Signal.", icon: Flag, badge: "reports" },
    { href: "/admin/audience", label: "Audience", short: "Audience", icon: BarChart3 },
    { href: "/admin/recherches", label: "Recherches", short: "Recherches", icon: Search },
    { href: "/admin/terrain", label: "Terrain", short: "Terrain", icon: Camera },
];

// Reached from the top bar on phone, to keep the bottom tabs to five.
const TOP_BAR = ["/admin/audience", "/admin/recherches"];

// The team console frame: sidebar on computer, top bar + bottom tabs on
// phone. Badges show what is waiting, refreshed on every page change.
export default function AdminShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [counts, setCounts] = useState<Counts>({ submissions: 0, reports: 0 });
    const [signingOut, setSigningOut] = useState(false);

    useEffect(() => {
        adminGet<Counts>("counts")
            .then((data) => setCounts({ submissions: data.submissions, reports: data.reports }))
            .catch(() => {});
    }, [pathname]);

    const active = (item: (typeof NAV)[number]) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

    const signOut = async () => {
        setSigningOut(true);
        try {
            await fetch("/api/admin/logout", { method: "POST" });
        } finally {
            router.replace("/admin-login");
            router.refresh();
        }
    };

    const badge = (item: (typeof NAV)[number]) =>
        item.badge && counts[item.badge] > 0 ? (
            <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1.5 text-[0.68rem] font-extrabold text-white">
                {counts[item.badge]}
            </span>
        ) : null;

    return (
        <AdminToastProvider>
            <div className="min-h-dvh md:flex">
                {/* Sidebar (computer) */}
                <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-ink p-4 text-white md:flex">
                    <Link href="/admin" className="mb-8 flex items-center gap-2.5 px-2 pt-2">
                        { }
                        <img src="/brand/mark.svg" alt="" width={34} height={34} />
                        <span>
                            <span className="block font-display text-[1.1rem] leading-tight font-extrabold">NiceThings</span>
                            <span className="block text-xs font-semibold text-white/50">Espace équipe</span>
                        </span>
                    </Link>
                    <nav className="flex flex-col gap-1">
                        {NAV.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                                    active(item) ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"
                                }`}
                            >
                                <item.icon size={18} className={active(item) ? "text-brand-500" : ""} />
                                {item.label}
                                {badge(item)}
                            </Link>
                        ))}
                    </nav>
                    <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4">
                        <a href="/fr" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/65 hover:bg-white/5 hover:text-white">
                            <ExternalLink size={18} />
                            Voir le site
                        </a>
                        <button
                            type="button"
                            onClick={signOut}
                            disabled={signingOut}
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/65 hover:bg-white/5 hover:text-white"
                        >
                            <LogOut size={18} />
                            {signingOut ? "Déconnexion…" : "Se déconnecter"}
                        </button>
                    </div>
                </aside>

                {/* Top bar (phone) */}
                <header className="sticky top-0 z-40 flex items-center justify-between bg-ink px-4 pt-[max(env(safe-area-inset-top),0.6rem)] pb-3 text-white md:hidden">
                    <Link href="/admin" className="flex items-center gap-2">
                        { }
                        <img src="/brand/mark.svg" alt="" width={28} height={28} />
                        <span className="font-display font-extrabold">Espace équipe</span>
                    </Link>
                    <div className="flex items-center gap-1">
                        {NAV.filter((item) => TOP_BAR.includes(item.href)).map((item) => (
                            <Link key={item.href} href={item.href} className={`grid h-10 w-10 place-items-center rounded-full ${active(item) ? "text-brand-500" : "text-white/75"}`} aria-label={item.label}>
                                <item.icon size={19} />
                            </Link>
                        ))}
                        <button type="button" onClick={signOut} className="grid h-10 w-10 place-items-center rounded-full text-white/75" aria-label="Se déconnecter">
                            <LogOut size={19} />
                        </button>
                    </div>
                </header>

                <main className="min-w-0 flex-1 px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-12">
                    <div className="mx-auto max-w-6xl">{children}</div>
                </main>

                {/* Bottom tabs (phone) */}
                <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/97 px-1 pt-1 pb-[max(env(safe-area-inset-bottom),0.4rem)] md:hidden">
                    <ul className="flex">
                        {NAV.filter((item) => !TOP_BAR.includes(item.href)).map((item) => (
                            <li key={item.href} className="flex-1">
                                <Link
                                    href={item.href}
                                    className={`relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[0.66rem] font-bold ${active(item) ? "text-ink" : "text-muted"}`}
                                >
                                    <item.icon size={20} className={active(item) ? "text-brand-500" : ""} />
                                    {item.short}
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
        </AdminToastProvider>
    );
}
