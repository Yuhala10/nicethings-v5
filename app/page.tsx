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
import { useTranslation } from "../lib/i18n/useTranslation";

export default function HomePage() {
    const t = useTranslation();
    const router = useRouter();

    // Dynamic categories based on translations
    const categories = [
        {
            key: "food",
            icon: Utensils,
        },
        {
            key: "cafe",
            icon: Coffee,
        },
        {
            key: "drinks",
            icon: Martini,
        },
        {
            key: "discover",
            icon: Sparkles,
        },
    ];

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
                                {t.home.eyebrow}
                            </div>

                            <h1>
                                {t.home.title}
                                <br />
                                <span className="accent">
                                    {t.home.titleAccent}
                                </span>
                            </h1>

                            <p className="nt-hero-description">
                                {t.home.description}
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
                                    placeholder={t.home.searchPlaceholder}
                                    autoComplete="off"
                                    aria-label={t.common.search}
                                />

                                <button
                                    className="nt-search-submit"
                                    type="submit"
                                    aria-label={t.common.search}
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
                                    {t.home.exploreNearby}
                                </Link>

                                <Link
                                    href="/submit"
                                    className="nt-pill-action"
                                >
                                    <PlusIcon />
                                    {t.home.knowAPlace}
                                </Link>
                            </div>
                        </div>

                        {/* =================================================
                HERO VISUAL
            ================================================= */}

                        <div className="nt-hero-visual">
                            <div className="nt-floating-card one">
                                <div className="nt-floating-label">
                                    {t.home.aroundYou}
                                </div>

                                <div className="nt-floating-value">
                                    {t.home.nicePlacesNearby}
                                </div>
                            </div>

                            <div className="nt-floating-card two">
                                <div className="nt-floating-label">
                                    {t.home.community}
                                </div>

                                <div className="nt-floating-value">
                                    {t.home.realDiscoveries}
                                </div>
                            </div>

                            <div className="nt-phone-frame">
                                <div className="nt-phone-screen">
                                    <div className="nt-phone-header">
                                        <span>
                                            {t.common.appName}
                                        </span>

                                        <span>
                                            {t.home.exampleCity}
                                        </span>
                                    </div>

                                    <div className="nt-phone-title">
                                        {t.home.phoneTitle}
                                        <br />
                                        <span>{t.home.titleAccent}</span>
                                    </div>

                                    <div className="nt-phone-search">
                                        <Search
                                            size={13}
                                            style={{
                                                marginRight: 7,
                                            }}
                                        />
                                        {t.home.searchNearby}
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
                                                {t.home.placeWorthDiscovering}
                                            </div>

                                            <div className="nt-phone-place-meta">
                                                <span>
                                                    {t.home.localFavorite}
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
                                                {t.common.discover}
                                            </strong>
                                        </span>

                                        <span>
                                            {t.navigation.explore}
                                        </span>

                                        <span>
                                            {t.navigation.saved}
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
                                    {t.home.startExploring}
                                </h2>
                            </div>

                            <p>
                                {t.home.startExploringDescription}
                            </p>
                        </div>

                        <div className="nt-category-grid">
                            {categories.map(
                                ({
                                    key,
                                    icon: Icon,
                                }) => {
                                    const categoryKey = key as keyof typeof t.home.categoryTitles;
                                    const title = t.home.categoryTitles[categoryKey];
                                    const description = t.home.categoryDescriptions[categoryKey];

                                    return (
                                        <Link
                                            key={key}
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
                                    );
                                }
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
                                {t.home.communityTitle}
                            </h2>

                            <p className="nt-community-copy">
                                {t.home.communityDescription}
                            </p>

                            <Link
                                href="/submit"
                                className="nt-button nt-button-orange"
                            >
                                {t.home.knowAPlace}

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
                                {t.home.placesWaitingDiscovery}
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
                                    {t.home.finalCTATitle}
                                </h2>

                                <p>
                                    {t.home.finalCTADescription}
                                </p>

                                <Link
                                    href="/nearby"
                                    className="nt-button nt-button-orange"
                                >
                                    <Compass
                                        size={17}
                                    />

                                    {t.home.exploreNearby}

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
                            {t.common.appName}
                        </span>

                        <span>
                            {t.home.tagline}
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
