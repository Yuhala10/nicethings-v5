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
    MapPin,
    RefreshCw,
    Search,
    ShieldCheck,
    Store,
    X,
} from "lucide-react";

import {
    getSupabaseBrowserClient,
} from "../../../lib/supabase/client";

type Submission = {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    cuisine: string | null;
    city: string | null;
    neighborhood: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    whatsapp: string | null;
    website: string | null;
    status: string | null;
    created_at: string | null;
    updated_at: string | null;
};

type Filter =
    | "ALL"
    | "PENDING"
    | "APPROVED"
    | "REJECTED";

export default function AdminSubmissionsPage() {
    const supabase = useMemo(
        () =>
            getSupabaseBrowserClient() as any,
        []
    );

    const [
        submissions,
        setSubmissions,
    ] = useState<Submission[]>(
        []
    );

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
            "PENDING"
        );

    const [
        selectedSubmission,
        setSelectedSubmission,
    ] =
        useState<Submission | null>(
            null
        );

    const [
        actionLoading,
        setActionLoading,
    ] = useState(false);

    const [toast, setToast] =
        useState<string | null>(
            null
        );

    const loadSubmissions =
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
                        error:
                        submissionsError,
                    } =
                        await supabase
                            .from(
                                "nt_spot_submissions"
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
                        submissionsError
                    ) {
                        throw submissionsError;
                    }

                    setSubmissions(
                        (data ??
                            []) as Submission[]
                    );
                } catch (err) {
                    console.error(
                        "Admin submissions error:",
                        err
                    );

                    setError(
                        "We couldn't load the submissions."
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
        void loadSubmissions();
    }, [loadSubmissions]);

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

    const counts = useMemo(
        () => ({
            all: submissions.length,
            pending: submissions.filter(
                (item) =>
                    item.status ===
                    "PENDING"
            ).length,
            approved: submissions.filter(
                (item) =>
                    item.status ===
                    "APPROVED"
            ).length,
            rejected: submissions.filter(
                (item) =>
                    item.status ===
                    "REJECTED"
            ).length,
        }),
        [submissions]
    );

    const filteredSubmissions =
        useMemo(() => {
            const query =
                search
                    .trim()
                    .toLowerCase();

            return submissions.filter(
                (submission) => {
                    const matchesFilter =
                        filter ===
                        "ALL" ||
                        submission.status ===
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
                        submission.name,
                        submission.description,
                        submission.category,
                        submission.cuisine,
                        submission.city,
                        submission.neighborhood,
                        submission.address,
                    ]
                        .filter(
                            Boolean
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
            submissions,
            filter,
            search,
        ]);

    async function updateStatus(
        submission: Submission,
        status:
            | "PENDING"
            | "APPROVED"
            | "REJECTED"
    ) {
        setActionLoading(
            true
        );

        try {
            const {
                error:
                updateError,
            } =
                await supabase
                    .from(
                        "nt_spot_submissions"
                    )
                    .update({
                        status,
                    })
                    .eq(
                        "id",
                        submission.id
                    );

            if (
                updateError
            ) {
                throw updateError;
            }

            setSubmissions(
                (
                    current
                ) =>
                    current.map(
                        (
                            item
                        ) =>
                            item.id ===
                                submission.id
                                ? {
                                    ...item,
                                    status,
                                }
                                : item
                    )
            );

            setSelectedSubmission(
                null
            );

            setToast(
                status ===
                    "APPROVED"
                    ? `${submission.name} approved.`
                    : status ===
                        "REJECTED"
                        ? `${submission.name} rejected.`
                        : `${submission.name} moved back to pending.`
            );
        } catch (err) {
            console.error(
                "Submission status error:",
                err
            );

            setToast(
                "We couldn't update this submission."
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
                            <Clock3
                                size={
                                    14
                                }
                            />
                            COMMUNITY SUBMISSIONS
                        </div>

                        <h1>
                            Submissions
                        </h1>

                        <p>
                            Review places submitted
                            by the NiceThings
                            community.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="nt-admin-refresh"
                        onClick={() =>
                            void loadSubmissions(
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
                                void loadSubmissions()
                            }
                        >
                            Try again
                        </button>
                    </div>
                )}

                <section className="nt-admin-mini-stats">
                    <MiniStat
                        label="All"
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
                        label="Approved"
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
                            placeholder="Search submissions..."
                            aria-label="Search submissions"
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
                            : `${filteredSubmissions.length} result${filteredSubmissions.length ===
                                1
                                ? ""
                                : "s"
                            }`}
                    </span>
                </section>

                <section className="nt-admin-spots-panel">
                    {loading ? (
                        <SubmissionSkeleton />
                    ) : filteredSubmissions.length ===
                        0 ? (
                        <div className="nt-admin-large-empty">
                            <div>
                                <CheckCircle2
                                    size={
                                        22
                                    }
                                />
                            </div>

                            <h2>
                                {filter ===
                                    "PENDING"
                                    ? "No pending submissions"
                                    : "No submissions found"}
                            </h2>

                            <p>
                                {filter ===
                                    "PENDING"
                                    ? "You're all caught up. New community submissions will appear here."
                                    : "Try another filter or search term."}
                            </p>

                            {(search ||
                                filter !==
                                "PENDING") && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearch(
                                                ""
                                            );
                                            setFilter(
                                                "PENDING"
                                            );
                                        }}
                                    >
                                        Show pending
                                    </button>
                                )}
                        </div>
                    ) : (
                        <div className="nt-admin-spots-list">
                            {filteredSubmissions.map(
                                (
                                    submission
                                ) => (
                                    <article
                                        className="nt-admin-spot-row"
                                        key={
                                            submission.id
                                        }
                                    >
                                        <div className="nt-admin-spot-icon">
                                            <Store
                                                size={
                                                    18
                                                }
                                            />
                                        </div>

                                        <div className="nt-admin-spot-main">
                                            <div className="nt-admin-spot-title">
                                                <h2>
                                                    {
                                                        submission.name
                                                    }
                                                </h2>

                                                <StatusBadge
                                                    status={
                                                        submission.status
                                                    }
                                                />
                                            </div>

                                            <p>
                                                {[
                                                    submission.category,
                                                    submission.cuisine,
                                                    submission.city,
                                                    submission.neighborhood,
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
                                                <span>
                                                    <Clock3
                                                        size={
                                                            12
                                                        }
                                                    />

                                                    {formatDate(
                                                        submission.created_at
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="nt-admin-spot-actions">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedSubmission(
                                                        submission
                                                    )
                                                }
                                                title="Review submission"
                                            >
                                                <Eye
                                                    size={
                                                        16
                                                    }
                                                />

                                                <span>
                                                    Review
                                                </span>
                                            </button>
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
                        Community submissions
                    </span>
                </footer>
            </div>

            {selectedSubmission && (
                <SubmissionModal
                    submission={
                        selectedSubmission
                    }
                    loading={
                        actionLoading
                    }
                    close={() =>
                        setSelectedSubmission(
                            null
                        )
                    }
                    updateStatus={
                        updateStatus
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

    const label =
        normalized ===
            "PENDING"
            ? "Pending"
            : normalized ===
                "APPROVED"
                ? "Approved"
                : normalized ===
                    "REJECTED"
                    ? "Rejected"
                    : "Unknown";

    return (
        <span
            className={`nt-admin-status ${normalized.toLowerCase()}`}
        >
            {label}
        </span>
    );
}

function SubmissionModal({
    submission,
    loading,
    close,
    updateStatus,
}: {
    submission: Submission;
    loading: boolean;
    close: () => void;
    updateStatus: (
        submission: Submission,
        status:
            | "PENDING"
            | "APPROVED"
            | "REJECTED"
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
                            SUBMISSION REVIEW
                        </span>

                        <h2>
                            {
                                submission.name
                            }
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
                                submission.address,
                                submission.neighborhood,
                                submission.city,
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

                    {submission.description && (
                        <div className="nt-admin-description">
                            <span>
                                DESCRIPTION
                            </span>

                            <p>
                                {
                                    submission.description
                                }
                            </p>
                        </div>
                    )}

                    <div className="nt-admin-modal-details">
                        <Detail
                            label="Category"
                            value={
                                submission.category ||
                                "—"
                            }
                        />

                        <Detail
                            label="Cuisine"
                            value={
                                submission.cuisine ||
                                "—"
                            }
                        />

                        <Detail
                            label="Phone"
                            value={
                                submission.phone ||
                                "—"
                            }
                        />

                        <Detail
                            label="WhatsApp"
                            value={
                                submission.whatsapp ||
                                "—"
                            }
                        />

                        <Detail
                            label="Website"
                            value={
                                submission.website ||
                                "—"
                            }
                        />

                        <Detail
                            label="Submitted"
                            value={formatDate(
                                submission.created_at
                            )}
                        />
                    </div>

                    <div className="nt-admin-modal-status">
                        <span>
                            Current status
                        </span>

                        <StatusBadge
                            status={
                                submission.status
                            }
                        />
                    </div>

                    <div className="nt-admin-modal-actions">
                        <button
                            type="button"
                            disabled={
                                loading ||
                                submission.status ===
                                "APPROVED"
                            }
                            onClick={() =>
                                void updateStatus(
                                    submission,
                                    "APPROVED"
                                )
                            }
                        >
                            <CheckCircle2
                                size={
                                    16
                                }
                            />
                            Approve
                        </button>

                        <button
                            type="button"
                            disabled={
                                loading ||
                                submission.status ===
                                "PENDING"
                            }
                            onClick={() =>
                                void updateStatus(
                                    submission,
                                    "PENDING"
                                )
                            }
                        >
                            <Clock3
                                size={
                                    16
                                }
                            />
                            Keep pending
                        </button>

                        <button
                            type="button"
                            className="danger"
                            disabled={
                                loading ||
                                submission.status ===
                                "REJECTED"
                            }
                            onClick={() =>
                                void updateStatus(
                                    submission,
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

                    {submission.latitude !==
                        null &&
                        submission.longitude !==
                        null && (
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${submission.latitude},${submission.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="nt-admin-view-public"
                            >
                                <MapPin
                                    size={
                                        16
                                    }
                                />

                                View submitted
                                location

                                <ArrowRight
                                    size={
                                        15
                                    }
                                />
                            </a>
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

function SubmissionSkeleton() {
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

function formatDate(
    value: string | null
) {
    if (!value) {
        return "Date unavailable";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "Date unavailable";
    }

    return new Intl.DateTimeFormat(
        "en",
        {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        }
    ).format(date);
}