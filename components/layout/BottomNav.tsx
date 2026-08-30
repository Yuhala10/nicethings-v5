"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
    Heart,
    Home,
    Plus,
    Search,
    UserRound,
    type LucideIcon,
} from "lucide-react";

import { useTranslation } from "../../lib/i18n/useTranslation";

type NavigationItem = {
    href: string;
    label: string;
    icon: LucideIcon;
};

export default function BottomNav() {
    const pathname = usePathname();
    const t = useTranslation();

    const navigationItems: NavigationItem[] = [
        {
            href: "/",
            label: t.navigation.home,
            icon: Home,
        },
        {
            href: "/saved",
            label: t.navigation.saved,
            icon: Heart,
        },
        {
            href: "/search",
            label: t.navigation.search,
            icon: Search,
        },
        {
            href: "/submit",
            label: t.navigation.contribute,
            icon: Plus,
        },
        {
            href: "/profile",
            label: t.navigation.profile,
            icon: UserRound,
        },
    ];

    return (
        <nav
            className="nt-bottom-nav"
            aria-label="Primary navigation"
        >
            {navigationItems.map(
                ({
                    href,
                    label,
                    icon: Icon,
                }) => {
                    const isHome =
                        href === "/" &&
                        pathname === "/";

                    const isSection =
                        href !== "/" &&
                        (
                            pathname === href ||
                            pathname.startsWith(
                                `${href}/`
                            )
                        );

                    const active =
                        isHome ||
                        isSection;

                    return (
                        <Link
                            key={href}
                            href={href}
                            className={
                                active
                                    ? "active"
                                    : undefined
                            }
                            aria-current={
                                active
                                    ? "page"
                                    : undefined
                            }
                        >
                            <span className="nt-bottom-nav-icon">
                                <Icon
                                    size={18}
                                    strokeWidth={
                                        active
                                            ? 2.5
                                            : 2
                                    }
                                    aria-hidden="true"
                                />
                            </span>

                            <span>
                                {label}
                            </span>
                        </Link>
                    );
                }
            )}
        </nav>
    );
}