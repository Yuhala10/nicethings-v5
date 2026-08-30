"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import Link from "next/link";

import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    Clock3,
    Eye,
    ExternalLink,
    MapPin,
    RefreshCw,
    Search,
    ShieldCheck,
    Star,
    Store,
    X,
} from "lucide-react";

import {
    getSupabaseBrowserClient,
} from "../../../lib/supabase/client";

type Spot = {
    id: string;
    name: string;
    slug: string | null;
    category: string | null;
    cuisine: string | null;
    city: string | null;
    neighborhood: string | null;
    address: string | null;
    rating: number | null;
    review_count: number | null;
    verified: boolean | null;
    featured: boolean | null;
    status: string | null;
    created_at: string | null;
    updated_at: string | null;
};

type Filter =
    | "ALL"
    | "APPROVED"
    | "PENDING"
    | "REJECTED";

export default function AdminSpotsPage() {
    const supabase = useMemo(
        () =>
            getSupabaseBrowserClient() as any,
        []
    );

    const [spots, setSpots] =
        useState<Spot[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [error, setError] =
        useState<string | null>(
            null
        );

    const [search, setSearch] =
        useState("");

    const [filter, setFilter] =
        useState<Filter>(
            "ALL"
        );

    const [selectedSpot, setSelectedSpot] =
        useState<Spot | null>(
            null
        );

    const [actionLoading, setActionLoading] =
        useState(false);

    const [toast, setToast] =
        useState<string | null>(
            null
        );

    const loadSpots =
        useCallback(
            async (
                refresh = false
            ) => {
                if (refresh) {
                    setRefreshing(
                        true
                    );
                } else {
                    setLoading(
                        true
                    );
                }

                setError(null);

                try {
                    const {
                        data,
                        error: spotsError,
                    } =
                        await supabase
                            .from(
                                "nt_spots"
                            )
                            .select(
                                "*"
                            )
                            .order(
                                "created_at",
                                {
                                    ascending:
                                        false,
                                }
                            );

                    if (
                        spotsError
                    ) {
                        throw spotsError;
                    }

                    setSpots(
                        (data ??
                            []) as Spot[]
                    );
                } catch (err) {
                    console.error(
                        "Admin spots error:",
                        err
                    );

                    setError(
                        "We couldn't load the spots."
                    );
                } finally {
                    setLoading(
                        false
                    );

                    setRefreshing(
                        false
                    );
                }
            },
            [supabase]
        );

    useEffect(() => {
        void loadSpots();
    }, [loadSpots]);

    useEffect(() => {
        if (!toast) {
            return;
        }

        const timer =
            window.setTimeout(
                () =>
                    setToast(
                        null
                    ),
                3000
            );

        return () =>
            window.clearTimeout(
                timer
            );
    }, [toast]);

    const filteredSpots =
        useMemo(() => {
            const query =
                search
                    .trim()
                    .toLowerCase();

            return spots.filter(
                (spot) => {
                    const matchesFilter =
                        filter ===
                        "ALL" ||
                        (
                            spot.status ??
                            ""
                        ).toUpperCase() ===
                        filter;

                    if (
                        !matchesFilter
                    ) {
                        return false;
                    }

                    if (!query) {
                        return true;
                    }

                    return [
                        spot.name,
                        spot.category,
                        spot.cuisine,
                        spot.city,
                        spot.neighborhood,
                        spot.address,
                    ]
                        .filter(
                            (
                                value
                            ) =>
                                Boolean(
                                    value
                                )
                        )
                        .some(
                            (
                                value
                            ) =>
                                String(
                                    value
                                )
                                    .toLowerCase()
                                    .includes(
                                        query
                                    )
                        );
                }
            );
        }, [
            spots,
            search,
            filter,
        ]);

    const counts = useMemo(
        () => ({
            all: spots.length,
            approved: spots.filter(
                (spot) =>
                    spot.status ===
                    "APPROVED"
            ).length,
            pending: spots.filter(
                (spot) =>
                    spot.status ===
                    "PENDING"
            ).length,
            rejected: spots.filter(
                (spot) =>
                    spot.status ===
                    "REJECTED"
            ).length,
        }),
        [spots]
    );

    async function updateSpotStatus(
        spot: Spot,
        status: Exclude<
            Filter,
            "ALL"
        >
    ) {
        setActionLoading(
            true
        );

        try {
            const {
                error: updateError,
            } =
                await supabase
                    .from(
                        "nt_spots"
                    )
                    .update({
                        status,
                    })
                    .eq(
                        "id",
                        spot.id
                    );

            if (
                updateError
            ) {
                throw updateError;
            }

            setSpots(
                (
                    current
                ) =>
                    current.map(
                        (
                            item
                        ) =>
                            item.id ===
                                spot.id
                                ? {
                                    ...item,
                                    status,
                                }
                                : item
                    )
            );

            setSelectedSpot(
                null
            );

            setToast(
                `${spot.name} marked ${status.toLowerCase()}.`
            );
        } catch (err) {
            console.error(
                "Spot status update error:",
                err
            );

            setToast(
                "We couldn't update this spot."
            );
        } finally {
            setActionLoading(
                false
            );
        }
    }

    async function toggleVerified(
        spot: Spot
    ) {
        setActionLoading(
            true
        );

        const nextValue =
            !Boolean(
                spot.verified
            );

        try {
            const {
                error: updateError,
            } =
                await supabase
                    .from(
                        "nt_spots"
                    )
                    .update({
                        verified:
                            nextValue,
                    })
                    .eq(
                        "id",
                        spot.id
                    );

            if (
                updateError
            ) {
                throw updateError;
            }

            setSpots(
                (
                    current
                ) =>
                    current.map(
                        (
                            item
                        ) =>
                            item.id ===
                                spot.id
                                ? {
                                    ...item,
                                    verified:
                                        nextValue,
                                }
                                : item
                    )
            );

            setSelectedSpot(
                (
                    current
                ) =>
                    current?.id ===
                        spot.id
                        ? {
                            ...current,
                            verified:
                                nextValue,
                        }
                        : current
            );

            setToast(
                nextValue
                    ? "Spot verified."
                    : "Verification removed."
            );
        } catch (err) {
            console.error(
                "Spot verification error:",
                err
            );

            setToast(
                "We couldn't update verification."
            );
        } finally {
            setActionLoading(
                false
            );
        }
    }

    async function toggleFeatured(
        spot: Spot
    ) {
        setActionLoading(
            true
        );

        const nextValue =
            !Boolean(
                spot.featured
            );

        try {
            const {
                error: updateError,
            } =
                await supabase
                    .from(
                        "nt_spots"
                    )
                    .update({
                        featured:
                            nextValue,
                    })
                    .eq(
                        "id",
                        spot.id
                    );

            if (
                updateError
            ) {
                throw updateError;
            }

            setSpots(
                (
                    current
                ) =>
                    current.map(
                        (
                            item
                        ) =>
                            item.id ===
                                spot.id
                                ? {
                                    ...item,
                                    featured:
                                        nextValue,
                                }
                                : item
                    )
            );

            setSelectedSpot(
                (
                    current
                ) =>
                    current?.id ===
                        spot.id
                        ? {
                            ...current,
                            featured:
                                nextValue,
                        }
                        : current
            );

            setToast(
                nextValue
                    ? "Spot featured."
                    : "Spot removed from featured."
            );
        } catch (err) {
            console.error(
                "Spot featured update error:",
                err
            );

            setToast(
                "We couldn't update the featured status."
            );
        } finally {
            setActionLoading(
                false
            );
        }
    }

    return (
        <main className="nt-admin-page">
            <div className="nt-admin-container">
                <header className="nt-admin-header nt-admin-inner-header">
                    <div>
                        <Link
                            href="/admin"
                            className="nt-admin-back"
                        >
                            <ArrowLeft
                                size={
                                    14
                                }
                            />
                            Admin dashboard
                        </Link>

                        <div className="nt-admin-eyebrow">
                            <Store
                                size={
                                    14
                                }
                            />
                            CONTENT MANAGEMENT
                        </div>

                        <h1>
                            Spots
                        </h1>

                        <p>
                            Manage the places
                            published across
                            NiceThings.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="nt-admin-refresh"
                        onClick={() =>
                            void loadSpots(
                                true
                            )
                        }
                        disabled={
                            refreshing
                        }
                    >
                        <RefreshCw
                            size={
                                15
                            }
                            className={
                                refreshing
                                    ? "nt-admin-spin"
                                    : ""
                            }
                        />
                        Refresh
                    </button>
                </header>

                {error && (
                    <div className="nt-admin-error">
                        <AlertTriangle
                            size={
                                17
                            }
                        />

                        <span>
                            {error}
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                void loadSpots()
                            }
                        >
                            Try again
                        </button>
                    </div>
                )}

                <section className="nt-admin-mini-stats">
                    <MiniStat
                        label="All spots"
                        value={
                            counts.all
                        }
                        active={
                            filter ===
                            "ALL"
                        }
                        onClick={() =>
                            setFilter(
                                "ALL"
                            )
                        }
                    />

                    <MiniStat
                        label="Published"
                        value={
                            counts.approved
                        }
                        active={
                            filter ===
                            "APPROVED"
                        }
                        onClick={() =>
                            setFilter(
                                "APPROVED"
                            )
                        }
                    />

                    <MiniStat
                        label="Pending"
                        value={
                            counts.pending
                        }
                        active={
                            filter ===
                            "PENDING"
                        }
                        onClick={() =>
                            setFilter(
                                "PENDING"
                            )
                        }
                    />

                    <MiniStat
                        label="Rejected"
                        value={
                            counts.rejected
                        }
                        active={
                            filter ===
                            "REJECTED"
                        }
                        onClick={() =>
                            setFilter(
                                "REJECTED"
                            )
                        }
                    />
                </section>

                <section className="nt-admin-toolbar">
                    <div className="nt-admin-search">
                        <Search
                            size={
                                17
                            }
                        />

                        <input
                            value={
                                search
                            }
                            onChange={(
                                event
                            ) =>
                                setSearch(
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder="Search spots, cities, categories..."
                            aria-label="Search spots"
                        />

                        {search && (
                            <button
                                type="button"
                                onClick={() =>
                                    setSearch(
                                        ""
                                    )
                                }
                                aria-label="Clear search"
                            >
                                <X
                                    size={
                                        15
                                    }
                                />
                            </button>
                        )}
                    </div>

                    <span className="nt-admin-result-count">
                        {loading
                            ? "Loading..."
                            : `${filteredSpots.length} result${filteredSpots.length ===
                                1
                                ? ""
                                : "s"
                            }`}
                    </span>
                </section>

                <section className="nt-admin-spots-panel">
                    {loading ? (
                        <SpotsSkeleton />
                    ) : filteredSpots.length ===
                        0 ? (
                        <div className="nt-admin-large-empty">
                            <div>
                                <Search
                                    size={
                                        22
                                    }
                                />
                            </div>

                            <h2>
                                No spots found
                            </h2>

                            <p>
                                Try another search
                                or change the
                                current filter.
                            </p>

                            {(search ||
                                filter !==
                                "ALL") && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearch(
                                                ""
                                            );
                                            setFilter(
                                                "ALL"
                                            );
                                        }}
                                    >
                                        Clear filters
                                    </button>
                                )}
                        </div>
                    ) : (
                        <div className="nt-admin-spots-list">
                            {filteredSpots.map(
                                (
                                    spot
                                ) => (
                                    <article
                                        className="nt-admin-spot-row"
                                        key={
                                            spot.id
                                        }
                                    >
                                        <div className="nt-admin-spot-icon">
                                            <MapPin
                                                size={
                                                    18
                                                }
                                            />
                                        </div>

                                        <div className="nt-admin-spot-main">
                                            <div className="nt-admin-spot-title">
                                                <h2>
                                                    {
                                                        spot.name
                                                    }
                                                </h2>

                                                {spot.verified && (
                                                    <span className="nt-admin-verified">
                                                        <Check
                                                            size={
                                                                11
                                                            }
                                                        />
                                                        Verified
                                                    </span>
                                                )}

                                                {spot.featured && (
                                                    <span className="nt-admin-featured">
                                                        Featured
                                                    </span>
                                                )}
                                            </div>

                                            <p>
                                                {[
                                                    spot.category,
                                                    spot.cuisine,
                                                    spot.city,
                                                    spot.neighborhood,
                                                ]
                                                    .filter(
                                                        Boolean
                                                    )
                                                    .join(
                                                        " · "
                                                    ) ||
                                                    "No additional details"}
                                            </p>

                                            <div className="nt-admin-spot-meta">
                                                {spot.rating !==
                                                    null && (
                                                        <span>
                                                            <Star
                                                                size={
                                                                    12
                                                                }
                                                                fill="currentColor"
                                                            />
                                                            {Number(
                                                                spot.rating
                                                            ).toFixed(
                                                                1
                                                            )}
                                                        </span>
                                                    )}

                                                <StatusBadge
                                                    status={
                                                        spot.status
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="nt-admin-spot-actions">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedSpot(
                                                        spot
                                                    )
                                                }
                                                title="Manage spot"
                                            >
                                                <Eye
                                                    size={
                                                        16
                                                    }
                                                />
                                                <span>
                                                    Manage
                                                </span>
                                            </button>

                                            {spot.slug && (
                                                <Link
                                                    href={`/spots/${spot.slug}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    title="View public page"
                                                >
                                                    <ExternalLink
                                                        size={
                                                            15
                                                        }
                                                    />
                                                </Link>
                                            )}
                                        </div>
                                    </article>
                                )
                            )}
                        </div>
                    )}
                </section>

                <footer className="nt-admin-footer">
                    <div>
                        <ShieldCheck
                            size={
                                14
                            }
                        />
                        NiceThings Admin
                    </div>

                    <span>
                        Content management
                    </span>
                </footer>
            </div>

            {selectedSpot && (
                <SpotManagementModal
                    spot={
                        selectedSpot
                    }
                    loading={
                        actionLoading
                    }
                    close={() =>
                        setSelectedSpot(
                            null
                        )
                    }
                    updateStatus={
                        updateSpotStatus
                    }
                    toggleVerified={
                        toggleVerified
                    }
                    toggleFeatured={
                        toggleFeatured
                    }
                />
            )}

            {toast && (
                <div className="nt-admin-toast">
                    <CheckCircle2
                        size={
                            16
                        }
                    />
                    {toast}
                </div>
            )}
        </main>
    );
}

function MiniStat({
    label,
    value,
    active,
    onClick,
}: {
    label: string;
    value: number;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            className={
                active
                    ? "nt-admin-mini-stat active"
                    : "nt-admin-mini-stat"
            }
            onClick={
                onClick
            }
        >
            <strong>
                {value.toLocaleString(
                    "en-US"
                )}
            </strong>

            <span>
                {label}
            </span>
        </button>
    );
}

function StatusBadge({
    status,
}: {
    status: string | null;
}) {
    const normalized =
        (
            status ??
            "UNKNOWN"
        ).toUpperCase();

    let label =
        "Unknown";

    if (
        normalized ===
        "APPROVED"
    ) {
        label =
            "Published";
    } else if (
        normalized ===
        "PENDING"
    ) {
        label =
            "Pending";
    } else if (
        normalized ===
        "REJECTED"
    ) {
        label =
            "Rejected";
    }

    return (
        <span
            className={`nt-admin-status ${normalized.toLowerCase()}`}
        >
            {label}
        </span>
    );
}

function SpotManagementModal({
    spot,
    loading,
    close,
    updateStatus,
    toggleVerified,
    toggleFeatured,
}: {
    spot: Spot;
    loading: boolean;
    close: () => void;
    updateStatus: (
        spot: Spot,
        status:
            | "APPROVED"
            | "PENDING"
            | "REJECTED"
    ) => Promise<void>;
    toggleVerified: (
        spot: Spot
    ) => Promise<void>;
    toggleFeatured: (
        spot: Spot
    ) => Promise<void>;
}) {
    return (
        <div
            className="nt-admin-modal-backdrop"
            onClick={close}
        >
            <section
                className="nt-admin-modal"
                onClick={(event) =>
                    event.stopPropagation()
                }
            >
                <header className="nt-admin-modal-header">
                    <div>
                        <span>
                            MANAGE SPOT
                        </span>

                        <h2>
                            {spot.name}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={
                            close
                        }
                        aria-label="Close"
                    >
                        <X
                            size={
                                19
                            }
                        />
                    </button>
                </header>

                <div className="nt-admin-modal-content">
                    <div className="nt-admin-modal-location">
                        <MapPin
                            size={
                                16
                            }
                        />

                        <span>
                            {[
                                spot.address,
                                spot.neighborhood,
                                spot.city,
                            ]
                                .filter(
                                    Boolean
                                )
                                .join(
                                    ", "
                                ) ||
                                "Location not provided"}
                        </span>
                    </div>

                    <div className="nt-admin-modal-details">
                        <Detail
                            label="Category"
                            value={
                                spot.category ||
                                "—"
                            }
                        />

                        <Detail
                            label="Cuisine"
                            value={
                                spot.cuisine ||
                                "—"
                            }
                        />

                        <Detail
                            label="Rating"
                            value={
                                spot.rating !==
                                    null
                                    ? `${Number(
                                        spot.rating
                                    ).toFixed(
                                        1
                                    )} / 5`
                                    : "No rating"
                            }
                        />

                        <Detail
                            label="Reviews"
                            value={String(
                                spot.review_count ??
                                0
                            )}
                        />
                    </div>

                    <div className="nt-admin-modal-status">
                        <span>
                            Current status
                        </span>

                        <StatusBadge
                            status={
                                spot.status
                            }
                        />
                    </div>

                    <div className="nt-admin-modal-actions">
                        <button
                            type="button"
                            disabled={
                                loading ||
                                spot.status ===
                                "APPROVED"
                            }
                            onClick={() =>
                                void updateStatus(
                                    spot,
                                    "APPROVED"
                                )
                            }
                        >
                            <CheckCircle2
                                size={
                                    16
                                }
                            />
                            Publish
                        </button>

                        <button
                            type="button"
                            disabled={
                                loading ||
                                spot.status ===
                                "PENDING"
                            }
                            onClick={() =>
                                void updateStatus(
                                    spot,
                                    "PENDING"
                                )
                            }
                        >
                            <Clock3
                                size={
                                    16
                                }
                            />
                            Set pending
                        </button>

                        <button
                            type="button"
                            className="danger"
                            disabled={
                                loading ||
                                spot.status ===
                                "REJECTED"
                            }
                            onClick={() =>
                                void updateStatus(
                                    spot,
                                    "REJECTED"
                                )
                            }
                        >
                            <X
                                size={
                                    16
                                }
                            />
                            Reject
                        </button>
                    </div>

                    <div className="nt-admin-modal-secondary">
                        <button
                            type="button"
                            disabled={
                                loading
                            }
                            onClick={() =>
                                void toggleVerified(
                                    spot
                                )
                            }
                        >
                            <ShieldCheck
                                size={
                                    16
                                }
                            />

                            {spot.verified
                                ? "Remove verification"
                                : "Mark as verified"}
                        </button>

                        <button
                            type="button"
                            disabled={
                                loading
                            }
                            onClick={() =>
                                void toggleFeatured(
                                    spot
                                )
                            }
                        >
                            <Star
                                size={
                                    16
                                }
                                fill={
                                    spot.featured
                                        ? "currentColor"
                                        : "none"
                                }
                            />

                            {spot.featured
                                ? "Remove from featured"
                                : "Feature this spot"}
                        </button>
                    </div>

                    {spot.slug && (
                        <Link
                            href={`/spots/${spot.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="nt-admin-view-public"
                        >
                            <Eye
                                size={
                                    16
                                }
                            />
                            View public page
                            <ArrowRight
                                size={
                                    15
                                }
                            />
                        </Link>
                    )}
                </div>
            </section>
        </div>
    );
}

function Detail({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <span>
                {label}
            </span>

            <strong>
                {value}
            </strong>
        </div>
    );
}

function SpotsSkeleton() {
    return (
        <div className="nt-admin-spots-list">
            {Array.from({
                length: 7,
            }).map(
                (
                    _,
                    index
                ) => (
                    <div
                        className="nt-admin-spot-row nt-admin-skeleton-spot"
                        key={
                            index
                        }
                    >
                        <span />

                        <div>
                            <i />
                            <i />
                            <i />
                        </div>

                        <b />
                    </div>
                )
            )}
        </div>
    );
}