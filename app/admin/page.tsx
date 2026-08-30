"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Activity,
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Clock3,
    Eye,
    Flag,
    MapPin,
    RefreshCw,
    ShieldCheck,
    Star,
    Store,
    Users,
} from "lucide-react";

import Link from "next/link";

import {
    getSupabaseBrowserClient,
} from "../../lib/supabase/client";

type DashboardStats = {
    spots: number;
    pendingSpots: number;
    submissions: number;
    pendingSubmissions: number;
    reports: number;
    pendingReports: number;
    visitors: number;
    reviews: number;
};

type RecentSubmission = {
    id: string;
    name: string;
    city: string | null;
    category: string | null;
    status: string | null;
    created_at: string | null;
};

type RecentReport = {
    id: string;
    reason: string | null;
    status: string | null;
    created_at: string | null;
};

const EMPTY_STATS: DashboardStats = {
    spots: 0,
    pendingSpots: 0,
    submissions: 0,
    pendingSubmissions: 0,
    reports: 0,
    pendingReports: 0,
    visitors: 0,
    reviews: 0,
};

export default function AdminPage() {
    const supabase = useMemo(
        () =>
            getSupabaseBrowserClient() as any,
        []
    );

    const [stats, setStats] =
        useState<DashboardStats>(
            EMPTY_STATS
        );

    const [
        recentSubmissions,
        setRecentSubmissions,
    ] = useState<RecentSubmission[]>(
        []
    );

    const [
        recentReports,
        setRecentReports,
    ] = useState<RecentReport[]>(
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

    const loadDashboard =
        useCallback(
            async (
                isRefresh = false
            ) => {
                if (isRefresh) {
                    setRefreshing(
                        true
                    );
                } else {
                    setLoading(true);
                }

                setError(null);

                try {
                    const [
                        spotsResult,
                        pendingSpotsResult,
                        submissionsResult,
                        pendingSubmissionsResult,
                        reportsResult,
                        pendingReportsResult,
                        visitorsResult,
                        reviewsResult,
                        recentSubmissionsResult,
                        recentReportsResult,
                    ] =
                        await Promise.all([
                            supabase
                                .from(
                                    "nt_spots"
                                )
                                .select(
                                    "id",
                                    {
                                        count: "exact",
                                        head: true,
                                    }
                                )
                                .eq(
                                    "status",
                                    "APPROVED"
                                ),

                            supabase
                                .from(
                                    "nt_spots"
                                )
                                .select(
                                    "id",
                                    {
                                        count: "exact",
                                        head: true,
                                    }
                                )
                                .eq(
                                    "status",
                                    "PENDING"
                                ),

                            supabase
                                .from(
                                    "nt_spot_submissions"
                                )
                                .select(
                                    "id",
                                    {
                                        count: "exact",
                                        head: true,
                                    }
                                ),

                            supabase
                                .from(
                                    "nt_spot_submissions"
                                )
                                .select(
                                    "id",
                                    {
                                        count: "exact",
                                        head: true,
                                    }
                                )
                                .eq(
                                    "status",
                                    "PENDING"
                                ),

                            supabase
                                .from(
                                    "nt_reports"
                                )
                                .select(
                                    "id",
                                    {
                                        count: "exact",
                                        head: true,
                                    }
                                ),

                            supabase
                                .from(
                                    "nt_reports"
                                )
                                .select(
                                    "id",
                                    {
                                        count: "exact",
                                        head: true,
                                    }
                                )
                                .eq(
                                    "status",
                                    "PENDING"
                                ),

                            supabase
                                .from(
                                    "nt_visitors"
                                )
                                .select(
                                    "id",
                                    {
                                        count: "exact",
                                        head: true,
                                    }
                                ),

                            supabase
                                .from(
                                    "nt_reviews"
                                )
                                .select(
                                    "id",
                                    {
                                        count: "exact",
                                        head: true,
                                    }
                                ),

                            supabase
                                .from(
                                    "nt_spot_submissions"
                                )
                                .select(
                                    "id,name,city,category,status,created_at"
                                )
                                .order(
                                    "created_at",
                                    {
                                        ascending:
                                            false,
                                    }
                                )
                                .limit(6),

                            supabase
                                .from(
                                    "nt_reports"
                                )
                                .select(
                                    "id,reason,status,created_at"
                                )
                                .order(
                                    "created_at",
                                    {
                                        ascending:
                                            false,
                                    }
                                )
                                .limit(5),
                        ]);

                    const firstError =
                        [
                            spotsResult,
                            pendingSpotsResult,
                            submissionsResult,
                            pendingSubmissionsResult,
                            reportsResult,
                            pendingReportsResult,
                            visitorsResult,
                            reviewsResult,
                            recentSubmissionsResult,
                            recentReportsResult,
                        ].find(
                            (
                                result
                            ) =>
                                result?.error
                        );

                    if (firstError?.error) {
                        throw firstError.error;
                    }

                    setStats({
                        spots:
                            spotsResult.count ??
                            0,
                        pendingSpots:
                            pendingSpotsResult.count ??
                            0,
                        submissions:
                            submissionsResult.count ??
                            0,
                        pendingSubmissions:
                            pendingSubmissionsResult.count ??
                            0,
                        reports:
                            reportsResult.count ??
                            0,
                        pendingReports:
                            pendingReportsResult.count ??
                            0,
                        visitors:
                            visitorsResult.count ??
                            0,
                        reviews:
                            reviewsResult.count ??
                            0,
                    });

                    setRecentSubmissions(
                        (recentSubmissionsResult.data ??
                            []) as RecentSubmission[]
                    );

                    setRecentReports(
                        (recentReportsResult.data ??
                            []) as RecentReport[]
                    );
                } catch (err) {
                    console.error(
                        "Admin dashboard error:",
                        err
                    );

                    setError(
                        "We couldn't load the admin dashboard."
                    );
                } finally {
                    setLoading(false);
                    setRefreshing(false);
                }
            },
            [supabase]
        );

    useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    const pendingTotal =
        stats.pendingSubmissions +
        stats.pendingReports +
        stats.pendingSpots;

    return (
        <main className="nt-admin-page">
            <div className="nt-admin-container">
                <header className="nt-admin-header">
                    <div>
                        <div className="nt-admin-eyebrow">
                            <ShieldCheck
                                size={14}
                            />
                            NICE THINGS
                            ADMIN
                        </div>

                        <h1>
                            Good evening.
                        </h1>

                        <p>
                            Keep the NiceThings
                            experience accurate,
                            useful and beautiful.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="nt-admin-refresh"
                        onClick={() =>
                            void loadDashboard(
                                true
                            )
                        }
                        disabled={
                            refreshing
                        }
                    >
                        <RefreshCw
                            size={15}
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
                            size={17}
                        />

                        <span>
                            {error}
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                void loadDashboard()
                            }
                        >
                            Try again
                        </button>
                    </div>
                )}

                <section className="nt-admin-overview">
                    <AdminStat
                        icon={
                            <Store
                                size={19}
                            />
                        }
                        label="Published spots"
                        value={
                            stats.spots
                        }
                        loading={
                            loading
                        }
                        href="/admin/spots"
                    />

                    <AdminStat
                        icon={
                            <Clock3
                                size={19}
                            />
                        }
                        label="Pending submissions"
                        value={
                            stats.pendingSubmissions
                        }
                        loading={
                            loading
                        }
                        href="/admin/submissions"
                        alert={
                            stats.pendingSubmissions >
                            0
                        }
                    />

                    <AdminStat
                        icon={
                            <Flag
                                size={19}
                            />
                        }
                        label="Open reports"
                        value={
                            stats.pendingReports
                        }
                        loading={
                            loading
                        }
                        href="/admin/reports"
                        alert={
                            stats.pendingReports >
                            0
                        }
                    />

                    <AdminStat
                        icon={
                            <Users
                                size={19}
                            />
                        }
                        label="Visitors"
                        value={
                            stats.visitors
                        }
                        loading={
                            loading
                        }
                        href="/admin"
                    />
                </section>

                <section className="nt-admin-priority">
                    <div>
                        <div className="nt-admin-priority-icon">
                            {pendingTotal >
                                0 ? (
                                <Activity
                                    size={
                                        20
                                    }
                                />
                            ) : (
                                <CheckCircle2
                                    size={
                                        20
                                    }
                                />
                            )}
                        </div>

                        <div>
                            <span>
                                ADMIN QUEUE
                            </span>

                            <h2>
                                {loading
                                    ? "Checking activity..."
                                    : pendingTotal >
                                        0
                                        ? `${pendingTotal} item${pendingTotal ===
                                            1
                                            ? ""
                                            : "s"
                                        } need attention`
                                        : "Everything is under control"}
                            </h2>
                        </div>
                    </div>

                    <div className="nt-admin-priority-actions">
                        {stats.pendingSubmissions >
                            0 && (
                                <Link href="/admin/submissions">
                                    Review submissions
                                    <ArrowRight
                                        size={
                                            14
                                        }
                                    />
                                </Link>
                            )}

                        {stats.pendingReports >
                            0 && (
                                <Link href="/admin/reports">
                                    Review reports
                                    <ArrowRight
                                        size={
                                            14
                                        }
                                    />
                                </Link>
                            )}

                        {pendingTotal ===
                            0 &&
                            !loading && (
                                <span className="nt-admin-all-clear">
                                    <CheckCircle2
                                        size={
                                            15
                                        }
                                    />
                                    All clear
                                </span>
                            )}
                    </div>
                </section>

                <section className="nt-admin-grid">
                    <div className="nt-admin-panel">
                        <div className="nt-admin-panel-header">
                            <div>
                                <span>
                                    SUBMISSIONS
                                </span>

                                <h2>
                                    Recent places
                                </h2>
                            </div>

                            <Link href="/admin/submissions">
                                View all
                                <ArrowRight
                                    size={
                                        14
                                    }
                                />
                            </Link>
                        </div>

                        {loading ? (
                            <SubmissionSkeleton />
                        ) : recentSubmissions.length ===
                            0 ? (
                            <EmptyAdminState
                                icon={
                                    <Store
                                        size={
                                            18
                                        }
                                    />
                                }
                                title="No submissions yet"
                                text="New place submissions will appear here."
                            />
                        ) : (
                            <div className="nt-admin-list">
                                {recentSubmissions.map(
                                    (
                                        submission
                                    ) => (
                                        <div
                                            className="nt-admin-list-row"
                                            key={
                                                submission.id
                                            }
                                        >
                                            <div className="nt-admin-list-icon">
                                                <MapPin
                                                    size={
                                                        16
                                                    }
                                                />
                                            </div>

                                            <div className="nt-admin-list-copy">
                                                <strong>
                                                    {
                                                        submission.name
                                                    }
                                                </strong>

                                                <span>
                                                    {[
                                                        submission.category,
                                                        submission.city,
                                                    ]
                                                        .filter(
                                                            Boolean
                                                        )
                                                        .join(
                                                            " · "
                                                        ) ||
                                                        "Details not provided"}
                                                </span>
                                            </div>

                                            <StatusBadge
                                                status={
                                                    submission.status
                                                }
                                            />
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>

                    <div className="nt-admin-panel">
                        <div className="nt-admin-panel-header">
                            <div>
                                <span>
                                    REPORTS
                                </span>

                                <h2>
                                    Recent activity
                                </h2>
                            </div>

                            <Link href="/admin/reports">
                                View all
                                <ArrowRight
                                    size={
                                        14
                                    }
                                />
                            </Link>
                        </div>

                        {loading ? (
                            <ReportSkeleton />
                        ) : recentReports.length ===
                            0 ? (
                            <EmptyAdminState
                                icon={
                                    <CheckCircle2
                                        size={
                                            18
                                        }
                                    />
                                }
                                title="No reports"
                                text="There are currently no reported issues."
                            />
                        ) : (
                            <div className="nt-admin-list">
                                {recentReports.map(
                                    (
                                        report
                                    ) => (
                                        <div
                                            className="nt-admin-list-row"
                                            key={
                                                report.id
                                            }
                                        >
                                            <div className="nt-admin-list-icon report">
                                                <Flag
                                                    size={
                                                        16
                                                    }
                                                />
                                            </div>

                                            <div className="nt-admin-list-copy">
                                                <strong>
                                                    {report.reason ||
                                                        "Reported issue"}
                                                </strong>

                                                <span>
                                                    {formatDate(
                                                        report.created_at
                                                    )}
                                                </span>
                                            </div>

                                            <StatusBadge
                                                status={
                                                    report.status
                                                }
                                            />
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </section>

                <section className="nt-admin-tools">
                    <div className="nt-admin-tools-heading">
                        <span>
                            QUICK ACCESS
                        </span>

                        <h2>
                            Manage NiceThings
                        </h2>
                    </div>

                    <div className="nt-admin-tool-grid">
                        <AdminTool
                            href="/admin/spots"
                            icon={
                                <Store
                                    size={19}
                                />
                            }
                            title="Spots"
                            text={`${stats.spots} published places`}
                        />

                        <AdminTool
                            href="/admin/submissions"
                            icon={
                                <Clock3
                                    size={19}
                                />
                            }
                            title="Submissions"
                            text={`${stats.pendingSubmissions} awaiting review`}
                            accent={
                                stats.pendingSubmissions >
                                0
                            }
                        />

                        <AdminTool
                            href="/admin/reports"
                            icon={
                                <Flag
                                    size={19}
                                />
                            }
                            title="Reports"
                            text={`${stats.pendingReports} open reports`}
                            accent={
                                stats.pendingReports >
                                0
                            }
                        />

                        <AdminTool
                            href="/"
                            icon={
                                <Eye
                                    size={19}
                                />
                            }
                            title="View site"
                            text="See the public experience"
                        />
                    </div>
                </section>

                <footer className="nt-admin-footer">
                    <div>
                        <ShieldCheck
                            size={14}
                        />

                        NiceThings Admin
                    </div>

                    <span>
                        {stats.reviews} reviews
                        · {stats.submissions} total
                        submissions
                    </span>
                </footer>
            </div>
        </main>
    );
}

function AdminStat({
    icon,
    label,
    value,
    loading,
    href,
    alert = false,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    loading: boolean;
    href: string;
    alert?: boolean;
}) {
    return (
        <Link
            href={href}
            className={
                alert
                    ? "nt-admin-stat alert"
                    : "nt-admin-stat"
            }
        >
            <div className="nt-admin-stat-top">
                <span className="nt-admin-stat-icon">
                    {icon}
                </span>

                {alert && (
                    <span className="nt-admin-stat-dot" />
                )}
            </div>

            <div className="nt-admin-stat-value">
                {loading ? (
                    <span className="nt-admin-number-skeleton" />
                ) : (
                    value.toLocaleString(
                        "en-US"
                    )
                )}
            </div>

            <div className="nt-admin-stat-label">
                {label}
            </div>
        </Link>
    );
}

function AdminTool({
    href,
    icon,
    title,
    text,
    accent = false,
}: {
    href: string;
    icon: React.ReactNode;
    title: string;
    text: string;
    accent?: boolean;
}) {
    return (
        <Link
            href={href}
            className={
                accent
                    ? "nt-admin-tool accent"
                    : "nt-admin-tool"
            }
        >
            <span className="nt-admin-tool-icon">
                {icon}
            </span>

            <div>
                <strong>
                    {title}
                </strong>

                <span>
                    {text}
                </span>
            </div>

            <ArrowRight
                size={16}
            />
        </Link>
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
                    : normalized
                        .charAt(0)
                        .toUpperCase() +
                    normalized
                        .slice(1)
                        .toLowerCase();

    return (
        <span
            className={`nt-admin-status ${normalized.toLowerCase()}`}
        >
            {label}
        </span>
    );
}

function EmptyAdminState({
    icon,
    title,
    text,
}: {
    icon: React.ReactNode;
    title: string;
    text: string;
}) {
    return (
        <div className="nt-admin-empty">
            <div>
                {icon}
            </div>

            <strong>
                {title}
            </strong>

            <span>
                {text}
            </span>
        </div>
    );
}

function SubmissionSkeleton() {
    return (
        <div className="nt-admin-list">
            {Array.from({
                length: 4,
            }).map(
                (
                    _,
                    index
                ) => (
                    <div
                        className="nt-admin-list-row nt-admin-skeleton-row"
                        key={
                            index
                        }
                    >
                        <span />
                        <div>
                            <span />
                            <span />
                        </div>
                        <i />
                    </div>
                )
            )}
        </div>
    );
}

function ReportSkeleton() {
    return (
        <div className="nt-admin-list">
            {Array.from({
                length: 4,
            }).map(
                (
                    _,
                    index
                ) => (
                    <div
                        className="nt-admin-list-row nt-admin-skeleton-row"
                        key={
                            index
                        }
                    >
                        <span />
                        <div>
                            <span />
                            <span />
                        </div>
                        <i />
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
        }
    ).format(date);
}