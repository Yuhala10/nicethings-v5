"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
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

type Spot = {
    id: string;
    name: string;
    slug: string | null;
    description: string | null;
    category: string | null;
    cuisine: string | null;
    address: string | null;
    neighborhood: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    whatsapp: string | null;
    website: string | null;
    average_price: number | null;
    minimum_price: number | null;
    maximum_price: number | null;
    currency: string | null;
    opening_time: string | null;
    closing_time: string | null;
    monday_open: boolean | null;
    tuesday_open: boolean | null;
    wednesday_open: boolean | null;
    thursday_open: boolean | null;
    friday_open: boolean | null;
    saturday_open: boolean | null;
    sunday_open: boolean | null;
    rating: number | null;
    review_count: number | null;
    verified: boolean | null;
    featured: boolean | null;
    status: string | null;
};

type Photo = {
    id: string;
    spot_id: string;
    image_url: string;
    alt_text: string | null;
    sort_order: number | null;
};

type MenuItem = {
    id: string;
    spot_id: string;
    name: string;
    description: string | null;
    price: number;
    currency: string | null;
    popular: boolean | null;
    available: boolean | null;
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

    const slug =
        Array.isArray(rawSlug)
            ? rawSlug[0]
            : rawSlug;

    /*
     * Your existing Database type intentionally keeps
     * several tables generic. We are NOT changing the
     * database. We simply keep this page flexible.
     */
    const supabase = useMemo(
        () =>
            getSupabaseBrowserClient() as any,
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
                    spotData as Spot;

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
                                ascending:
                                    true,
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
                                ascending:
                                    false,
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
                                ascending:
                                    false,
                            }
                        )
                        .limit(20),
                ]);

                setPhotos(
                    (photosResult.data ??
                        []) as Photo[]
                );

                setMenu(
                    (menuResult.data ??
                        []) as MenuItem[]
                );

                setReviews(
                    (reviewsResult.data ??
                        []) as Review[]
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
            window.setTimeout(
                () => {
                    setToast(null);
                },
                3000
            );

        return () =>
            window.clearTimeout(
                timer
            );
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
                setSaved(
                    Boolean(data)
                );
            }
        } catch (err) {
            console.warn(
                "Saved state error:",
                err
            );
        }
    }
    async function toggleSave() {
        if (
            !spot ||
            saveLoading
        ) {
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

    function openDirections() {
        if (!spot) {
            return;
        }

        if (
            typeof spot.latitude !==
            "number" ||
            typeof spot.longitude !==
            "number"
        ) {
            setToast(
                "Directions aren't available for this place yet."
            );

            return;
        }

        const url =
            "https://www.google.com/maps/dir/?api=1" +
            `&destination=${encodeURIComponent(
                `${spot.latitude},${spot.longitude}`
            )}`;

        window.open(
            url,
            "_blank",
            "noopener,noreferrer"
        );
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
            setToast(
                "This place hasn't provided a website."
            );

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
                        <ArrowLeft
                            size={15}
                        />
                        Back to discovery
                    </Link>

                    <div className="nt-spot-error-card">
                        <div className="nt-spot-error-icon">
                            <MapPin
                                size={22}
                            />
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
                            Discover other
                            places
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const visibleReviews =
        showAllReviews
            ? reviews
            : reviews.slice(
                0,
                5
            );

    return (
        <main className="nt-spot-page">
            <div className="nt-page-container">
                <div className="nt-spot-topbar">
                    <Link
                        href="/search"
                        className="nt-back-link"
                    >
                        <ArrowLeft
                            size={15}
                        />
                        Discovery
                    </Link>

                    <button
                        type="button"
                        className={`nt-save-button ${saved
                            ? "saved"
                            : ""
                            }`}
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
                    photos={
                        photos
                    }
                    spotName={
                        spot.name
                    }
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
                                        size={
                                            11
                                        }
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
                                    size={
                                        14
                                    }
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
                            <MapPin
                                size={
                                    15
                                }
                            />

                            <span>
                                {[
                                    spot.address,
                                    spot.neighborhood,
                                    spot.city,
                                ]
                                    .filter(
                                        (
                                            value
                                        ): value is string =>
                                            Boolean(
                                                value
                                            )
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
                        >
                            <Navigation
                                size={
                                    16
                                }
                            />

                            <span>
                                Find this place
                            </span>

                            <ArrowLeft
                                size={
                                    14
                                }
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
                                    aria-label="Call"
                                >
                                    <Phone
                                        size={
                                            16
                                        }
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
                                    aria-label="WhatsApp"
                                >
                                    <MessageCircle
                                        size={
                                            16
                                        }
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
                                    aria-label="Website"
                                >
                                    <ExternalLink
                                        size={
                                            16
                                        }
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
                                    About this
                                    place
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
                                        size={
                                            17
                                        }
                                    />
                                }
                                action={
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowHours(
                                                (
                                                    current
                                                ) =>
                                                    !current
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
                                            {getTodayName()}
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
                                                height:
                                                    "auto",
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
                                    What they offer
                                </SectionTitle>

                                <div className="nt-menu-list">
                                    {menu.map(
                                        (
                                            item
                                        ) => (
                                            <div
                                                className={
                                                    item.popular
                                                        ? "nt-menu-item popular"
                                                        : "nt-menu-item"
                                                }
                                                key={
                                                    item.id
                                                }
                                            >
                                                <div className="nt-menu-item-copy">
                                                    <div className="nt-menu-item-title">
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
                                                    {formatPrice(
                                                        item.price,
                                                        item.currency
                                                    )}
                                                </strong>
                                            </div>
                                        )
                                    )}
                                </div>
                            </section>
                        )}

                        <section className="nt-spot-section">
                            <SectionTitle
                                icon={
                                    <Star
                                        size={17}
                                    />
                                }
                                action={
                                    reviews.length >
                                        5 ? (
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
                                    ) : undefined
                                }
                            >
                                What people say
                            </SectionTitle>

                            {reviews.length ===
                                0 ? (
                                <div className="nt-no-reviews">
                                    <div>
                                        <Star
                                            size={20}
                                        />
                                    </div>

                                    <h3>
                                        Be the first
                                        to share
                                        your
                                        experience
                                    </h3>

                                    <p>
                                        There are
                                        no reviews
                                        for this
                                        place yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="nt-reviews-list">
                                    {visibleReviews.map(
                                        (
                                            review
                                        ) => (
                                            <ReviewCard
                                                key={
                                                    review.id
                                                }
                                                review={
                                                    review
                                                }
                                            />
                                        )
                                    )}
                                </div>
                            )}
                        </section>
                    </div>

                    <aside className="nt-spot-sidebar">
                        <div className="nt-sidebar-card">
                            <div className="nt-sidebar-card-label">
                                GOOD TO KNOW
                            </div>

                            <div className="nt-sidebar-items">
                                <InfoItem
                                    icon={
                                        <MapPin
                                            size={17}
                                        />
                                    }
                                    title="Location"
                                    value={
                                        [
                                            spot.neighborhood,
                                            spot.city,
                                        ]
                                            .filter(
                                                (
                                                    value
                                                ): value is string =>
                                                    Boolean(
                                                        value
                                                    )
                                            )
                                            .join(
                                                ", "
                                            ) ||
                                        "Location not provided"
                                    }
                                />

                                {(spot.minimum_price !==
                                    null ||
                                    spot.maximum_price !==
                                    null ||
                                    spot.average_price !==
                                    null) && (
                                        <InfoItem
                                            icon={
                                                <span className="nt-price-symbol">
                                                    ₣
                                                </span>
                                            }
                                            title="Price range"
                                            value={formatPriceRange(
                                                spot
                                            )}
                                        />
                                    )}

                                {spot.cuisine && (
                                    <InfoItem
                                        icon={
                                            <Utensils
                                                size={17}
                                            />
                                        }
                                        title="Style"
                                        value={
                                            spot.cuisine
                                        }
                                    />
                                )}

                                {spot.phone && (
                                    <InfoItem
                                        icon={
                                            <Phone
                                                size={17}
                                            />
                                        }
                                        title="Phone"
                                        value={
                                            spot.phone
                                        }
                                    />
                                )}
                            </div>

                            <button
                                type="button"
                                className="nt-sidebar-direction"
                                onClick={
                                    openDirections
                                }
                            >
                                <Navigation
                                    size={15}
                                />

                                Get directions

                                <ArrowLeft
                                    size={14}
                                    className="nt-sidebar-arrow"
                                />
                            </button>
                        </div>

                        <div className="nt-sidebar-note">
                            <div>
                                <SparklesIcon />
                            </div>

                            <p>
                                Love this place?
                                Save it so you
                                can find it again
                                later.
                            </p>
                        </div>
                    </aside>
                </section>
            </div>

            <AnimatePresence>
                {showGallery && (
                    <GalleryModal
                        photos={
                            photos
                        }
                        spotName={
                            spot.name
                        }
                        activePhoto={
                            activePhoto
                        }
                        setActivePhoto={
                            setActivePhoto
                        }
                        close={() =>
                            setShowGallery(
                                false
                            )
                        }
                    />
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
                        <Check
                            size={15}
                        />

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
            <section className="nt-spot-gallery nt-spot-gallery-empty">
                <div className="nt-gallery-empty-art">
                    <MapPin
                        size={32}
                    />
                </div>

                <span>
                    Photos coming soon
                </span>
            </section>
        );
    }

    const current =
        photos[
        Math.min(
            activePhoto,
            photos.length - 1
        )
        ];

    return (
        <section className="nt-spot-gallery">
            <button
                type="button"
                className="nt-gallery-main"
                onClick={
                    openGallery
                }
            >
                <img
                    src={
                        current.image_url
                    }
                    alt={
                        current.alt_text ??
                        spotName
                    }
                />

                <div className="nt-gallery-overlay" />

                <span className="nt-gallery-expand">
                    View gallery
                </span>
            </button>

            {photos.length > 1 && (
                <>
                    <button
                        type="button"
                        className="nt-gallery-arrow left"
                        onClick={() =>
                            setActivePhoto(
                                activePhoto ===
                                    0
                                    ? photos.length -
                                    1
                                    : activePhoto -
                                    1
                            )
                        }
                        aria-label="Previous photo"
                    >
                        <ChevronLeft
                            size={20}
                        />
                    </button>

                    <button
                        type="button"
                        className="nt-gallery-arrow right"
                        onClick={() =>
                            setActivePhoto(
                                activePhoto ===
                                    photos.length -
                                    1
                                    ? 0
                                    : activePhoto +
                                    1
                            )
                        }
                        aria-label="Next photo"
                    >
                        <ChevronRight
                            size={20}
                        />
                    </button>

                    <div className="nt-gallery-thumbnails">
                        {photos
                            .slice(
                                0,
                                5
                            )
                            .map(
                                (
                                    photo,
                                    index
                                ) => (
                                    <button
                                        type="button"
                                        key={
                                            photo.id
                                        }
                                        className={
                                            index ===
                                                activePhoto
                                                ? "active"
                                                : ""
                                        }
                                        onClick={() =>
                                            setActivePhoto(
                                                index
                                            )
                                        }
                                    >
                                        <img
                                            src={
                                                photo.image_url
                                            }
                                            alt=""
                                        />
                                    </button>
                                )
                            )}

                        {photos.length >
                            5 && (
                                <button
                                    type="button"
                                    className="nt-gallery-more"
                                    onClick={
                                        openGallery
                                    }
                                >
                                    +
                                    {photos.length -
                                        5}
                                </button>
                            )}
                    </div>
                </>
            )}
        </section>
    );
}

function GalleryModal({
    photos,
    spotName,
    activePhoto,
    setActivePhoto,
    close,
}: {
    photos: Photo[];
    spotName: string;
    activePhoto: number;
    setActivePhoto: (
        value: number
    ) => void;
    close: () => void;
}) {
    const current =
        photos[
        Math.min(
            activePhoto,
            photos.length - 1
        )
        ];

    if (!current) {
        return null;
    }

    function previous() {
        setActivePhoto(
            activePhoto === 0
                ? photos.length - 1
                : activePhoto - 1
        );
    }

    function next() {
        setActivePhoto(
            activePhoto ===
                photos.length - 1
                ? 0
                : activePhoto + 1
        );
    }

    return (
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
            onClick={
                close
            }
        >
            <button
                type="button"
                className="nt-gallery-close"
                onClick={
                    close
                }
                aria-label="Close gallery"
            >
                <X
                    size={21}
                />
            </button>

            <div
                className="nt-gallery-viewer"
                onClick={(event) =>
                    event.stopPropagation()
                }
            >
                <img
                    src={
                        current.image_url
                    }
                    alt={
                        current.alt_text ??
                        spotName
                    }
                />

                {photos.length > 1 && (
                    <>
                        <button
                            type="button"
                            className="nt-gallery-modal-arrow left"
                            onClick={
                                previous
                            }
                            aria-label="Previous photo"
                        >
                            <ChevronLeft
                                size={24}
                            />
                        </button>

                        <button
                            type="button"
                            className="nt-gallery-modal-arrow right"
                            onClick={
                                next
                            }
                            aria-label="Next photo"
                        >
                            <ChevronRight
                                size={24}
                            />
                        </button>
                    </>
                )}

                <div className="nt-gallery-counter">
                    {activePhoto + 1} /{" "}
                    {photos.length}
                </div>
            </div>

            <div className="nt-gallery-caption">
                {spotName}
            </div>
        </motion.div>
    );
}
function SectionTitle({
    children,
    icon,
    action,
}: {
    children: ReactNode;
    icon?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="nt-section-title">
            <div>
                {icon && (
                    <span className="nt-section-title-icon">
                        {icon}
                    </span>
                )}

                <h2>
                    {children}
                </h2>
            </div>

            {action}
        </div>
    );
}

function InfoItem({
    icon,
    title,
    value,
}: {
    icon: ReactNode;
    title: string;
    value: string;
}) {
    return (
        <div className="nt-info-item">
            <div className="nt-info-icon">
                {icon}
            </div>

            <div>
                <span>
                    {title}
                </span>

                <strong>
                    {value}
                </strong>
            </div>
        </div>
    );
}

function ReviewCard({
    review,
}: {
    review: Review;
}) {
    return (
        <article className="nt-review-card">
            <div className="nt-review-top">
                <div className="nt-review-avatar">
                    {getReviewInitial(
                        review.visitor_id
                    )}
                </div>

                <div className="nt-review-heading">
                    <strong>
                        NiceThings visitor
                    </strong>

                    <span>
                        {formatReviewDate(
                            review.created_at
                        )}
                    </span>
                </div>

                <div className="nt-review-rating">
                    {Array.from({
                        length: 5,
                    }).map(
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
            </div>

            {review.comment && (
                <p>
                    {review.comment}
                </p>
            )}

            {(review.price_accurate ||
                review.location_accurate) && (
                    <div className="nt-review-confirmations">
                        {review.price_accurate && (
                            <span>
                                <Check
                                    size={
                                        11
                                    }
                                />
                                Price accurate
                            </span>
                        )}

                        {review.location_accurate && (
                            <span>
                                <Check
                                    size={
                                        11
                                    }
                                />
                                Location accurate
                            </span>
                        )}
                    </div>
                )}
        </article>
    );
}

function SpotLoading() {
    return (
        <main className="nt-spot-page">
            <div className="nt-page-container">
                <div className="nt-spot-loading-top">
                    <span />
                    <span />
                </div>

                <div className="nt-spot-loading-gallery" />

                <section className="nt-spot-loading-intro">
                    <span />
                    <span />
                    <span />
                    <span />
                </section>

                <div className="nt-spot-loading-divider" />

                <section className="nt-spot-loading-grid">
                    <div>
                        <span />
                        <span />
                        <span />
                        <span />
                    </div>

                    <aside>
                        <span />
                        <span />
                        <span />
                    </aside>
                </section>
            </div>
        </main>
    );
}

function SparklesIcon() {
    return (
        <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path
                d="M12 3L13.4 8.6L19 10L13.4 11.4L12 17L10.6 11.4L5 10L10.6 8.6L12 3Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
            />

            <path
                d="M19 16L19.7 18.3L22 19L19.7 19.7L19 22L18.3 19.7L16 19L18.3 18.3L19 16Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function formatCategory(
    value: string | null
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
            (
                letter
            ) =>
                letter.toUpperCase()
        );
}

function formatPrice(
    value: number,
    currency: string | null
) {
    return `${new Intl.NumberFormat(
        "fr-FR"
    ).format(
        value
    )} ${currency || "XAF"}`;
}

function formatPriceRange(
    spot: Spot
) {
    const currency =
        spot.currency ||
        "XAF";

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
            return formatPrice(
                spot.minimum_price,
                currency
            );
        }

        return `${new Intl.NumberFormat(
            "fr-FR"
        ).format(
            spot.minimum_price
        )} – ${new Intl.NumberFormat(
            "fr-FR"
        ).format(
            spot.maximum_price
        )} ${currency}`;
    }

    if (
        spot.average_price !==
        null
    ) {
        return formatPrice(
            spot.average_price,
            currency
        );
    }

    if (
        spot.minimum_price !==
        null
    ) {
        return `From ${formatPrice(
            spot.minimum_price,
            currency
        )}`;
    }

    if (
        spot.maximum_price !==
        null
    ) {
        return `Up to ${formatPrice(
            spot.maximum_price,
            currency
        )}`;
    }

    return "Price varies";
}

function formatHours(
    spot: Spot
) {
    if (
        !spot.opening_time ||
        !spot.closing_time
    ) {
        return "Hours not provided";
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

    if (
        parts.length < 2
    ) {
        return value;
    }

    const hour =
        Number(parts[0]);

    const minute =
        Number(parts[1]);

    if (
        Number.isNaN(
            hour
        ) ||
        Number.isNaN(
            minute
        )
    ) {
        return value;
    }

    const suffix =
        hour >= 12
            ? "PM"
            : "AM";

    const twelveHour =
        hour % 12 || 12;

    return `${twelveHour}:${String(
        minute
    ).padStart(
        2,
        "0"
    )} ${suffix}`;
}

function getTodayName() {
    const day =
        new Date().getDay();

    const names = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ];

    return names[day];
}

function isOpenToday(
    spot: Spot
) {
    const today =
        getTodayName();

    const keyMap:
        Record<
            string,
            DayKey
        > = {
        Monday:
            "monday_open",
        Tuesday:
            "tuesday_open",
        Wednesday:
            "wednesday_open",
        Thursday:
            "thursday_open",
        Friday:
            "friday_open",
        Saturday:
            "saturday_open",
        Sunday:
            "sunday_open",
    };

    const key =
        keyMap[today];

    return key
        ? Boolean(
            spot[key]
        )
        : false;
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
        "en",
        {
            day: "numeric",
            month: "short",
            year: "numeric",
        }
    ).format(date);
}

function getReviewInitial(
    visitorId: string
) {
    if (
        !visitorId
    ) {
        return "N";
    }

    return visitorId
        .slice(
            0,
            1
        )
        .toUpperCase();
}