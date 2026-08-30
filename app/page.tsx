"use client";

import {
    ArrowRight,
    Coffee,
    Compass,
    MapPin,
    Martini,
    Search,
    Sparkles,
    Utensils,
} from "lucide-react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import AppShell from "../components/layout/AppShell";

const categories = [
    {
        title: "Food",
        description:
            "Local food & hidden gems",
        icon: Utensils,
    },
    {
        title: "Cafés",
        description:
            "Coffee, pastries & chill",
        icon: Coffee,
    },
    {
        title: "Drinks",
        description:
            "Bars, lounges & more",
        icon: Martini,
    },
    {
        title: "Discover",
        description:
            "Something different",
        icon: Sparkles,
    },
];

export default function HomePage() {
    const router = useRouter();

    function handleSearch(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        const form =
            event.currentTarget;

        const formData =
            new FormData(form);

        const query =
            String(
                formData.get("query") ?? ""
            ).trim();

        if (!query) {
            router.push("/search");
            return;
        }

        router.push(
            `/search?q=${encodeURIComponent(query)}`
        );
    }

    return (
        <AppShell>
            <main className="nt-home">
                {/* =================================================
            HERO
        ================================================= */}

                <section className="nt-hero">
                    <div className="nt-container nt-hero-grid">
                        <div className="nt-hero-copy-column">
                            <div className="nt-eyebrow">
                                <span className="nt-eyebrow-dot" />

                                Local discovery,
                                reimagined
                            </div>

                            <h1>
                                Discover
                                <br />
                                something{" "}
                                <span className="accent">
                                    nice.
                                </span>
                            </h1>

                            <p className="nt-hero-description">
                                Find beautiful places,
                                great food, hidden gems
                                and experiences around
                                you — without the noise.
                            </p>

                            <form
                                className="nt-search-bar"
                                onSubmit={handleSearch}
                            >
                                <div className="nt-search-icon">
                                    <Search
                                        size={20}
                                        strokeWidth={2}
                                    />
                                </div>

                                <input
                                    className="nt-search-input"
                                    name="query"
                                    type="search"
                                    placeholder="What are you looking for?"
                                    autoComplete="off"
                                    aria-label="Search NiceThings"
                                />

                                <button
                                    className="nt-search-submit"
                                    type="submit"
                                    aria-label="Search"
                                >
                                    <ArrowRight
                                        size={20}
                                        strokeWidth={2.3}
                                    />
                                </button>
                            </form>

                            <div className="nt-hero-actions">
                                <Link
                                    href="/nearby"
                                    className="nt-pill-action primary"
                                >
                                    <MapPin
                                        size={15}
                                        strokeWidth={2.5}
                                    />

                                    Explore nearby
                                </Link>

                                <Link
                                    href="/submit"
                                    className="nt-pill-action"
                                >
                                    <PlusIcon />

                                    I know a place
                                </Link>
                            </div>
                        </div>

                        {/* =================================================
                HERO VISUAL
            ================================================= */}

                        <div className="nt-hero-visual">
                            <div className="nt-floating-card one">
                                <div className="nt-floating-label">
                                    Around you
                                </div>

                                <div className="nt-floating-value">
                                    Nice places nearby
                                </div>
                            </div>

                            <div className="nt-floating-card two">
                                <div className="nt-floating-label">
                                    Community
                                </div>

                                <div className="nt-floating-value">
                                    Real discoveries
                                </div>
                            </div>

                            <div className="nt-phone-frame">
                                <div className="nt-phone-screen">
                                    <div className="nt-phone-header">
                                        <span>
                                            NiceThings
                                        </span>

                                        <span>
                                            Douala
                                        </span>
                                    </div>

                                    <div className="nt-phone-title">
                                        Find something
                                        <br />
                                        <span>nice.</span>
                                    </div>

                                    <div className="nt-phone-search">
                                        <Search
                                            size={13}
                                            style={{
                                                marginRight: 7,
                                            }}
                                        />

                                        Search nearby
                                    </div>

                                    <div className="nt-phone-map">
                                        <span className="nt-phone-road one" />
                                        <span className="nt-phone-road two" />
                                        <span className="nt-phone-road three" />

                                        <span className="nt-phone-pin one">
                                            <MapPin
                                                size={17}
                                            />
                                        </span>

                                        <span className="nt-phone-pin two">
                                            <MapPin
                                                size={13}
                                            />
                                        </span>

                                        <div className="nt-phone-place">
                                            <div className="nt-phone-place-name">
                                                A place worth
                                                discovering
                                            </div>

                                            <div className="nt-phone-place-meta">
                                                <span>
                                                    Local favorite
                                                </span>

                                                <span>
                                                    ★ 4.8
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="nt-phone-bottom">
                                        <span>
                                            <strong>
                                                Discover
                                            </strong>
                                        </span>

                                        <span>
                                            Map
                                        </span>

                                        <span>
                                            Saved
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* =================================================
            CATEGORIES
        ================================================= */}

                <section className="nt-section">
                    <div className="nt-container">
                        <div className="nt-section-header">
                            <div>
                                <h2>
                                    Start exploring.
                                </h2>
                            </div>

                            <p>
                                From everyday favorites to
                                places you would never have
                                found on your own.
                            </p>
                        </div>

                        <div className="nt-category-grid">
                            {categories.map(
                                ({
                                    title,
                                    description,
                                    icon: Icon,
                                }) => (
                                    <Link
                                        key={title}
                                        href={`/search?category=${encodeURIComponent(
                                            title
                                        )}`}
                                        className="nt-category-card"
                                    >
                                        <span className="nt-category-icon">
                                            <Icon
                                                size={22}
                                                strokeWidth={2}
                                            />
                                        </span>

                                        <h3>
                                            {title}
                                        </h3>

                                        <p>
                                            {description}
                                        </p>
                                    </Link>
                                )
                            )}
                        </div>
                    </div>
                </section>

                {/* =================================================
            COMMUNITY
        ================================================= */}

                <section className="nt-section nt-section-dark nt-community">
                    <div className="nt-container nt-community-grid">
                        <div>
                            <h2>
                                Know somewhere
                                <br />
                                special?
                            </h2>

                            <p className="nt-community-copy">
                                NiceThings grows through
                                people. Share a place worth
                                discovering and help someone
                                else find it.
                            </p>

                            <Link
                                href="/submit"
                                className="nt-button nt-button-orange"
                            >
                                I know a place

                                <ArrowRight
                                    size={17}
                                />
                            </Link>
                        </div>

                        <div className="nt-community-stat">
                            <div className="nt-community-stat-number">
                                ∞
                            </div>

                            <div className="nt-community-stat-label">
                                Places waiting to be
                                discovered.
                            </div>
                        </div>
                    </div>
                </section>

                {/* =================================================
            FINAL CTA
        ================================================= */}

                <section className="nt-final-cta">
                    <div className="nt-container">
                        <div className="nt-final-card">
                            <div className="nt-final-content">
                                <h2>
                                    There is always
                                    <br />
                                    something nice
                                    <br />
                                    nearby.
                                </h2>

                                <p>
                                    Search. Discover. Go.
                                    <br />
                                    That's the whole point.
                                </p>

                                <Link
                                    href="/nearby"
                                    className="nt-button nt-button-orange"
                                >
                                    <Compass
                                        size={17}
                                    />

                                    Explore nearby

                                    <ArrowRight
                                        size={17}
                                    />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* =================================================
            FOOTER
        ================================================= */}

                <footer className="nt-footer">
                    <div className="nt-container nt-footer-inner">
                        <span>
                            ©{" "}
                            {new Date().getFullYear()}{" "}
                            NiceThings
                        </span>

                        <span>
                            Discover something nice.
                        </span>
                    </div>
                </footer>
            </main>
        </AppShell>
    );
}

function PlusIcon() {
    return (
        <span
            aria-hidden="true"
            style={{
                fontSize: 17,
                lineHeight: 1,
                fontWeight: 500,
            }}
        >
            +
        </span>
    );
}