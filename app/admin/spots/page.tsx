"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
    type ReactNode,
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
    Pencil,
    Plus,
    Save,
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

    const [editingSpot, setEditingSpot] =
        useState<Spot | null>(null);

    const [creatingSpot, setCreatingSpot] =
        useState(false);

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

    async function saveSpot(
        values: Partial<Spot>,
        existingId?: string
    ) {
        setActionLoading(true);

        try {
            if (existingId) {
                const { data, error: updateError } =
                    await supabase
                        .from("nt_spots")
                        .update(values)
                        .eq("id", existingId)
                        .select("*")
                        .single();

                if (updateError) throw updateError;

                setSpots((current) =>
                    current.map((item) =>
                        item.id === existingId
                            ? (data as Spot)
                            : item
                    )
                );

                setSelectedSpot((current) =>
                    current?.id === existingId
                        ? (data as Spot)
                        : current
                );

                setEditingSpot(null);
                setToast("Place updated successfully.");
            } else {
                const payload = {
                    name: values.name,
                    slug:
                        values.slug ||
                        String(values.name || "")
                            .trim()
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-+|-+$/g, ""),
                    category: values.category || null,
                    cuisine: values.cuisine || null,
                    city: values.city || null,
                    neighborhood: values.neighborhood || null,
                    address: values.address || null,
                    status: values.status || "PENDING",
                    verified: Boolean(values.verified),
                    featured: Boolean(values.featured),
                };

                const { data, error: insertError } =
                    await supabase
                        .from("nt_spots")
                        .insert(payload)
                        .select("*")
                        .single();

                if (insertError) throw insertError;

                setSpots((current) => [
                    data as Spot,
                    ...current,
                ]);

                setCreatingSpot(false);
                setToast("Place created successfully.");
            }
        } catch (err) {
            console.error("Admin spot save error:", err);
            setToast(
                existingId
                    ? "We couldn't save this place."
                    : "We couldn't create this place."
            );
        } finally {
            setActionLoading(false);
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

                    <div className="nt-admin-header-actions">
                        <button
                            type="button"
                            className="nt-admin-add-place"
                            onClick={() => setCreatingSpot(true)}
                        >
                            <Plus size={15} />
                            Add place
                        </button>

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
                    </div>
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
                    onEdit={() => {
                        setEditingSpot(selectedSpot);
                        setSelectedSpot(null);
                    }}
                />
            )}

            {editingSpot && (
                <SpotEditorModal
                    spot={editingSpot}
                    loading={actionLoading}
                    close={() => setEditingSpot(null)}
                    save={(values) =>
                        saveSpot(values, editingSpot.id)
                    }
                />
            )}

            {creatingSpot && (
                <SpotEditorModal
                    loading={actionLoading}
                    close={() => setCreatingSpot(false)}
                    save={(values) => saveSpot(values)}
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
    onEdit,
}: {
    spot: Spot;
    loading: boolean;
    close: () => void;
    onEdit: () => void;
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
                            className="nt-admin-edit-primary"
                            disabled={loading}
                            onClick={onEdit}
                        >
                            <Pencil size={16} />
                            Edit place
                        </button>

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

function SpotEditorModal({
    spot,
    loading,
    close,
    save,
}: {
    spot?: Spot;
    loading: boolean;
    close: () => void;
    save: (values: Partial<Spot>) => Promise<void>;
}) {
    const [form, setForm] = useState({
        name: spot?.name ?? "",
        slug: spot?.slug ?? "",
        category: spot?.category ?? "",
        cuisine: spot?.cuisine ?? "",
        city: spot?.city ?? "",
        neighborhood: spot?.neighborhood ?? "",
        address: spot?.address ?? "",
        status: spot?.status ?? "PENDING",
        verified: Boolean(spot?.verified),
        featured: Boolean(spot?.featured),
    });

    function update<K extends keyof typeof form>(
        key: K,
        value: (typeof form)[K]
    ) {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    }

    async function submit(event: FormEvent) {
        event.preventDefault();

        if (!form.name.trim()) return;

        await save({
            ...form,
            name: form.name.trim(),
            slug: form.slug.trim() || null,
            category: form.category.trim() || null,
            cuisine: form.cuisine.trim() || null,
            city: form.city.trim() || null,
            neighborhood: form.neighborhood.trim() || null,
            address: form.address.trim() || null,
        });
    }

    return (
        <div
            className="nt-admin-modal-backdrop"
            onClick={close}
        >
            <section
                className="nt-admin-editor-modal"
                onClick={(event) =>
                    event.stopPropagation()
                }
            >
                <header className="nt-admin-modal-header">
                    <div>
                        <span>
                            {spot
                                ? "EDIT PLACE"
                                : "ADD PLACE"}
                        </span>

                        <h2>
                            {spot
                                ? spot.name
                                : "Create a new place"}
                        </h2>

                        <p className="nt-admin-editor-intro">
                            Keep the information clean and
                            accurate so NiceThings can present
                            this place beautifully.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={close}
                        aria-label="Close editor"
                        className="nt-admin-modal-close"
                    >
                        <X size={19} />
                    </button>
                </header>

                <form
                    className="nt-admin-editor-form"
                    onSubmit={submit}
                >
                    <div className="nt-admin-editor-section">
                        <div className="nt-admin-editor-section-title">
                            <span>01</span>
                            <div>
                                <strong>Identity</strong>
                                <small>
                                    The information visitors see first.
                                </small>
                            </div>
                        </div>

                        <div className="nt-admin-editor-grid">
                            <Field
                                label="Place name"
                                value={form.name}
                                required
                                onChange={(value) =>
                                    update("name", value)
                                }
                            />

                            <Field
                                label="Slug"
                                value={form.slug}
                                onChange={(value) =>
                                    update("slug", value)
                                }
                            />

                            <Field
                                label="Category"
                                value={form.category}
                                onChange={(value) =>
                                    update("category", value)
                                }
                            />

                            <Field
                                label="Cuisine / style"
                                value={form.cuisine}
                                onChange={(value) =>
                                    update("cuisine", value)
                                }
                            />
                        </div>
                    </div>

                    <div className="nt-admin-editor-section">
                        <div className="nt-admin-editor-section-title">
                            <span>02</span>
                            <div>
                                <strong>Location</strong>
                                <small>
                                    Keep the place easy to find.
                                </small>
                            </div>
                        </div>

                        <div className="nt-admin-location-editor-card">
                            <div className="nt-admin-location-editor-icon">
                                <MapPin size={19} />
                            </div>
                            <div>
                                <strong>Place location</strong>
                                <span>
                                    City and area information is used
                                    throughout discovery and search.
                                </span>
                            </div>
                        </div>

                        <div className="nt-admin-editor-grid">
                            <Field
                                label="City"
                                value={form.city}
                                onChange={(value) =>
                                    update("city", value)
                                }
                            />

                            <Field
                                label="Neighborhood / area"
                                value={form.neighborhood}
                                onChange={(value) =>
                                    update("neighborhood", value)
                                }
                            />

                            <Field
                                label="Address"
                                value={form.address}
                                wide
                                onChange={(value) =>
                                    update("address", value)
                                }
                            />
                        </div>
                    </div>

                    <div className="nt-admin-editor-section">
                        <div className="nt-admin-editor-section-title">
                            <span>03</span>
                            <div>
                                <strong>Publishing</strong>
                                <small>
                                    Control how this place appears.
                                </small>
                            </div>
                        </div>

                        <div className="nt-admin-editor-grid">
                            <SelectField
                                label="Status"
                                value={form.status}
                                options={[
                                    ["PENDING", "Pending review"],
                                    ["APPROVED", "Published"],
                                    ["REJECTED", "Rejected"],
                                ]}
                                onChange={(value) =>
                                    update("status", value)
                                }
                            />
                        </div>

                        <div className="nt-admin-toggle-grid">
                            <ToggleField
                                label="Verified place"
                                description="Show the verified badge."
                                checked={form.verified}
                                onChange={(value) =>
                                    update("verified", value)
                                }
                                icon={<ShieldCheck size={17} />}
                            />

                            <ToggleField
                                label="Featured place"
                                description="Allow the place to appear in featured areas."
                                checked={form.featured}
                                onChange={(value) =>
                                    update("featured", value)
                                }
                                icon={
                                    <Star
                                        size={17}
                                        fill={
                                            form.featured
                                                ? "currentColor"
                                                : "none"
                                        }
                                    />
                                }
                            />
                        </div>
                    </div>

                    <footer className="nt-admin-editor-footer">
                        <button
                            type="button"
                            className="nt-admin-editor-cancel"
                            onClick={close}
                            disabled={loading}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="nt-admin-editor-save"
                            disabled={
                                loading ||
                                !form.name.trim()
                            }
                        >
                            <Save size={16} />
                            {loading
                                ? "Saving..."
                                : spot
                                    ? "Save changes"
                                    : "Create place"}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}

function Field({
    label,
    value,
    required = false,
    wide = false,
    onChange,
}: {
    label: string;
    value: string;
    required?: boolean;
    wide?: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <label
            className={
                wide
                    ? "nt-admin-field nt-admin-field-wide"
                    : "nt-admin-field"
            }
        >
            <span>
                {label}
                {required && (
                    <b aria-hidden="true">*</b>
                )}
            </span>
            <input
                value={value}
                required={required}
                onChange={(event) =>
                    onChange(event.target.value)
                }
            />
        </label>
    );
}

function SelectField({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: [string, string][];
    onChange: (value: string) => void;
}) {
    return (
        <label className="nt-admin-field">
            <span>{label}</span>
            <select
                value={value}
                onChange={(event) =>
                    onChange(event.target.value)
                }
            >
                {options.map(([option, label]) => (
                    <option
                        key={option}
                        value={option}
                    >
                        {label}
                    </option>
                ))}
            </select>
        </label>
    );
}

function ToggleField({
    label,
    description,
    checked,
    onChange,
    icon,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    icon: ReactNode;
}) {
    return (
        <label className="nt-admin-toggle-card">
            <span className="nt-admin-toggle-icon">
                {icon}
            </span>

            <span className="nt-admin-toggle-copy">
                <strong>{label}</strong>
                <small>{description}</small>
            </span>

            <input
                type="checkbox"
                checked={checked}
                onChange={(event) =>
                    onChange(event.target.checked)
                }
            />

            <span className="nt-admin-toggle-switch" />
        </label>
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