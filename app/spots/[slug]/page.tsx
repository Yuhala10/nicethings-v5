"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    AnimatePresence,
    motion,
} from "framer-motion";

import {
    ArrowLeft,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock3,
    ExternalLink,
    Heart,
    MapPin,
    MessageCircle,
    Navigation,
    Phone,
    Star,
    Utensils,
    X,
} from "lucide-react";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
    getSupabaseBrowserClient,
} from "../../../lib/supabase/client";
import { resolveSpotLocation } from "../../../lib/location/resolver";


type Spot = {
    id: string;
    name: string;
    slug: string | null;
    description: string | null;
    category: string;
    cuisine: string | null;
    address: string | null;
    neighborhood: string | null;
    city: string;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    whatsapp: string | null;
    website: string | null;
    average_price: number | null;
    minimum_price: number | null;
    maximum_price: number | null;
    currency: string;
    opening_time: string | null;
    closing_time: string | null;
    monday_open: boolean;
    tuesday_open: boolean;
    wednesday_open: boolean;
    thursday_open: boolean;
    friday_open: boolean;
    saturday_open: boolean;
    sunday_open: boolean;
    rating: number;
    review_count: number;
    verified: boolean;
    featured: boolean;
    status: string;
};

type Photo = {
    id: string;
    spot_id: string;
    image_url: string;
    alt_text: string | null;
    sort_order: number;
};

type MenuItem = {
    id: string;
    spot_id: string;
    name: string;
    description: string | null;
    price: number;
    currency: string;
    popular: boolean;
    available: boolean;
};

type Review = {
    id: string;
    visitor_id: string;
    spot_id: string;
    arrival_id: string | null;
    rating: number;
    comment: string | null;
    price_accurate: boolean | null;
    location_accurate: boolean | null;
    created_at: string;
};

type DayKey =
    | "monday_open"
    | "tuesday_open"
    | "wednesday_open"
    | "thursday_open"
    | "friday_open"
    | "saturday_open"
    | "sunday_open";

const DAYS: Array<
    [string, DayKey]
> = [
        ["Monday", "monday_open"],
        ["Tuesday", "tuesday_open"],
        ["Wednesday", "wednesday_open"],
        ["Thursday", "thursday_open"],
        ["Friday", "friday_open"],
        ["Saturday", "saturday_open"],
        ["Sunday", "sunday_open"],
    ];

