"use client";

import Link from "next/link";
import {
    Heart,
    Menu,
    Search,
    UserRound,
    X,
    Compass,
    MapPin,
    LockKeyhole,
} from "lucide-react";
import {
    useEffect,
    useState,
} from "react";
import {
    usePathname,
} from "next/navigation";

import Logo from "../branding/Logo";
import LanguageSwitcher from "../i18n/LanguageSwitcher";
import { useTranslation } from "../../lib/i18n/useTranslation";

export default function Header() {
    const t = useTranslation();
    const pathname =
        usePathname();

    const navigation = [
        {
            href: "/",
            label: t.navigation.home,
        },
        {
            href: "/search",
            label: t.navigation.discover,
        },
        {
            href: "/nearby",
            label: t.navigation.nearby,
        },
        {
            href: "/saved",
            label: t.navigation.saved,
        },
    ];

    const [
        open,
        setOpen,
    ] = useState(false);

    /*
     * Close the mobile menu whenever
     * navigation changes.
     */
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    /*
     * Prevent the page behind the
     * mobile drawer from scrolling.
     */
    useEffect(() => {
        if (!open) {
            document.body.style.overflow =
                "";
            return;
        }

        document.body.style.overflow =
            "hidden";

        return () => {
            document.body.style.overflow =
                "";
        };
    }, [open]);

    /*
     * Allow Escape to close the drawer.
     */
    useEffect(() => {
        if (!open) {
            return;
        }

        function handleKeyDown(
            event: KeyboardEvent
        ) {
            if (
                event.key ===
                "Escape"
            ) {
                setOpen(false);
            }
        }

        window.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () =>
            window.removeEventListener(
                "keydown",
                handleKeyDown
            );
    }, [open]);

    function isActive(
        href: string
    ) {
        if (href === "/") {
            return pathname === "/";
        }

        return (
            pathname === href ||
            pathname.startsWith(
                `${href}/`
            )
        );
    }

    return (
        <>
            <header
                className="nt-header"
                data-header
            >
                <div className="nt-header-inner">
                    <Link
                        href="/"
                        className="nt-header-brand"
                        aria-label="NiceThings home"
                    >
                        <Logo />
                    </Link>

                    <nav
                        className="nt-desktop-nav"
                        aria-label="Primary navigation"
                    >
                        {navigation.map(
                            (
                                item
                            ) => {
                                const active =
                                    isActive(
                                        item.href
                                    );

                                return (
                                    <Link
                                        key={
                                            item.href
                                        }
                                        href={
                                            item.href
                                        }
                                        className={
                                            active
                                                ? "active"
                                                : ""
                                        }
                                        aria-current={
                                            active
                                                ? "page"
                                                : undefined
                                        }
                                    >
                                        <span>
                                            {
                                                item.label
                                            }
                                        </span>
                                    </Link>
                                );
                            }
                        )}
                    </nav>

                    <div className="nt-header-actions">
                        <LanguageSwitcher />
                        <Link href="/admin-login" className="nt-admin-entry" aria-label={t.common.admin}><LockKeyhole size={15} /><span>{t.common.admin}</span></Link>
                        <Link
                            href="/search"
                            className="nt-header-icon"
                            aria-label={t.header.search}
                        >
                            <Search
                                size={
                                    18
                                }
                                strokeWidth={
                                    1.9
                                }
                            />
                        </Link>

                        <Link
                            href="/profile"
                            className={
                                isActive(
                                    "/profile"
                                )
                                    ? "nt-header-profile active"
                                    : "nt-header-profile"
                            }
                            aria-current={
                                isActive(
                                    "/profile"
                                )
                                    ? "page"
                                    : undefined
                            }
                        >
                            <UserRound
                                size={
                                    17
                                }
                                strokeWidth={
                                    1.9
                                }
                            />

                            <span>
                                Profile
                            </span>
                        </Link>

                        <button
                            type="button"
                            className="nt-mobile-menu-button"
                            onClick={() =>
                                setOpen(
                                    true
                                )
                            }
                            aria-label="Open navigation menu"
                            aria-expanded={
                                open
                            }
                            aria-controls="nt-mobile-navigation"
                        >
                            <Menu
                                size={
                                    21
                                }
                                strokeWidth={
                                    1.9
                                }
                            />
                        </button>
                    </div>
                </div>
            </header>

            <div
                id="nt-mobile-navigation"
                className={[
                    "nt-mobile-menu",
                    open
                        ? "open"
                        : "",
                ]
                    .filter(
                        Boolean
                    )
                    .join(" ")}
                aria-hidden={
                    !open
                }
            >
                <button
                    type="button"
                    className="nt-mobile-menu-backdrop"
                    onClick={() =>
                        setOpen(
                            false
                        )
                    }
                    aria-label="Close navigation menu"
                    tabIndex={
                        open
                            ? 0
                            : -1
                    }
                />

                <aside
                    className="nt-mobile-menu-panel"
                    aria-label="Mobile navigation"
                >
                    <div className="nt-mobile-menu-header">
                        <Link
                            href="/"
                            aria-label="NiceThings home"
                        >
                            <Logo compact />
                        </Link>

                        <button
                            type="button"
                            className="nt-icon-button nt-icon-button-light nt-icon-button-sm"
                            onClick={() =>
                                setOpen(
                                    false
                                )
                            }
                            aria-label="Close menu"
                        >
                            <X
                                size={
                                    17
                                }
                                strokeWidth={
                                    2
                                }
                            />
                        </button>
                    </div>

                    <div className="nt-mobile-menu-intro">
                        <span>
                            EXPLORE
                        </span>

                        <h2>
                            Find your
                            next
                            favorite
                            place.
                        </h2>
                    </div>

                    <nav
                        className="nt-mobile-nav"
                        aria-label="Mobile primary navigation"
                    >
                        {navigation.map(
                            (
                                item
                            ) => {
                                const active =
                                    isActive(
                                        item.href
                                    );

                                const Icon =
                                    item.href ===
                                        "/search"
                                        ? Compass
                                        : item.href ===
                                            "/nearby"
                                            ? MapPin
                                            : item.href ===
                                                "/saved"
                                                ? Heart
                                                : Compass;

                                return (
                                    <Link
                                        key={
                                            item.href
                                        }
                                        href={
                                            item.href
                                        }
                                        className={
                                            active
                                                ? "active"
                                                : ""
                                        }
                                        aria-current={
                                            active
                                                ? "page"
                                                : undefined
                                        }
                                    >
                                        <span className="nt-mobile-nav-icon">
                                            <Icon
                                                size={
                                                    17
                                                }
                                                strokeWidth={
                                                    1.9
                                                }
                                            />
                                        </span>

                                        <span>
                                            {
                                                item.label
                                            }
                                        </span>

                                        {active && (
                                            <span className="nt-mobile-nav-active-dot" />
                                        )}
                                    </Link>
                                );
                            }
                        )}

                        <Link
                            href="/admin-login"
                            className="nt-mobile-admin-entry"
                        >
                            <span className="nt-mobile-nav-icon"><LockKeyhole size={17} /></span>
                            <span>Admin</span>
                        </Link>

                        <Link
                            href="/profile"
                            className={
                                isActive(
                                    "/profile"
                                )
                                    ? "active"
                                    : ""
                            }
                            aria-current={
                                isActive(
                                    "/profile"
                                )
                                    ? "page"
                                    : undefined
                            }
                        >
                            <span className="nt-mobile-nav-icon">
                                <UserRound
                                    size={
                                        17
                                    }
                                    strokeWidth={
                                        1.9
                                    }
                                />
                            </span>

                            <span>
                                Profile
                            </span>

                            {isActive(
                                "/profile"
                            ) && (
                                    <span className="nt-mobile-nav-active-dot" />
                                )}
                        </Link>

                        <Link
                            href="/submit"
                            className="nt-mobile-submit"
                        >
                            <span>
                                <strong>
                                    Know a place?
                                </strong>

                                <small>
                                    Share it with
                                    NiceThings
                                </small>
                            </span>

                            <span className="nt-mobile-submit-icon">
                                <Heart
                                    size={
                                        17
                                    }
                                    strokeWidth={
                                        1.9
                                    }
                                />
                            </span>
                        </Link>
                    </nav>

                    <div className="nt-mobile-menu-footer">
                        <span>
                            Discover locally.
                        </span>

                        <span>
                            NiceThings
                        </span>
                    </div>
                </aside>
            </div>
        </>
    );
}