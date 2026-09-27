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

type NavigationItem = {
    href: string;
    label: string;
    icon: LucideIcon;
};

const navigationItems: NavigationItem[] = [
    {
        href: "/",
        label: "Home",
        icon: Home,
    },
    {
        href: "/saved",
        label: "Saved",
        icon: Heart,
    },
    {
        href: "/search",
        label: "Search",
        icon: Search,
    },
    {
        href: "/submit",
        label: "Contribute",
        icon: Plus,
    },
    {
        href: "/profile",
        label: "Profile",
        icon: UserRound,
    },
];

export default function BottomNav() {
    const pathname = usePathname();

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