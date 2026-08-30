"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    AnimatePresence,
    motion,
} from "framer-motion";

import {
    ArrowRight,
    Check,
    Heart,
    MapPin,
    Search,
    Star,
    Trash2,
} from "lucide-react";

import Link from "next/link";

import {
    getSupabaseBrowserClient,
} from "../../lib/supabase/client";

type Spot = {
    id: string;
    name: string;
    slug?: string | null;
    description?: string | null;
    category?: string | null;
    city?: string | null;
    neighborhood?: string | null;
    rating?: number | null;
    review_count?: number | null;
    verified?: boolean | null;
    featured?: boolean | null;
    minimum_price?: number | null;
    maximum_price?: number | null;
    average_price?: number | null;
    currency?: string | null;
};

type SavedRow = {
    id: string;
    spot_id: string;
};

type Photo = {
    spot_id: string;
    image_url: string;
    alt_text?: string | null;
    sort_order?: number | null;
};

type SavedSpot = Spot & {
    savedId: string;
    coverImage: string | null;
};

export default function SavedPage() {
   const supabase = useMemo(
    () => getSupabaseBrowserClient() as any,
    []
);

    const [
        spots,
        setSpots,
    ] = useState<SavedSpot[]>([]);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        error,
        setError,
    ] = useState<string | null>(
        null
    );

    const [
        search,
        setSearch,
    ] = useState("");

    const [
        removing,
        setRemoving,
    ] = useState<Set<string>>(
        new Set()
    );

    useEffect(() => {
        void loadSavedSpots();
    }, []);

    async function loadSavedSpots() {
        setLoading(true);
        setError(null);

        try {
            const visitorId =
                window.localStorage.getItem(
                    "nt_visitor_id"
                );

            if (!visitorId) {
                setSpots([]);
                return;
            }

            const {
                data: savedData,
                error: savedError,
            } = await supabase
                .from(
                    "nt_saved_spots"
                )
                .select(
                    "id,spot_id"
                )
                .eq(
                    "visitor_id",
                    visitorId
                );

            if (savedError) {
                throw savedError;
            }

            const savedRows =
                (savedData ??
                    []) as unknown as SavedRow[];

            if (
                savedRows.length ===
                0
            ) {
                setSpots([]);
                return;
            }

            const spotIds =
                savedRows.map(
                    (
                        row
                    ) =>
                        row.spot_id
                );

            const {
                data: spotData,
                error: spotError,
            } = await supabase
                .from("nt_spots")
                .select("*")
                .in(
                    "id",
                    spotIds
                )
                .eq(
                    "status",
                    "APPROVED"
                );

            if (spotError) {
                throw spotError;
            }

            const rows =
                (spotData ??
                    []) as unknown as Spot[];

            const {
                data: photoData,
            } = await supabase
                .from(
                    "nt_spot_photos"
                )
                .select(
                    "spot_id,image_url,alt_text,sort_order"
                )
                .in(
                    "spot_id",
                    spotIds
                )
                .order(
                    "sort_order",
                    {
                        ascending:
                            true,
                    }
                );

            const photos =
                (photoData ??
                    []) as unknown as Photo[];

            const photoMap =
                new Map<
                    string,
                    string
                >();

            for (
                const photo of
                    photos
            ) {
                if (
                    !photoMap.has(
                        photo.spot_id
                    )
                ) {
                    photoMap.set(
                        photo.spot_id,
                        photo.image_url
                    );
                }
            }

            const savedMap =
                new Map<
                    string,
                    string
                >();

            for (
                const row of
                    savedRows
            ) {
                savedMap.set(
                    row.spot_id,
                    row.id
                );
            }

            const combined =
                rows
                    .map(
                        (
                            spot
                        ) => ({
                            ...spot,
                            savedId:
                                savedMap.get(
                                    spot.id
                                ) ??
                                "",
                            coverImage:
                                photoMap.get(
                                    spot.id
                                ) ??
                                null,
                        })
                    )
                    .filter(
                        (
                            spot
                        ) =>
                            Boolean(
                                spot.savedId
                            )
                    );

            setSpots(
                combined
            );
        } catch (err) {
            console.error(
                "Saved page error:",
                err
            );

            setError(
                "We couldn't load your saved places."
            );
        } finally {
            setLoading(false);
        }
    }

    async function removeSaved(
        spot: SavedSpot
    ) {
        if (
            removing.has(
                spot.id
            )
        ) {
            return;
        }

        const visitorId =
            window.localStorage.getItem(
                "nt_visitor_id"
            );

        if (!visitorId) {
            return;
        }

        setRemoving(
            (
                current
            ) => {
                const next =
                    new Set(
                        current
                    );

                next.add(
                    spot.id
                );

                return next;
            }
        );

        try {
            const {
                error:
                    deleteError,
            } = await supabase
                .from(
                    "nt_saved_spots"
                )
                .delete()
                .eq(
                    "visitor_id",
                    visitorId
                )
                .eq(
                    "spot_id",
                    spot.id
                );

            if (
                deleteError
            ) {
                throw deleteError;
            }

            setSpots(
                (
                    current
                ) =>
                    current.filter(
                        (
                            item
                        ) =>
                            item.id !==
                            spot.id
                    )
            );
        } catch (err) {
            console.error(
                "Remove saved error:",
                err
            );

            setError(
                "We couldn't remove that place."
            );
        } finally {
            setRemoving(
                (
                    current
                ) => {
                    const next =
                        new Set(
                            current
                        );

                    next.delete(
                        spot.id
                    );

                    return next;
                }
            );
        }
    }

    const filteredSpots =
        useMemo(() => {
            const value =
                search
                    .trim()
                    .toLowerCase();

            if (!value) {
                return spots;
            }

            return spots.filter(
                (
                    spot
                ) =>
                    [
                        spot.name,
                        spot.category,
                        spot.city,
                        spot.neighborhood,
                    ]
                        .filter(
                            Boolean
                        )
                        .some(
                            (
                                item
                            ) =>
                                String(
                                    item
                                )
                                    .toLowerCase()
                                    .includes(
                                        value
                                    )
                        )
            );
        }, [
            spots,
            search,
        ]);

    return (
        <main className="nt-saved-page">
            <div className="nt-saved-container">
                <section className="nt-saved-hero">
                    <div>
                        <span className="nt-saved-eyebrow">
                            YOUR COLLECTION
                        </span>

                        <h1>
                            Places you
                            <br />
                            <em>
                                want to remember.
                            </em>
                        </h1>

                        <p>
                            Keep the places
                            that caught your
                            eye close at hand.
                        </p>
                    </div>

                    <div className="nt-saved-heart-mark">
                        <Heart
                            size={27}
                            fill="currentColor"
                        />
                    </div>
                </section>

                {!loading &&
                    spots.length >
                        0 && (
                        <section className="nt-saved-toolbar">
                            <div className="nt-saved-count">
                                <strong>
                                    {
                                        spots.length
                                    }
                                </strong>

                                <span>
                                    {spots.length ===
                                    1
                                        ? "saved place"
                                        : "saved places"}
                                </span>
                            </div>

                            <div className="nt-saved-search">
                                <Search
                                    size={
                                        16
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
                                    placeholder="Search your collection..."
                                    aria-label="Search saved places"
                                />
                            </div>
                        </section>
                    )}

                {error && (
                    <div className="nt-saved-error">
                        <span>
                            {error}
                        </span>

                        <button
                            type="button"
                            onClick={
                                loadSavedSpots
                            }
                        >
                            Try again
                        </button>
                    </div>
                )}

                {loading ? (
                    <SavedSkeleton />
                ) : spots.length ===
                  0 ? (
                    <EmptySaved />
                ) : filteredSpots.length ===
                  0 ? (
                    <NoSavedResults
                        clear={() =>
                            setSearch(
                                ""
                            )
                        }
                    />
                ) : (
                    <motion.div
                        className="nt-saved-grid"
                        layout
                    >
                        <AnimatePresence
                            mode="popLayout"
                        >
                            {filteredSpots.map(
                                (
                                    spot,
                                    index
                                ) => (
                                    <SavedCard
                                        key={
                                            spot.id
                                        }
                                        spot={
                                            spot
                                        }
                                        index={
                                            index
                                        }
                                        removing={removing.has(
                                            spot.id
                                        )}
                                        remove={
                                            removeSaved
                                        }
                                    />
                                )
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </main>
    );
}

function SavedCard({
    spot,
    index,
    removing,
    remove,
}: {
    spot: SavedSpot;
    index: number;
    removing: boolean;
    remove: (
        spot: SavedSpot
    ) => void;
}) {
    const href =
        `/spots/${encodeURIComponent(
            spot.slug ??
                spot.id
        )}`;

    return (
        <motion.article
            className="nt-saved-card"
            layout
            initial={{
                opacity: 0,
                y: 18,
            }}
            animate={{
                opacity: 1,
                y: 0,
            }}
            exit={{
                opacity: 0,
                scale: 0.96,
                y: 10,
            }}
            transition={{
                duration: 0.3,
                delay:
                    Math.min(
                        index *
                            0.04,
                        0.25
                    ),
            }}
        >
            <div className="nt-saved-card-image">
                <Link
                    href={
                        href
                    }
                >
                    {spot.coverImage ? (
                        <img
                            src={
                                spot.coverImage
                            }
                            alt={
                                spot.name
                            }
                            loading={
                                index <
                                4
                                    ? "eager"
                                    : "lazy"
                            }
                        />
                    ) : (
                        <div className="nt-saved-placeholder">
                            <MapPin
                                size={
                                    25
                                }
                            />
                        </div>
                    )}

                    <div className="nt-saved-image-overlay" />
                </Link>

                <button
                    type="button"
                    className="nt-saved-remove"
                    onClick={() =>
                        remove(
                            spot
                        )
                    }
                    disabled={
                        removing
                    }
                    aria-label={`Remove ${spot.name} from saved places`}
                >
                    {removing ? (
                        <span className="nt-mini-spinner" />
                    ) : (
                        <Heart
                            size={
                                17
                            }
                            fill="currentColor"
                        />
                    )}
                </button>

                {spot.featured && (
                    <span className="nt-saved-featured">
                        Featured
                    </span>
                )}
            </div>

            <Link
                href={
                    href
                }
                className="nt-saved-card-content"
            >
                <div className="nt-saved-label-row">
                    <span>
                        {formatCategory(
                            spot.category
                        )}
                    </span>

                    {spot.verified && (
                        <span>
                            <Check
                                size={
                                    10
                                }
                            />
                            Verified
                        </span>
                    )}
                </div>

                <h2>
                    {
                        spot.name
                    }
                </h2>

                <div className="nt-saved-location">
                    <MapPin
                        size={
                            12
                        }
                    />

                    <span>
                        {[
                            spot.neighborhood,
                            spot.city,
                        ]
                            .filter(
                                Boolean
                            )
                            .join(
                                ", "
                            )}
                    </span>
                </div>

                <div className="nt-saved-card-bottom">
                    <span className="nt-saved-rating">
                        <Star
                            size={
                                13
                            }
                            fill="currentColor"
                        />

                        {Number(
                            spot.rating ??
                                0
                        ).toFixed(
                            1
                        )}

                        <small>
                            (
                            {
                                spot.review_count ??
                                0
                            }
                            )
                        </small>
                    </span>

                    <span className="nt-saved-price">
                        {formatPrice(
                            spot
                        )}
                    </span>
                </div>

                <div className="nt-saved-view">
                    View place
                    <ArrowRight
                        size={
                            14
                        }
                    />
                </div>
            </Link>
        </motion.article>
    );
}

function EmptySaved() {
    return (
        <motion.section
            className="nt-saved-empty"
            initial={{
                opacity: 0,
                y: 15,
            }}
            animate={{
                opacity: 1,
                y: 0,
            }}
        >
            <div className="nt-saved-empty-icon">
                <Heart
                    size={
                        24
                    }
                />
            </div>

            <span className="nt-saved-empty-eyebrow">
                NOTHING SAVED YET
            </span>

            <h2>
                Your collection
                starts here.
            </h2>

            <p>
                When a place catches your
                eye, save it. We'll keep
                your favourites together
                in one beautiful collection.
            </p>

            <Link
                href="/search"
                className="nt-saved-primary"
            >
                Discover places
                <ArrowRight
                    size={
                        15
                    }
                />
            </Link>
        </motion.section>
    );
}

function NoSavedResults({
    clear,
}: {
    clear: () => void;
}) {
    return (
        <section className="nt-saved-no-results">
            <div>
                <Search
                    size={
                        21
                    }
                />
            </div>

            <h2>
                Nothing matches
            </h2>

            <p>
                Try another search in
                your saved collection.
            </p>

            <button
                type="button"
                onClick={clear}
            >
                Clear search
            </button>
        </section>
    );
}

function SavedSkeleton() {
    return (
        <div className="nt-saved-grid">
            {Array.from({
                length: 6,
            }).map(
                (_, index) => (
                    <div
                        key={
                            index
                        }
                        className="nt-saved-skeleton"
                    >
                        <div className="nt-saved-skeleton-image" />

                        <div className="nt-saved-skeleton-lines">
                            <span />
                            <span />
                            <span />
                            <span />
                        </div>
                    </div>
                )
            )}
        </div>
    );
}

function formatCategory(
    value?: string | null
) {
    if (!value) {
        return "Place";
    }

    return value
        .replaceAll(
            "_",
            " "
        )
        .replace(
            /\b\w/g,
            (letter) =>
                letter.toUpperCase()
        );
}

function formatPrice(
    spot: Spot
) {
    const currency =
        spot.currency ??
        "XAF";

    if (
        spot.minimum_price !==
            null &&
        spot.minimum_price !==
            undefined &&
        spot.maximum_price !==
            null &&
        spot.maximum_price !==
            undefined
    ) {
        if (
            spot.minimum_price ===
            spot.maximum_price
        ) {
            return `${formatNumber(
                spot.minimum_price
            )} ${currency}`;
        }

        return `${formatNumber(
            spot.minimum_price
        )}–${formatNumber(
            spot.maximum_price
        )} ${currency}`;
    }

    if (
        spot.average_price !==
            null &&
        spot.average_price !==
            undefined
    ) {
        return `${formatNumber(
            spot.average_price
        )} ${currency}`;
    }

    return "Price varies";
}

function formatNumber(
    value: number
) {
    return new Intl.NumberFormat(
        "fr-FR"
    ).format(value);
}