export default function SpotDetailsPage() {
    const params = useParams();

    const rawSlug = params?.slug;

    const slug = Array.isArray(rawSlug)
        ? rawSlug[0]
        : rawSlug;

    const supabase = useMemo(
        () => getSupabaseBrowserClient(),
        []
    );

    const [spot, setSpot] =
        useState<Spot | null>(null);

    const [photos, setPhotos] =
        useState<Photo[]>([]);

    const [menu, setMenu] =
        useState<MenuItem[]>([]);

    const [reviews, setReviews] =
        useState<Review[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);

    const [saved, setSaved] =
        useState(false);

    const [saveLoading, setSaveLoading] =
        useState(false);

    const [directionsLoading, setDirectionsLoading] =
        useState(false);

    const [activePhoto, setActivePhoto] =
        useState(0);

    const [showGallery, setShowGallery] =
        useState(false);

    const [showHours, setShowHours] =
        useState(false);

    const [showAllReviews, setShowAllReviews] =
        useState(false);

    const [toast, setToast] =
        useState<string | null>(null);

    const loadSpot = useCallback(
        async () => {
            if (!slug) {
                setError(
                    "This place could not be found."
                );

                setLoading(false);

                return;
            }

            setLoading(true);
            setError(null);

            try {
                const decodedSlug =
                    decodeURIComponent(
                        String(slug)
                    );

                const {
                    data: spotData,
                    error: spotError,
                } = await supabase
                    .from("nt_spots")
                    .select("*")
                    .eq(
                        "slug",
                        decodedSlug
                    )
                    .eq(
                        "status",
                        "APPROVED"
                    )
                    .maybeSingle();

                if (spotError) {
                    throw spotError;
                }

                if (!spotData) {
                    setSpot(null);

                    setError(
                        "This place doesn't exist or isn't available yet."
                    );

                    return;
                }

                const currentSpot =
                    spotData as unknown as Spot;

                setSpot(currentSpot);

                const [
                    photosResult,
                    menuResult,
                    reviewsResult,
                ] = await Promise.all([
                    supabase
                        .from(
                            "nt_spot_photos"
                        )
                        .select("*")
                        .eq(
                            "spot_id",
                            currentSpot.id
                        )
                        .order(
                            "sort_order",
                            {
                                ascending: true,
                            }
                        ),

                    supabase
                        .from(
                            "nt_spot_menu"
                        )
                        .select("*")
                        .eq(
                            "spot_id",
                            currentSpot.id
                        )
                        .eq(
                            "available",
                            true
                        )
                        .order(
                            "popular",
                            {
                                ascending: false,
                            }
                        ),

                    supabase
                        .from(
                            "nt_reviews"
                        )
                        .select("*")
                        .eq(
                            "spot_id",
                            currentSpot.id
                        )
                        .order(
                            "created_at",
                            {
                                ascending: false,
                            }
                        )
                        .limit(20),
                ]);

                if (photosResult.error) {
                    console.warn(
                        "Could not load photos:",
                        photosResult.error
                    );
                }

                if (menuResult.error) {
                    console.warn(
                        "Could not load menu:",
                        menuResult.error
                    );
                }

                if (reviewsResult.error) {
                    console.warn(
                        "Could not load reviews:",
                        reviewsResult.error
                    );
                }

                setPhotos(
                    (photosResult.data ??
                        []) as unknown as Photo[]
                );

                setMenu(
                    (menuResult.data ??
                        []) as unknown as MenuItem[]
                );

                setReviews(
                    (reviewsResult.data ??
                        []) as unknown as Review[]
                );
            } catch (err) {
                console.error(
                    "Spot details error:",
                    err
                );

                setError(
                    "We couldn't load this place right now."
                );
            } finally {
                setLoading(false);
            }
        },
        [slug, supabase]
    );

    useEffect(() => {
        void loadSpot();
    }, [loadSpot]);

    useEffect(() => {
        if (!spot) {
            return;
        }

        void checkSaved(spot.id);
    }, [spot]);

    useEffect(() => {
        if (!toast) {
            return;
        }

        const timer =
            window.setTimeout(() => {
                setToast(null);
            }, 3000);

        return () =>
            window.clearTimeout(timer);
    }, [toast]);

    async function checkSaved(
        spotId: string
    ) {
        try {
            const visitorId =
                window.localStorage.getItem(
                    "nt_visitor_id"
                );

            if (!visitorId) {
                return;
            }

            const {
                data,
                error: savedError,
            } = await supabase
                .from(
                    "nt_saved_spots"
                )
                .select("id")
                .eq(
                    "visitor_id",
                    visitorId
                )
                .eq(
                    "spot_id",
                    spotId
                )
                .maybeSingle();

            if (!savedError) {
                setSaved(Boolean(data));
            }
        } catch (err) {
            console.warn(
                "Saved state error:",
                err
            );
        }
    }

    async function toggleSave() {
        if (!spot || saveLoading) {
            return;
        }

        const visitorId =
            window.localStorage.getItem(
                "nt_visitor_id"
            );

        if (!visitorId) {
            setToast(
                "Your visitor session isn't ready yet."
            );

            return;
        }

        setSaveLoading(true);

        try {
            if (saved) {
                const {
                    error: deleteError,
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

                if (deleteError) {
                    throw deleteError;
                }

                setSaved(false);

                setToast(
                    "Removed from your saved places."
                );
            } else {
                const {
                    error: insertError,
                } = await supabase
                    .from(
                        "nt_saved_spots"
                    )
                    .insert({
                        visitor_id:
                            visitorId,
                        spot_id:
                            spot.id,
                    });

                if (insertError) {
                    throw insertError;
                }

                setSaved(true);

                setToast(
                    "Saved to your places."
                );
            }
        } catch (err) {
            console.error(
                "Save spot error:",
                err
            );

            setToast(
                "We couldn't update your saved places."
            );
        } finally {
            setSaveLoading(false);
        }
    }

    async function openDirections() {
        if (!spot) {
            return;
        }

        try {
            /*
             * The resolver first uses existing GPS.
             * If GPS is missing, it searches using:
             * name + neighborhood + address + city.
             */
            const location =
                await resolveSpotLocation(spot);

            if (!location) {
                setToast(
                    "We couldn't locate this place on the map yet. Please try again."
                );

                return;
            }

            const url =
                "https://www.google.com/maps/dir/?api=1" +
                `&destination=${encodeURIComponent(
                    `${location.latitude},${location.longitude}`
                )}`;

            window.open(
                url,
                "_blank",
                "noopener,noreferrer"
            );
        } catch (error) {
            console.error(
                "NiceThings place location error:",
                error
            );

            setToast(
                "We couldn't find this place on the map right now."
            );
        }
    }

    function openPhone() {
        if (!spot?.phone) {
            setToast(
                "This place hasn't provided a phone number."
            );

            return;
        }

        window.location.href =
            `tel:${spot.phone}`;
    }

    function openWhatsApp() {
        if (!spot?.whatsapp) {
            setToast(
                "WhatsApp isn't available for this place."
            );

            return;
        }

        const number =
            spot.whatsapp.replace(
                /[^\d+]/g,
                ""
            );

        window.open(
            `https://wa.me/${number.replace(
                "+",
                ""
            )}`,
            "_blank",
            "noopener,noreferrer"
        );
    }

    function openWebsite() {
        if (!spot?.website) {
            return;
        }

        window.open(
            spot.website,
            "_blank",
            "noopener,noreferrer"
        );
    }

    if (loading) {
        return <SpotLoading />;
    }

    if (!spot || error) {
        return (
            <main className="nt-spot-error-page">
                <div className="nt-page-container">
                    <Link
                        href="/search"
                        className="nt-back-link"
                    >
                        <ArrowLeft size={15} />
                        Back to discovery
                    </Link>

                    <div className="nt-spot-error-card">
                        <div className="nt-spot-error-icon">
                            <MapPin size={22} />
                        </div>

                        <h1>
                            Place not found
                        </h1>

                        <p>
                            {error ??
                                "This place is no longer available."}
                        </p>

                        <Link
                            href="/search"
                            className="nt-primary-action"
                        >
                            Discover other places
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const visibleReviews =
        showAllReviews
            ? reviews
            : reviews.slice(0, 5);

    return (
        <main className="nt-spot-page">
            <div className="nt-page-container">
                <div className="nt-spot-topbar">
                    <Link
                        href="/search"
                        className="nt-back-link"
                    >
                        <ArrowLeft size={15} />
                        Discovery
                    </Link>

                    <button
                        type="button"
                        className={[
                            "nt-save-button",
                            saved
                                ? "saved"
                                : "",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                        onClick={
                            toggleSave
                        }
                        disabled={
                            saveLoading
                        }
                    >
                        <Heart
                            size={16}
                            fill={
                                saved
                                    ? "currentColor"
                                    : "none"
                            }
                        />

                        <span>
                            {saved
                                ? "Saved"
                                : "Save"}
                        </span>
                    </button>
                </div>

                <SpotGallery
                    photos={photos}
                    spotName={spot.name}
                    activePhoto={
                        activePhoto
                    }
                    setActivePhoto={
                        setActivePhoto
                    }
                    openGallery={() =>
                        setShowGallery(
                            true
                        )
                    }
                />

                <section className="nt-spot-intro">
                    <div className="nt-spot-intro-main">
                        <div className="nt-spot-label-row">
                            <span className="nt-spot-category">
                                {formatCategory(
                                    spot.category
                                )}
                            </span>

                            {spot.verified && (
                                <span className="nt-verified-badge">
                                    <Check
                                        size={11}
                                    />
                                    Verified
                                </span>
                            )}

                            {spot.featured && (
                                <span className="nt-featured-badge">
                                    Featured
                                </span>
                            )}
                        </div>

                        <h1>
                            {spot.name}
                        </h1>

                        <div className="nt-spot-meta">
                            <span className="nt-rating">
                                <Star
                                    size={14}
                                    fill="currentColor"
                                />

                                {Number(
                                    spot.rating ??
                                    0
                                ).toFixed(1)}
                            </span>

                            <span>
                                {spot.review_count ??
                                    0}{" "}
                                {Number(
                                    spot.review_count ??
                                    0
                                ) === 1
                                    ? "review"
                                    : "reviews"}
                            </span>

                            {spot.cuisine && (
                                <>
                                    <i />
                                    <span>
                                        {
                                            spot.cuisine
                                        }
                                    </span>
                                </>
                            )}
                        </div>

                        <div className="nt-spot-location">
                            <MapPin size={15} />

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
                                    )}
                            </span>
                        </div>
                    </div>

                    <div className="nt-spot-quick-actions">
                        <button
                            type="button"
                            onClick={
                                openDirections
                            }
                            className="nt-find-place-button"
                            disabled={directionsLoading}
                        >
                            <Navigation
                                size={16}
                            />

                            <span>
                                {directionsLoading
                                    ? "Finding place…"
                                    : "Find this place"}
                            </span>

                            <ArrowLeft
                                size={14}
                                className="nt-action-arrow"
                            />
                        </button>

                        <div className="nt-contact-actions">
                            {spot.phone && (
                                <button
                                    type="button"
                                    onClick={
                                        openPhone
                                    }
                                    title="Call"
                                >
                                    <Phone
                                        size={16}
                                    />
                                </button>
                            )}

                            {spot.whatsapp && (
                                <button
                                    type="button"
                                    onClick={
                                        openWhatsApp
                                    }
                                    title="WhatsApp"
                                >
                                    <MessageCircle
                                        size={16}
                                    />
                                </button>
                            )}

                            {spot.website && (
                                <button
                                    type="button"
                                    onClick={
                                        openWebsite
                                    }
                                    title="Website"
                                >
                                    <ExternalLink
                                        size={16}
                                    />
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                <div className="nt-spot-divider" />

                <section className="nt-spot-grid">
                    <div className="nt-spot-main-column">
                        {spot.description && (
                            <section className="nt-spot-section">
                                <SectionTitle>
                                    About this place
                                </SectionTitle>

                                <p className="nt-spot-description">
                                    {
                                        spot.description
                                    }
                                </p>
                            </section>
                        )}

                        <section className="nt-spot-section">
                            <SectionTitle
                                icon={
                                    <Clock3
                                        size={17}
                                    />
                                }
                                action={
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowHours(
                                                !showHours
                                            )
                                        }
                                    >
                                        {showHours
                                            ? "Hide hours"
                                            : "View all hours"}
                                    </button>
                                }
                            >
                                Opening hours
                            </SectionTitle>

                            <div className="nt-hours-card">
                                <div className="nt-hours-today">
                                    <div>
                                        <strong>
                                            {
                                                getTodayName()
                                            }
                                        </strong>

                                        <span>
                                            {isOpenToday(
                                                spot
                                            )
                                                ? "Open today"
                                                : "Closed today"}
                                        </span>
                                    </div>

                                    <strong>
                                        {formatHours(
                                            spot
                                        )}
                                    </strong>
                                </div>

                                <AnimatePresence>
                                    {showHours && (
                                        <motion.div
                                            className="nt-hours-list"
                                            initial={{
                                                height: 0,
                                                opacity: 0,
                                            }}
                                            animate={{
                                                height: "auto",
                                                opacity: 1,
                                            }}
                                            exit={{
                                                height: 0,
                                                opacity: 0,
                                            }}
                                        >
                                            {DAYS.map(
                                                ([
                                                    day,
                                                    key,
                                                ]) => (
                                                    <div
                                                        key={
                                                            day
                                                        }
                                                        className={
                                                            getTodayName() ===
                                                                day
                                                                ? "today"
                                                                : ""
                                                        }
                                                    >
                                                        <span>
                                                            {
                                                                day
                                                            }
                                                        </span>

                                                        <span>
                                                            {spot[
                                                                key
                                                            ]
                                                                ? formatHours(
                                                                    spot
                                                                )
                                                                : "Closed"}
                                                        </span>
                                                    </div>
                                                )
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </section>

                        {menu.length > 0 && (
                            <section className="nt-spot-section">
                                <SectionTitle
                                    icon={
                                        <Utensils
                                            size={17}
                                        />
                                    }
                                >
                                    Menu
                                </SectionTitle>

                                <div className="nt-menu-list">
                                    {menu.map(
                                        (
                                            item
                                        ) => (
                                            <article
                                                key={
                                                    item.id
                                                }
                                                className="nt-menu-item"
                                            >
                                                <div>
                                                    <div className="nt-menu-name-row">
                                                        <h3>
                                                            {
                                                                item.name
                                                            }
                                                        </h3>

                                                        {item.popular && (
                                                            <span>
                                                                Popular
                                                            </span>
                                                        )}
                                                    </div>

                                                    {item.description && (
                                                        <p>
                                                            {
                                                                item.description
                                                            }
                                                        </p>
                                                    )}
                                                </div>

                                                <strong>
                                                    {formatMoney(
                                                        item.price,
                                                        item.currency
                                                    )}
                                                </strong>
                                            </article>
                                        )
                                    )}
                                </div>
                            </section>
                        )}

                        <section className="nt-spot-section">
                            <SectionTitle
                                action={
                                    reviews.length >
                                    5 && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowAllReviews(
                                                    !showAllReviews
                                                )
                                            }
                                        >
                                            {showAllReviews
                                                ? "Show less"
                                                : "See all reviews"}
                                        </button>
                                    )
                                }
                            >
                                Visitor reviews
                            </SectionTitle>

                            {reviews.length ===
                                0 ? (
                                <div className="nt-no-reviews">
                                    <Star
                                        size={20}
                                    />

                                    <strong>
                                        No reviews yet
                                    </strong>

                                    <span>
                                        Be among the
                                        first visitors
                                        to share your
                                        experience.
                                    </span>
                                </div>
                            ) : (
                                <div className="nt-reviews">
                                    {visibleReviews.map(
                                        (
                                            review
                                        ) => (
                                            <article
                                                key={
                                                    review.id
                                                }
                                                className="nt-review"
                                            >
                                                <div className="nt-review-top">
                                                    <div className="nt-review-stars">
                                                        {Array.from(
                                                            {
                                                                length: 5,
                                                            }
                                                        ).map(
                                                            (
                                                                _,
                                                                index
                                                            ) => (
                                                                <Star
                                                                    key={
                                                                        index
                                                                    }
                                                                    size={
                                                                        12
                                                                    }
                                                                    fill={
                                                                        index <
                                                                            review.rating
                                                                            ? "currentColor"
                                                                            : "none"
                                                                    }
                                                                />
                                                            )
                                                        )}
                                                    </div>

                                                    <time>
                                                        {formatReviewDate(
                                                            review.created_at
                                                        )}
                                                    </time>
                                                </div>

                                                {review.comment && (
                                                    <p>
                                                        {
                                                            review.comment
                                                        }
                                                    </p>
                                                )}

                                                <div className="nt-review-trust">
                                                    {review.price_accurate ===
                                                        true && (
                                                            <span>
                                                                <Check
                                                                    size={
                                                                        10
                                                                    }
                                                                />
                                                                Price accurate
                                                            </span>
                                                        )}

                                                    {review.location_accurate ===
                                                        true && (
                                                            <span>
                                                                <Check
                                                                    size={
                                                                        10
                                                                    }
                                                                />
                                                                Location accurate
                                                            </span>
                                                        )}
                                                </div>
                                            </article>
                                        )
                                    )}
                                </div>
                            )}
                        </section>
                    </div>

                    <aside className="nt-spot-side-column">
                        {/* =================================================
                            GOOD TO KNOW
                            Keep every piece of place information in a
                            predictable label/value row so the label and
                            value can never run into each other.
                        ================================================== */}
                        <div className="nt-info-card">
                            <div className="nt-info-card-header">
                                <div className="nt-info-card-icon">
                                    <MapPin
                                        size={17}
                                    />
                                </div>

                                <div>
                                    <span className="nt-info-card-eyebrow">
                                        Good to know
                                    </span>

                                    <strong className="nt-info-card-heading">
                                        Place information
                                    </strong>
                                </div>
                            </div>

                            <div className="nt-info-row">
                                <div className="nt-info-row-icon">
                                    <MapPin
                                        size={15}
                                    />
                                </div>

                                <div className="nt-info-row-content">
                                    <span className="nt-info-row-label">
                                        Location
                                    </span>

                                    <strong className="nt-info-row-value">
                                        {[
                                            spot.neighborhood,
                                            spot.city,
                                        ]
                                            .filter(Boolean)
                                            .join(", ") ||
                                            "Location not listed"}
                                    </strong>

                                    {spot.address && (
                                        <p className="nt-info-row-secondary">
                                            {spot.address}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="nt-info-row">
                                <div className="nt-info-row-icon">
                                    <Utensils
                                        size={15}
                                    />
                                </div>

                                <div className="nt-info-row-content">
                                    <span className="nt-info-row-label">
                                        Price range
                                    </span>

                                    <strong className="nt-info-row-value">
                                        {formatPriceRange(
                                            spot
                                        )}
                                    </strong>
                                </div>
                            </div>

                            {spot.phone && (
                                <div className="nt-info-row">
                                    <div className="nt-info-row-icon">
                                        <Phone
                                            size={15}
                                        />
                                    </div>

                                    <div className="nt-info-row-content">
                                        <span className="nt-info-row-label">
                                            Phone
                                        </span>

                                        <a
                                            href={`tel:${spot.phone}`}
                                            className="nt-info-row-value nt-info-row-link"
                                        >
                                            {spot.phone}
                                        </a>
                                    </div>
                                </div>
                            )}

                            {spot.website && (
                                <div className="nt-info-row">
                                    <div className="nt-info-row-icon">
                                        <ExternalLink
                                            size={15}
                                        />
                                    </div>

                                    <div className="nt-info-row-content">
                                        <span className="nt-info-row-label">
                                            Website
                                        </span>

                                        <button
                                            type="button"
                                            className="nt-info-row-action"
                                            onClick={
                                                openWebsite
                                            }
                                        >
                                            Visit website
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                className="nt-info-card-direction-button"
                                onClick={
                                    openDirections
                                }
                                disabled={directionsLoading}
                            >
                                <Navigation
                                    size={14}
                                />
                                <span>
                                    {directionsLoading
                                        ? "Finding place…"
                                        : "Get directions"}
                                </span>
                            </button>
                        </div>

                        <div className="nt-info-card nt-trust-card">
                            <div className="nt-trust-heading">
                                <Check
                                    size={15}
                                />

                                <strong>
                                    NiceThings verified
                                </strong>
                            </div>

                            <p>
                                {spot.verified
                                    ? "This place has been verified by the NiceThings team."
                                    : "Information about this place has been submitted to NiceThings."}
                            </p>

                            <div className="nt-trust-items">
                                <span>
                                    <Check size={11} />
                                    Place information
                                </span>

                                <span>
                                    <Check size={11} />
                                    Location information
                                </span>

                                <span>
                                    <Check size={11} />
                                    Community reviews
                                </span>
                            </div>
                        </div>
                    </aside>
                </section>
            </div>

            <AnimatePresence>
                {showGallery &&
                    photos.length > 0 && (
                        <motion.div
                            className="nt-gallery-modal"
                            initial={{
                                opacity: 0,
                            }}
                            animate={{
                                opacity: 1,
                            }}
                            exit={{
                                opacity: 0,
                            }}
                        >
                            <button
                                type="button"
                                className="nt-gallery-close"
                                onClick={() =>
                                    setShowGallery(
                                        false
                                    )
                                }
                                aria-label="Close gallery"
                            >
                                <X size={20} />
                            </button>

                            <button
                                type="button"
                                className="nt-gallery-prev"
                                onClick={() =>
                                    setActivePhoto(
                                        activePhoto === 0
                                            ? photos.length - 1
                                            : activePhoto - 1
                                    )
                                }
                                aria-label="Previous photo"
                            >
                                <ChevronLeft
                                    size={22}
                                />
                            </button>

                            <motion.img
                                key={
                                    photos[
                                        activePhoto
                                    ]?.id
                                }
                                src={
                                    photos[
                                        activePhoto
                                    ]?.image_url
                                }
                                alt={
                                    photos[
                                        activePhoto
                                    ]?.alt_text ??
                                    spot.name
                                }
                                initial={{
                                    opacity: 0,
                                    scale: 0.97,
                                }}
                                animate={{
                                    opacity: 1,
                                    scale: 1,
                                }}
                                transition={{
                                    duration: 0.25,
                                }}
                            />

                            <button
                                type="button"
                                className="nt-gallery-next"
                                onClick={() =>
                                    setActivePhoto(
                                        activePhoto ===
                                            photos.length - 1
                                            ? 0
                                            : activePhoto + 1
                                    )
                                }
                                aria-label="Next photo"
                            >
                                <ChevronRight
                                    size={22}
                                />
                            </button>

                            <div className="nt-gallery-counter">
                                {activePhoto +
                                    1}{" "}
                                /{" "}
                                {
                                    photos.length
                                }
                            </div>
                        </motion.div>
                    )}
            </AnimatePresence>

            <AnimatePresence>
                {toast && (
                    <motion.div
                        className="nt-spot-toast"
                        initial={{
                            opacity: 0,
                            y: 15,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                        }}
                        exit={{
                            opacity: 0,
                            y: 15,
                        }}
                    >
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}

function SpotGallery({
    photos,
    spotName,
    activePhoto,
    setActivePhoto,
    openGallery,
}: {
    photos: Photo[];
    spotName: string;
    activePhoto: number;
    setActivePhoto: (
        value: number
    ) => void;
    openGallery: () => void;
}) {
    if (photos.length === 0) {
        return (
            <section className="nt-spot-gallery nt-no-photo-gallery">
                <div className="nt-gallery-empty">
                    <MapPin size={28} />
                    <span>
                        Photos coming soon
                    </span>
                </div>
            </section>
        );
    }

    return (
        <section className="nt-spot-gallery">
            <div className="nt-gallery-main">
                <button
                    type="button"
                    className="nt-gallery-image-button"
                    onClick={openGallery}
                >
                    <img
                        src={
                            photos[0]
                                .image_url
                        }
                        alt={
                            photos[0]
                                .alt_text ??
                            spotName
                        }
                    />

                    <div className="nt-gallery-gradient" />

                    <div className="nt-gallery-open">
                        <ExternalLink
                            size={14}
                        />
                        View gallery
                    </div>
                </button>
            </div>

            <div className="nt-gallery-side">
                {photos
                    .slice(1, 3)
                    .map(
                        (
                            photo,
                            index
                        ) => (
                            <button
                                key={
                                    photo.id
                                }
                                type="button"
                                className="nt-gallery-side-image"
                                onClick={() => {
                                    setActivePhoto(
                                        index +
                                        1
                                    );

                                    openGallery();
                                }}
                            >
                                <img
                                    src={
                                        photo.image_url
                                    }
                                    alt={
                                        photo.alt_text ??
                                        spotName
                                    }
                                />

                                {index ===
                                    1 &&
                                    photos.length >
                                    3 && (
                                        <span>
                                            +
                                            {photos.length -
                                                3}
                                        </span>
                                    )}
                            </button>
                        )
                    )}

                {photos.length === 1 && (
                    <>
                        <div className="nt-gallery-placeholder" />
                        <div className="nt-gallery-placeholder" />
                    </>
                )}
            </div>
        </section>
    );
}

function SectionTitle({
    children,
    icon,
    action,
}: {
    children: React.ReactNode;
    icon?: React.ReactNode;
    action?: React.ReactNode;
}) {
    return (
        <div className="nt-section-title">
            <div>
                {icon}
                <h2>{children}</h2>
            </div>

            {action}
        </div>
    );
}

function SpotLoading() {
    return (
        <main className="nt-spot-loading-page">
            <div className="nt-page-container">
                <div className="nt-loading-gallery">
                    <div />
                    <div />
                </div>

                <div className="nt-loading-intro">
                    <div />
                    <div />
                    <div />
                </div>

                <div className="nt-loading-body">
                    <div>
                        <div />
                        <div />
                        <div />
                    </div>

                    <div />
                </div>
            </div>
        </main>
    );
}

function formatCategory(
    category: string
) {
    return category
        .replaceAll("_", " ")
        .replace(
            /\b\w/g,
            (letter) =>
                letter.toUpperCase()
        );
}

function formatMoney(
    amount: number,
    currency: string
) {
    return `${new Intl.NumberFormat(
        "fr-FR"
    ).format(amount)} ${currency}`;
}

function formatPriceRange(
    spot: Spot
) {
    if (
        spot.minimum_price !==
        null &&
        spot.maximum_price !==
        null
    ) {
        if (
            spot.minimum_price ===
            spot.maximum_price
        ) {
            return formatMoney(
                spot.minimum_price,
                spot.currency
            );
        }

        return `${formatMoney(
            spot.minimum_price,
            spot.currency
        )} – ${formatMoney(
            spot.maximum_price,
            spot.currency
        )}`;
    }

    if (
        spot.average_price !==
        null
    ) {
        return formatMoney(
            spot.average_price,
            spot.currency
        );
    }

    return "Price not listed";
}

function formatHours(
    spot: Spot
) {
    if (
        !spot.opening_time ||
        !spot.closing_time
    ) {
        return "Hours not listed";
    }

    return `${formatTime(
        spot.opening_time
    )} – ${formatTime(
        spot.closing_time
    )}`;
}

function formatTime(
    value: string
) {
    const parts =
        value.split(":");

    if (parts.length < 2) {
        return value;
    }

    const hour =
        Number(parts[0]);

    const minute =
        parts[1];

    if (
        Number.isNaN(hour)
    ) {
        return value;
    }

    const suffix =
        hour >= 12
            ? "PM"
            : "AM";

    const displayHour =
        hour % 12 || 12;

    return `${displayHour}:${minute} ${suffix}`;
}

function getTodayName() {
    return new Intl.DateTimeFormat(
        "en-US",
        {
            weekday: "long",
        }
    ).format(new Date());
}

function isOpenToday(
    spot: Spot
) {
    const today =
        getTodayName();

    const field =
        DAYS.find(
            ([name]) =>
                name === today
        )?.[1];

    if (!field) {
        return false;
    }

    return Boolean(
        spot[field]
    );
}

function formatReviewDate(
    value: string
) {
    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }

    return new Intl.DateTimeFormat(
        "en-US",
        {
            day: "numeric",
            month: "short",
            year: "numeric",
        }
    ).format(date);
}