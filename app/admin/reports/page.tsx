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
    Flag,
    RefreshCw,
    Search,
    ShieldCheck,
    Store,
    X,
} from "lucide-react";

import {
    getSupabaseBrowserClient,
} from "../../../lib/supabase/client";

type Report = {
    id: string;
    reason: string | null;
    description: string | null;
    status: string | null;
    created_at: string | null;
    updated_at: string | null;
    spot_id: string | null;
    visitor_id: string | null;
};

type Spot = {
    id: string;
    name: string;
    slug: string | null;
    city: string | null;
    neighborhood: string | null;
    status: string | null;
};

type Filter =
    | "ALL"
    | "PENDING"
    | "RESOLVED"
    | "REJECTED";

export default function AdminReportsPage() {
    const supabase = useMemo(
        () =>
            getSupabaseBrowserClient() as any,
        []
    );

    const [reports, setReports] =
        useState<Report[]>([]);

    const [spots, setSpots] =
        useState<Record<
            string,
            Spot
        >>({});

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

    const [selectedReport, setSelectedReport] =
        useState<Report | null>(
            null
        );

    const [actionLoading, setActionLoading] =
        useState(false);

    const [toast, setToast] =
        useState<string | null>(
            null
        );

    const loadReports =
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
                        reportsError,
                    } =
                        await supabase
                            .from(
                                "nt_reports"
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
                        reportsError
                    ) {
                        throw reportsError;
                    }

                    const reportRows =
                        (data ??
                            []) as Report[];

                    setReports(
                        reportRows
                    );

                    const spotIds =
                        Array.from(
                            new Set(
                                reportRows
                                    .map(
                                        (
                                            report
                                        ) =>
                                            report.spot_id
                                    )
                                    .filter(
                                        (
                                            id
                                        ): id is string =>
                                            Boolean(
                                                id
                                            )
                                    )
                            )
                        );

                    if (
                        spotIds.length >
                        0
                    ) {
                        const {
                            data:
                            spotData,
                            error:
                            spotsError,
                        } =
                            await supabase
                                .from(
                                    "nt_spots"
                                )
                                .select(
                                    "id,name,slug,city,neighborhood,status"
                                )
                                .in(
                                    "id",
                                    spotIds
                                );

                        if (
                            spotsError
                        ) {
                            console.warn(
                                "Could not load reported spots:",
                                spotsError
                            );
                        } else {
                            const map: Record<
                                string,
                                Spot
                            > = {};

                            (
                                (spotData ??
                                    []) as Spot[]
                            ).forEach(
                                (
                                    spot
                                ) => {
                                    map[
                                        spot.id
                                    ] =
                                        spot;
                                }
                            );

                            setSpots(
                                map
                            );
                        }
                    } else {
                        setSpots(
                            {}
                        );
                    }
                } catch (err) {
                    console.error(
                        "Admin reports error:",
                        err
                    );

                    setError(
                        "We couldn't load the reports."
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
        void loadReports();
    }, [loadReports]);

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
            all: reports.length,

            pending:
                reports.filter(
                    (
                        report
                    ) =>
                        normalizeStatus(
                            report.status
                        ) ===
                        "PENDING"
                ).length,

            resolved:
                reports.filter(
                    (
                        report
                    ) =>
                        normalizeStatus(
                            report.status
                        ) ===
                        "RESOLVED"
                ).length,

            rejected:
                reports.filter(
                    (
                        report
                    ) =>
                        normalizeStatus(
                            report.status
                        ) ===
                        "REJECTED"
                ).length,
        }),
        [reports]
    );

    const filteredReports =
        useMemo(() => {
            const query =
                search
                    .trim()
                    .toLowerCase();

            return reports.filter(
                (
                    report
                ) => {
                    const status =
                        normalizeStatus(
                            report.status
                        );

                    const matchesFilter =
                        filter ===
                        "ALL" ||
                        status ===
                        filter;

                    if (
                        !matchesFilter
                    ) {
                        return false;
                    }

                    if (!query) {
                        return true;
                    }

                    const spot =
                        report.spot_id
                            ? spots[
                            report
                                .spot_id
                            ]
                            : null;

                    return [
                        report.reason,
                        report.description,
                        spot?.name,
                        spot?.city,
                        spot?.neighborhood,
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
            reports,
            spots,
            filter,
            search,
        ]);

    async function updateReportStatus(
        report: Report,
        status:
            | "PENDING"
            | "RESOLVED"
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
                        "nt_reports"
                    )
                    .update({
                        status,
                    })
                    .eq(
                        "id",
                        report.id
                    );

            if (
                updateError
            ) {
                throw updateError;
            }

            setReports(
                (
                    current
                ) =>
                    current.map(
                        (
                            item
                        ) =>
                            item.id ===
                                report.id
                                ? {
                                    ...item,
                                    status,
                                }
                                : item
                    )
            );

            setSelectedReport(
                null
            );

            setToast(
                status ===
                    "RESOLVED"
                    ? "Report marked as resolved."
                    : status ===
                        "REJECTED"
                        ? "Report dismissed."
                        : "Report moved back to pending."
            );
        } catch (err) {
            console.error(
                "Report status error:",
                err
            );

            setToast(
                "We couldn't update this report."
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
                            <Flag
                                size={
                                    14
                                }
                            />
                            COMMUNITY SAFETY
                        </div>

                        <h1>
                            Reports
                        </h1>

                        <p>
                            Review issues reported
                            about places and
                            information.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="nt-admin-refresh"
                        onClick={() =>
                            void loadReports(
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
                                void loadReports()
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
                        label="Open"
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
                        label="Resolved"
                        value={
                            counts.resolved
                        }
                        active={
                            filter ===
                            "RESOLVED"
                        }
                        onClick={() =>
                            setFilter(
                                "RESOLVED"
                            )
                        }
                    />

                    <MiniStat
                        label="Dismissed"
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

                <section className="nt-admin-toolbar nt-admin-reports-toolbar">
                    <div className="nt-admin-toolbar-copy">
                        <span>REPORT QUEUE</span>
                        <strong>
                            {counts.pending > 0
                                ? `${counts.pending} report${counts.pending === 1 ? "" : "s"} need attention`
                                : "No reports need attention"}
                        </strong>
                    </div>

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
                            placeholder="Search reports or places..."
                            aria-label="Search reports"
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
                            : `${filteredReports.length} result${filteredReports.length ===
                                1
                                ? ""
                                : "s"
                            }`}
                    </span>
                </section>

                <section className="nt-admin-spots-panel">
                    {loading ? (
                        <ReportsSkeleton />
                    ) : filteredReports.length ===
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
                                    ? "No open reports"
                                    : "No reports found"}
                            </h2>

                            <p>
                                {filter ===
                                    "PENDING"
                                    ? "Everything looks good right now."
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
                                        Show open reports
                                    </button>
                                )}
                        </div>
                    ) : (
                        <div className="nt-admin-spots-list">
                            {filteredReports.map(
                                (
                                    report
                                ) => {
                                    const spot =
                                        report.spot_id
                                            ? spots[
                                            report
                                                .spot_id
                                            ]
                                            : null;

                                    return (
                                        <article
                                            className="nt-admin-spot-row"
                                            key={
                                                report.id
                                            }
                                        >
                                            <div className="nt-admin-spot-icon report">
                                                <Flag
                                                    size={
                                                        18
                                                    }
                                                />
                                            </div>

                                            <div className="nt-admin-spot-main">
                                                <div className="nt-admin-spot-title">
                                                    <h2>
                                                        {report.reason ||
                                                            "Reported issue"}
                                                    </h2>

                                                    <StatusBadge
                                                        status={
                                                            report.status
                                                        }
                                                    />
                                                </div>

                                                <p>
                                                    {spot
                                                        ? [
                                                            spot.name,
                                                            spot.city,
                                                            spot.neighborhood,
                                                        ]
                                                            .filter(
                                                                Boolean
                                                            )
                                                            .join(
                                                                " · "
                                                            )
                                                        : report.description ||
                                                        "No place information available"}
                                                </p>

                                                <span className="nt-admin-report-context">
                                                    {spot
                                                        ? "Reported place"
                                                        : "General report"}
                                                </span>

                                                <div className="nt-admin-spot-meta">
                                                    <span>
                                                        <Clock3
                                                            size={
                                                                12
                                                            }
                                                        />

                                                        {formatDate(
                                                            report.created_at
                                                        )}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="nt-admin-spot-actions">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedReport(
                                                            report
                                                        )
                                                    }
                                                    title="Review report"
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

                                                {spot?.slug && (
                                                    <Link
                                                        href={`/spots/${spot.slug}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        title="View reported spot"
                                                    >
                                                        <Eye
                                                            size={
                                                                15
                                                            }
                                                        />
                                                    </Link>
                                                )}
                                            </div>
                                        </article>
                                    );
                                }
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
                        Community reports
                    </span>
                </footer>
            </div>

            {selectedReport && (
                <ReportModal
                    report={
                        selectedReport
                    }
                    spot={
                        selectedReport.spot_id
                            ? spots[
                            selectedReport
                                .spot_id
                            ]
                            : null
                    }
                    loading={
                        actionLoading
                    }
                    close={() =>
                        setSelectedReport(
                            null
                        )
                    }
                    updateStatus={
                        updateReportStatus
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
        normalizeStatus(
            status
        );

    const label =
        normalized ===
            "PENDING"
            ? "Open"
            : normalized ===
                "RESOLVED"
                ? "Resolved"
                : normalized ===
                    "REJECTED"
                    ? "Dismissed"
                    : "Unknown";

    return (
        <span
            className={`nt-admin-status ${normalized.toLowerCase()}`}
        >
            {label}
        </span>
    );
}

function ReportModal({
    report,
    spot,
    loading,
    close,
    updateStatus,
}: {
    report: Report;
    spot: Spot | null;
    loading: boolean;
    close: () => void;
    updateStatus: (
        report: Report,
        status:
            | "PENDING"
            | "RESOLVED"
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
                            REPORT REVIEW
                        </span>

                        <h2>
                            {report.reason ||
                                "Reported issue"}
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
                    {spot && (
                        <div className="nt-admin-reported-place">
                            <div>
                                <Store
                                    size={
                                        17
                                    }
                                />
                            </div>

                            <section>
                                <span>
                                    REPORTED PLACE
                                </span>

                                <strong>
                                    {
                                        spot.name
                                    }
                                </strong>

                                <p>
                                    {[
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
                                </p>
                            </section>
                        </div>
                    )}

                    <div className="nt-admin-description">
                        <span>
                            REPORT DETAILS
                        </span>

                        <p>
                            {report.description ||
                                "No additional details were provided."}
                        </p>
                    </div>

                    <div className="nt-admin-modal-details">
                        <Detail
                            label="Reason"
                            value={
                                report.reason ||
                                "—"
                            }
                        />

                        <Detail
                            label="Submitted"
                            value={formatDate(
                                report.created_at
                            )}
                        />

                        <Detail
                            label="Status"
                            value={
                                getStatusLabel(
                                    report.status
                                )
                            }
                        />

                        <Detail
                            label="Report ID"
                            value={
                                report.id
                            }
                        />

                        <Detail
                            label="Last updated"
                            value={formatDate(
                                report.updated_at
                            )}
                        />
                    </div>

                    <div className="nt-admin-report-decision">
                        <div>
                            <span>DECISION</span>
                            <strong>
                                Choose what should happen to this report.
                            </strong>
                        </div>
                        <StatusBadge
                            status={report.status}
                        />
                    </div>

                    <div className="nt-admin-modal-actions">
                        <button
                            type="button"
                            disabled={
                                loading ||
                                normalizeStatus(
                                    report.status
                                ) ===
                                "RESOLVED"
                            }
                            onClick={() =>
                                void updateStatus(
                                    report,
                                    "RESOLVED"
                                )
                            }
                        >
                            <CheckCircle2
                                size={
                                    16
                                }
                            />

                            Resolve
                        </button>

                        <button
                            type="button"
                            disabled={
                                loading ||
                                normalizeStatus(
                                    report.status
                                ) ===
                                "PENDING"
                            }
                            onClick={() =>
                                void updateStatus(
                                    report,
                                    "PENDING"
                                )
                            }
                        >
                            <Clock3
                                size={
                                    16
                                }
                            />

                            Keep open
                        </button>

                        <button
                            type="button"
                            className="danger"
                            disabled={
                                loading ||
                                normalizeStatus(
                                    report.status
                                ) ===
                                "REJECTED"
                            }
                            onClick={() =>
                                void updateStatus(
                                    report,
                                    "REJECTED"
                                )
                            }
                        >
                            <X
                                size={
                                    16
                                }
                            />

                            Dismiss
                        </button>
                    </div>

                    {spot?.slug && (
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

                            View reported place

                            <ArrowRight
                                size={
                                    15
                                }
                            />
                        </Link>
                    )}

                    <button
                        type="button"
                        className="nt-admin-modal-close-action"
                        onClick={close}
                        disabled={loading}
                    >
                        Close review
                    </button>
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

function ReportsSkeleton() {
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

function normalizeStatus(
    status: string | null
) {
    const value =
        (
            status ??
            "UNKNOWN"
        )
            .trim()
            .toUpperCase();

    if (
        value ===
        "OPEN"
    ) {
        return "PENDING";
    }

    if (
        value ===
        "CLOSED"
    ) {
        return "RESOLVED";
    }

    return value;
}

function getStatusLabel(
    status: string | null
) {
    const normalized =
        normalizeStatus(
            status
        );

    if (
        normalized ===
        "PENDING"
    ) {
        return "Open";
    }

    if (
        normalized ===
        "RESOLVED"
    ) {
        return "Resolved";
    }

    if (
        normalized ===
        "REJECTED"
    ) {
        return "Dismissed";
    }

    return "Unknown";
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