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
    ArrowRight,
    Check,
    Compass,
    Crosshair,
    Heart,
    MapPin,
    Navigation,
    RefreshCw,
    Search,
    Star,
} from "lucide-react";

import Link from "next/link";

import dynamic from "next/dynamic";

const NearbyMap = dynamic(
    () =>
        import(
            "../../components/maps/NearbyMap"
        ),
    {
        ssr: false,
        loading: () => (
            <div
                className="nt-map-loading"
                aria-label="Loading map"
            >
                <span className="nt-map-loading-dot" />
                <span>
                    Loading map…
                </span>
            </div>
        ),
    }
);

import {
    getSupabaseBrowserClient,
} from "../../lib/supabase/client";

import {
    getCurrentLocation,
    type UserLocation,
    LocationError,
} from "../../lib/location";

import {
    findNearbySpots,
} from "../../lib/location/nearby";

import {
    formatDistance,
} from "../../lib/location/distance";

import {
    grantLocationConsent,
} from "../../lib/consent";

type Spot = {
    id: string;
    name: string;
    slug?: string | null;
    description?: string | null;
    category?: string | null;
    cuisine?: string | null;
    city?: string | null;
    neighborhood?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    rating?: number | null;
    review_count?: number | null;
    verified?: boolean | null;
    featured?: boolean | null;
    minimum_price?: number | null;
    maximum_price?: number | null;
    average_price?: number | null;
    currency?: string | null;
};

type Photo = {
    id: string;
    spot_id: string;
    image_url: string;
    alt_text?: string | null;
    sort_order?: number | null;
};

type NearbySpot = Spot & {
    coverImage: string | null;
    distanceKm: number;
};

const INITIAL_RADIUS = 10;

const RADIUS_OPTIONS = [
    {
        label: "5 km",
        value: 5,
    },
    {
        label: "10 km",
        value: 10,
    },
    {
        label: "25 km",
        value: 25,
    },
    {
        label: "50 km",
        value: 50,
    },
];

export default function NearbyPage() {
    const supabase = useMemo(
        () =>
            getSupabaseBrowserClient() as any,
        []
    );

    const [
        location,
        setLocation,
    ] = useState<UserLocation | null>(
        null
    );

    const [
        locationState,
        setLocationState,
    ] = useState<
        "idle" |
        "loading" |
        "success" |
        "error"
    >("idle");

    const [
        locationMessage,
        setLocationMessage,
    ] = useState("");

    const [
        spots,
        setSpots,
    ] = useState<NearbySpot[]>([]);

    const [
        loadingSpots,
        setLoadingSpots,
    ] = useState(false);

    const [
        radius,
        setRadius,
    ] = useState(INITIAL_RADIUS);

    const [
        savedIds,
        setSavedIds,
    ] = useState<Set<string>>(
        new Set()
    );

    const [
        search,
        setSearch,
    ] = useState("");

    const [
        selectedCategory,
        setSelectedCategory,
    ] = useState("all");

    const [
        showRadius,
        setShowRadius,
    ] = useState(false);

    const [
        selectedSpotId,
        setSelectedSpotId,
    ] = useState<string | null>(
        null
    );

    const [
        discoveryStarted,
        setDiscoveryStarted,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState<string | null>(
        null
    );

    /*
     * ------------------------------------------------
     * LOCATION
     * ------------------------------------------------
     */

    const requestLocation =
        useCallback(async () => {
            setLocationState(
                "loading"
            );

            setLocationMessage(
                "Finding your location..."
            );

            setError(null);

            try {
                const result =
                    await getCurrentLocation();

                if (
                    !result ||
                    !Number.isFinite(
                        result.latitude
                    ) ||
                    !Number.isFinite(
                        result.longitude
                    )
                ) {
                    throw new LocationError(
                        "We couldn't determine your location.",
                        "UNKNOWN"
                    );
                }

                setLocation(
                    result
                );

                setLocationState(
                    "success"
                );

                setLocationMessage(
                    result.accuracy <= 50
                        ? "Your location is accurate."
                        : "Your approximate location was found."
                );

                setDiscoveryStarted(false);
                setSelectedSpotId(null);
                grantLocationConsent();
            } catch (
            err
            ) {
                setLocationState(
                    "error"
                );

                if (
                    err instanceof
                    LocationError
                ) {
                    switch (
                    err.code
                    ) {
                        case "PERMISSION_DENIED":
                            setLocationMessage(
                                "Location access was not allowed. You can still explore another area."
                            );
                            break;

                        case "POSITION_UNAVAILABLE":
                            setLocationMessage(
                                "Your location is currently unavailable."
                            );
                            break;

                        case "TIMEOUT":
                            setLocationMessage(
                                "Finding your location took too long. Please try again."
                            );
                            break;

                        case "UNSUPPORTED":
                            setLocationMessage(
                                "Location isn't supported on this device."
                            );
                            break;

                        default:
                            setLocationMessage(
                                "We couldn't determine your location."
                            );
                    }
                } else {
                    setLocationMessage(
                        "We couldn't determine your location."
                    );
                }
            }
        }, []);


    /*
     * ------------------------------------------------
     * SAVED PLACES
     * ------------------------------------------------
     */

    useEffect(() => {
        void loadSavedSpots();
    }, []);

    async function loadSavedSpots() {
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
                error,
            } = await supabase
                .from(
                    "nt_saved_spots"
                )
                .select(
                    "spot_id"
                )
                .eq(
                    "visitor_id",
                    visitorId
                );

            if (error) {
                console.warn(
                    "Could not load saved spots:",
                    error
                );

                return;
            }

            const rows =
                (data ??
                    []) as Array<{
                        spot_id: string;
                    }>;

            setSavedIds(
                new Set(
                    rows.map(
                        (
                            row
                        ) =>
                            row.spot_id
                    )
                )
            );
        } catch (
        err
        ) {
            console.warn(
                "Saved spots error:",
                err
            );
        }
    }

    /*
     * ------------------------------------------------
     * NEARBY PLACES
     * ------------------------------------------------
     */

    useEffect(() => {
        if (!location) {
            return;
        }

        void loadNearbySpots(
            location
        );
    }, [
        location,
        radius,
    ]);

    async function loadNearbySpots(
        userLocation: UserLocation
    ) {
        setLoadingSpots(
            true
        );

        setError(null);

        /*
         * Clear a selected place when the
         * geographic result set changes.
         */
        setSelectedSpotId(
            null
        );

        try {
            const {
                data,
                error:
                spotsError,
            } = await supabase
                .from(
                    "nt_spots"
                )
                .select("*")
                .eq(
                    "status",
                    "APPROVED"
                );

            if (spotsError) {
                throw spotsError;
            }

            const rows =
                (data ??
                    []) as unknown as Spot[];

            /*
             * The shared location engine performs:
             *
             * 1. Coordinate validation
             * 2. Distance calculation
             * 3. Radius filtering
             * 4. Distance sorting
             */
            const nearby =
                findNearbySpots(
                    rows as Array<
                        Spot & {
                            latitude:
                            | number
                            | null;

                            longitude:
                            | number
                            | null;
                        }
                    >,
                    userLocation.latitude,
                    userLocation.longitude,
                    radius
                );

            if (
                nearby.length ===
                0
            ) {
                setSpots([]);

                return;
            }

            /*
             * Only fetch photographs for places
             * that actually appear in the nearby
             * geographic result.
             */
            const ids =
                nearby.map(
                    (
                        spot
                    ) =>
                        spot.id
                );

            const {
                data:
                photoData,
                error:
                photoError,
            } = await supabase
                .from(
                    "nt_spot_photos"
                )
                .select(
                    "id,spot_id,image_url,alt_text,sort_order"
                )
                .in(
                    "spot_id",
                    ids
                )
                .order(
                    "sort_order",
                    {
                        ascending:
                            true,
                    }
                );

            if (photoError) {
                console.warn(
                    "Could not load nearby photos:",
                    photoError
                );
            }

            const photoMap =
                new Map<
                    string,
                    string
                >();

            const photos =
                (photoData ??
                    []) as unknown as Photo[];

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

            setSpots(
                nearby.map(
                    (
                        spot
                    ) => ({
                        ...spot,
                        coverImage:
                            photoMap.get(
                                spot.id
                            ) ??
                            null,
                    })
                )
            );
        } catch (
        err
        ) {
            console.error(
                "Nearby spots error:",
                err
            );

            setError(
                "We couldn't load nearby places right now."
            );
        } finally {
            setLoadingSpots(
                false
            );
        }
    }

    /*
     * ------------------------------------------------
     * SAVE / UNSAVE
     * ------------------------------------------------
     */

    async function toggleSaved(
        spotId: string
    ) {
        const visitorId =
            window.localStorage.getItem(
                "nt_visitor_id"
            );

        if (!visitorId) {
            return;
        }

        const isSaved =
            savedIds.has(
                spotId
            );

        /*
         * Instant UI response.
         */
        setSavedIds(
            (
                current
            ) => {
                const next =
                    new Set(
                        current
                    );

                if (
                    isSaved
                ) {
                    next.delete(
                        spotId
                    );
                } else {
                    next.add(
                        spotId
                    );
                }

                return next;
            }
        );

        try {
            if (
                isSaved
            ) {
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
                        spotId
                    );

                if (
                    deleteError
                ) {
                    throw deleteError;
                }
            } else {
                const {
                    error:
                    insertError,
                } = await supabase
                    .from(
                        "nt_saved_spots"
                    )
                    .insert({
                        visitor_id:
                            visitorId,
                        spot_id:
                            spotId,
                    });

                if (
                    insertError
                ) {
                    throw insertError;
                }
            }
        } catch (
        err
        ) {
            console.error(
                "Save nearby spot error:",
                err
            );

            /*
             * Roll the UI back if the
             * database operation failed.
             */
            setSavedIds(
                (
                    current
                ) => {
                    const next =
                        new Set(
                            current
                        );

                    if (
                        isSaved
                    ) {
                        next.add(
                            spotId
                        );
                    } else {
                        next.delete(
                            spotId
                        );
                    }

                    return next;
                }
            );
        }
    }

    /*
     * ------------------------------------------------
     * DIRECTIONS
     * ------------------------------------------------
     */

    function openDirections(
        spot: NearbySpot
    ) {
        if (
            typeof spot.latitude !==
            "number" ||
            typeof spot.longitude !==
            "number"
        ) {
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

    /*
     * ------------------------------------------------
     * CATEGORIES
     * ------------------------------------------------
     */

    const categories =
        useMemo(() => {
            const values =
                spots
                    .map(
                        (
                            spot
                        ) =>
                            spot.category
                    )
                    .filter(
                        (
                            value
                        ): value is string =>
                            Boolean(
                                value
                            )
                    );

            return [
                "all",
                ...Array.from(
                    new Set(
                        values
                    )
                ).slice(
                    0,
                    8
                ),
            ];
        }, [
            spots,
        ]);

    /*
     * ------------------------------------------------
     * SEARCH / FILTER
     * ------------------------------------------------
     */

    const filteredSpots =
        useMemo(() => {
            const normalizedSearch =
                search
                    .trim()
                    .toLowerCase();

            return spots.filter(
                (
                    spot
                ) => {
                    const matchesCategory =
                        selectedCategory ===
                        "all" ||
                        (
                            spot.category ??
                            ""
                        )
                            .toLowerCase() ===
                        selectedCategory.toLowerCase();

                    if (
                        !matchesCategory
                    ) {
                        return false;
                    }

                    if (
                        !normalizedSearch
                    ) {
                        return true;
                    }

                    return [
                        spot.name,
                        spot.category,
                        spot.cuisine,
                        spot.city,
                        spot.neighborhood,
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
                                        normalizedSearch
                                    )
                        );
                }
            );
        }, [
            spots,
            search,
            selectedCategory,
        ]);

    /*
     * ------------------------------------------------
     * SELECTED PLACE
     * ------------------------------------------------
     */

    const selectedSpot =
        useMemo(
            () =>
                filteredSpots.find(
                    (
                        spot
                    ) =>
                        spot.id ===
                        selectedSpotId
                ) ?? null,
            [
                filteredSpots,
                selectedSpotId,
            ]
        );

    /*
     * ------------------------------------------------
     * PAGE
     * ------------------------------------------------
     */

    return (
        <>
            <style jsx global>{`
                .nt-nearby-page {
                    min-height: 100vh;
                    padding: 34px 18px 110px;
                    background:
                        radial-gradient(circle at 82% 8%, rgba(249,115,22,.10), transparent 280px),
                        linear-gradient(180deg, #fbfaf7 0%, #f5f2ec 100%);
                    color: var(--nt-text, #171717);
                }

                .nt-nearby-container {
                    width: min(1120px, 100%);
                    margin: 0 auto;
                }

                .nt-nearby-hero {
                    position: relative;
                    min-height: 285px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 40px;
                    padding: 54px 58px;
                    overflow: hidden;
                    border: 1px solid rgba(17,17,17,.07);
                    border-radius: 34px;
                    background: linear-gradient(135deg, #ffffff 0%, #f7f3eb 100%);
                    box-shadow: 0 24px 80px rgba(17,17,17,.07);
                }

                .nt-nearby-hero::after {
                    content: "";
                    position: absolute;
                    width: 280px;
                    height: 280px;
                    right: 120px;
                    top: -170px;
                    border-radius: 50%;
                    background: rgba(249,115,22,.09);
                    filter: blur(8px);
                }

                .nt-nearby-hero-copy {
                    position: relative;
                    z-index: 2;
                    max-width: 620px;
                }

                .nt-nearby-eyebrow,
                .nt-nearby-gate-eyebrow {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    margin-bottom: 14px;
                    color: var(--nt-orange, #f97316);
                    font-size: 9px;
                    font-weight: 900;
                    letter-spacing: .16em;
                }

                .nt-nearby-hero h1 {
                    margin: 0;
                    font-family: Manrope, sans-serif;
                    font-size: clamp(42px, 6vw, 72px);
                    line-height: .92;
                    letter-spacing: -.07em;
                    font-weight: 900;
                }

                .nt-nearby-hero h1 em,
                .nt-nearby-search-stage h2 em,
                .nt-nearby-gate-copy h2 em {
                    color: var(--nt-orange, #f97316);
                    font-style: normal;
                }

                .nt-nearby-hero p {
                    max-width: 450px;
                    margin: 18px 0 0;
                    color: var(--nt-muted, #707070);
                    font-size: 12px;
                    line-height: 1.7;
                }

                .nt-nearby-radar {
                    position: relative;
                    z-index: 2;
                    width: 190px;
                    height: 190px;
                    flex: 0 0 auto;
                    display: grid;
                    place-items: center;
                }

                .nt-radar-ring {
                    position: absolute;
                    border: 1px solid rgba(249,115,22,.20);
                    border-radius: 50%;
                }

                .nt-radar-ring.ring-one { width: 70px; height: 70px; }
                .nt-radar-ring.ring-two { width: 125px; height: 125px; }
                .nt-radar-ring.ring-three { width: 180px; height: 180px; }

                .nt-radar-center {
                    width: 54px;
                    height: 54px;
                    display: grid;
                    place-items: center;
                    border-radius: 18px;
                    background: var(--nt-black, #111);
                    color: #fff;
                    box-shadow: 0 18px 35px rgba(17,17,17,.20);
                }

                .nt-nearby-location-gate,
                .nt-nearby-search-stage {
                    position: relative;
                    display: grid;
                    grid-template-columns: 230px minmax(0, 1fr);
                    align-items: center;
                    gap: 42px;
                    margin-top: 22px;
                    padding: 38px 42px;
                    border: 1px solid rgba(17,17,17,.07);
                    border-radius: 28px;
                    background: rgba(255,255,255,.91);
                    box-shadow: 0 20px 65px rgba(17,17,17,.065);
                    backdrop-filter: blur(18px);
                }

                .nt-nearby-location-gate {
                    grid-template-columns: 190px minmax(0, 1fr);
                }

                .nt-nearby-gate-orbit {
                    position: relative;
                    width: 175px;
                    height: 175px;
                    display: grid;
                    place-items: center;
                    margin: auto;
                }

                .nt-nearby-gate-orbit > span {
                    position: absolute;
                    border: 1px solid rgba(249,115,22,.17);
                    border-radius: 50%;
                }

                .nt-nearby-gate-orbit > span:nth-child(1) { width: 72px; height: 72px; }
                .nt-nearby-gate-orbit > span:nth-child(2) { width: 120px; height: 120px; }
                .nt-nearby-gate-orbit > span:nth-child(3) { width: 170px; height: 170px; }

                .nt-nearby-gate-orbit::before {
                    content: "";
                    position: absolute;
                    width: 9px;
                    height: 9px;
                    top: 19px;
                    right: 28px;
                    border-radius: 50%;
                    background: var(--nt-orange, #f97316);
                    box-shadow: 0 0 0 8px rgba(249,115,22,.08);
                }

                .nt-nearby-gate-orbit > div {
                    position: relative;
                    z-index: 2;
                    width: 62px;
                    height: 62px;
                    display: grid;
                    place-items: center;
                    border-radius: 21px;
                    background: #111;
                    color: #fff;
                    box-shadow: 0 18px 38px rgba(17,17,17,.20);
                }

                .nt-nearby-gate-copy { max-width: 670px; }

                .nt-nearby-gate-copy h2,
                .nt-nearby-search-stage h2 {
                    margin: 0;
                    font-family: Manrope, sans-serif;
                    font-size: clamp(28px, 4vw, 44px);
                    line-height: 1;
                    letter-spacing: -.055em;
                    font-weight: 900;
                }

                .nt-nearby-gate-copy p,
                .nt-nearby-search-stage-top p {
                    max-width: 590px;
                    margin: 13px 0 0;
                    color: var(--nt-muted, #707070);
                    font-size: 11px;
                    line-height: 1.7;
                }

                .nt-nearby-gate-button {
                    min-height: 51px;
                    display: inline-flex;
                    align-items: center;
                    gap: 9px;
                    margin-top: 22px;
                    padding: 0 18px;
                    border: 0;
                    border-radius: 15px;
                    background: #111;
                    color: #fff;
                    font-family: Manrope, sans-serif;
                    font-size: 10px;
                    font-weight: 850;
                    cursor: pointer;
                    box-shadow: 0 14px 30px rgba(17,17,17,.14);
                    transition: .22s ease;
                }

                .nt-nearby-gate-button:hover:not(:disabled) {
                    transform: translateY(-2px);
                    background: var(--nt-orange, #f97316);
                    box-shadow: 0 15px 32px rgba(249,115,22,.18);
                }

                .nt-nearby-gate-button:disabled { opacity: .65; cursor: wait; }

                .nt-nearby-gate-secondary,
                .nt-nearby-see-all,
                .nt-nearby-back-to-search {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    color: #111;
                    font-size: 9px;
                    font-weight: 850;
                    text-decoration: none;
                    cursor: pointer;
                }

                .nt-nearby-gate-secondary { margin: 15px 0 0 5px; color: var(--nt-muted, #707070); }
                .nt-nearby-gate-secondary:hover, .nt-nearby-see-all:hover { color: var(--nt-orange, #f97316); }

                .nt-nearby-gate-error {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 15px;
                    padding: 11px 13px;
                    border: 1px solid rgba(249,115,22,.16);
                    border-radius: 13px;
                    background: rgba(249,115,22,.06);
                    color: var(--nt-orange, #f97316);
                    font-size: 9px;
                    line-height: 1.5;
                }

                .nt-nearby-search-stage {
                    display: block;
                    padding: 34px 38px 30px;
                }

                .nt-nearby-search-stage-top {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 25px;
                }

                .nt-nearby-location-confirmed {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    padding: 9px 11px;
                    border: 1px solid rgba(25,135,84,.12);
                    border-radius: 999px;
                    background: #f1fbf5;
                    color: #198754;
                    font-size: 8px;
                    font-weight: 850;
                    white-space: nowrap;
                }

                .nt-nearby-live-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #198754;
                    box-shadow: 0 0 0 5px rgba(25,135,84,.08);
                }

                .nt-nearby-search-form {
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    min-height: 61px;
                    margin-top: 25px;
                    padding: 6px 7px 6px 18px;
                    border: 1px solid rgba(17,17,17,.09);
                    border-radius: 17px;
                    background: #faf9f6;
                    transition: border-color .2s ease, box-shadow .2s ease;
                }

                .nt-nearby-search-form:focus-within {
                    border-color: rgba(249,115,22,.35);
                    box-shadow: 0 0 0 4px rgba(249,115,22,.06);
                }

                .nt-nearby-search-form > svg { color: var(--nt-orange, #f97316); flex: 0 0 auto; }

                .nt-nearby-search-form input {
                    min-width: 0;
                    flex: 1;
                    border: 0;
                    outline: 0;
                    background: transparent;
                    color: #111;
                    font-size: 11px;
                }

                .nt-nearby-search-form input::placeholder { color: #9b9b9b; }

                .nt-nearby-search-form button {
                    min-height: 47px;
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    padding: 0 16px;
                    border: 0;
                    border-radius: 13px;
                    background: var(--nt-orange, #f97316);
                    color: #fff;
                    font-size: 9px;
                    font-weight: 900;
                    cursor: pointer;
                    white-space: nowrap;
                }

                .nt-nearby-search-suggestions { margin-top: 17px; }
                .nt-nearby-search-suggestions > span {
                    display: block;
                    margin-bottom: 9px;
                    color: #969696;
                    font-size: 8px;
                    font-weight: 850;
                    text-transform: uppercase;
                    letter-spacing: .12em;
                }

                .nt-nearby-search-suggestions > div {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 7px;
                }

                .nt-nearby-search-suggestions button {
                    min-height: 33px;
                    padding: 0 12px;
                    border: 1px solid rgba(17,17,17,.08);
                    border-radius: 999px;
                    background: #fff;
                    color: #555;
                    font-size: 8px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: .18s ease;
                }

                .nt-nearby-search-suggestions button:hover {
                    border-color: rgba(249,115,22,.25);
                    color: var(--nt-orange, #f97316);
                    transform: translateY(-1px);
                }

                .nt-nearby-see-all {
                    margin-top: 18px;
                    padding: 0;
                    border: 0;
                    background: none;
                }

                .nt-nearby-back-to-search {
                    margin: 22px 0 0;
                    padding: 0;
                    border: 0;
                    background: none;
                    color: var(--nt-muted, #707070);
                }

                .nt-nearby-back-to-search:hover { color: var(--nt-orange, #f97316); }

                @media (max-width: 760px) {
                    .nt-nearby-page { padding: 20px 12px 100px; }
                    .nt-nearby-hero { min-height: 300px; padding: 30px 24px; border-radius: 25px; }
                    .nt-nearby-hero h1 { font-size: clamp(39px, 12vw, 57px); }
                    .nt-nearby-hero p { font-size: 10px; }
                    .nt-nearby-radar { position: absolute; right: -38px; bottom: -42px; transform: scale(.72); opacity: .75; }
                    .nt-nearby-location-gate, .nt-nearby-search-stage { display: block; padding: 26px 20px; border-radius: 22px; }
                    .nt-nearby-gate-orbit { margin: 0 auto 24px; transform: scale(.78); }
                    .nt-nearby-gate-copy h2, .nt-nearby-search-stage h2 { font-size: 29px; }
                    .nt-nearby-search-stage-top { display: block; }
                    .nt-nearby-location-confirmed { margin-top: 15px; }
                    .nt-nearby-search-form { min-height: 55px; padding-left: 13px; }
                    .nt-nearby-search-form button { min-height: 43px; padding: 0 12px; }
                    .nt-nearby-search-form input { font-size: 10px; }
                }
            `}</style>
            <main className="nt-nearby-page">
                <div className="nt-nearby-container">

                    {/* HERO */}

                    <section className="nt-nearby-hero">
                        <div className="nt-nearby-hero-copy">
                            <div className="nt-nearby-eyebrow">
                                <Compass
                                    size={
                                        13
                                    }
                                />

                                AROUND YOU
                            </div>

                            <h1>
                                Nice things,
                                <br />

                                <em>
                                    right nearby.
                                </em>
                            </h1>

                            <p>
                                Discover places
                                worth exploring
                                around your
                                current
                                location.
                            </p>
                        </div>

                        <motion.div
                            className="nt-nearby-radar"
                            animate={{
                                scale: [
                                    1,
                                    1.035,
                                    1,
                                ],
                            }}
                            transition={{
                                duration: 3,
                                repeat:
                                    Infinity,
                                ease:
                                    "easeInOut",
                            }}
                        >
                            <div className="nt-radar-ring ring-one" />
                            <div className="nt-radar-ring ring-two" />
                            <div className="nt-radar-ring ring-three" />

                            <div className="nt-radar-center">
                                <Navigation
                                    size={
                                        20
                                    }
                                />
                            </div>
                        </motion.div>
                    </section>

                    {/* LOCATION PANEL */}

                    <section className="nt-location-panel">
                        <div className="nt-location-status">
                            <div
                                className={[
                                    "nt-location-icon",
                                    locationState,
                                ].join(
                                    " "
                                )}
                            >
                                {locationState ===
                                    "loading" ? (
                                    <RefreshCw
                                        size={
                                            17
                                        }
                                        className="nt-spin"
                                    />
                                ) : (
                                    <Crosshair
                                        size={
                                            18
                                        }
                                    />
                                )}
                            </div>

                            <div>
                                <strong>
                                    {locationState ===
                                        "success"
                                        ? "Your location"
                                        : locationState ===
                                            "loading"
                                            ? "Finding you"
                                            : "Location unavailable"}
                                </strong>

                                <span>
                                    {locationMessage ||
                                        "Allow location access to discover places near you."}
                                </span>
                            </div>
                        </div>

                        {locationState !==
                            "success" && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        void requestLocation()
                                    }
                                    disabled={
                                        locationState ===
                                        "loading"
                                    }
                                    className="nt-location-action"
                                >
                                    {locationState ===
                                        "loading"
                                        ? "Locating..."
                                        : "Use my location"}
                                </button>
                            )}

                        {locationState ===
                            "success" && (
                                <div className="nt-radius-wrapper">
                                    <button
                                        type="button"
                                        className="nt-radius-button"
                                        onClick={() =>
                                            setShowRadius(
                                                (
                                                    current
                                                ) =>
                                                    !current
                                            )
                                        }
                                    >
                                        Within{" "}
                                        <strong>
                                            {radius}{" "}
                                            km
                                        </strong>

                                        <ArrowRight
                                            size={
                                                14
                                            }
                                        />
                                    </button>

                                    <AnimatePresence>
                                        {showRadius && (
                                            <motion.div
                                                className="nt-radius-menu"
                                                initial={{
                                                    opacity: 0,
                                                    y: -5,
                                                }}
                                                animate={{
                                                    opacity: 1,
                                                    y: 0,
                                                }}
                                                exit={{
                                                    opacity: 0,
                                                    y: -5,
                                                }}
                                            >
                                                {RADIUS_OPTIONS.map(
                                                    (
                                                        option
                                                    ) => (
                                                        <button
                                                            key={
                                                                option.value
                                                            }
                                                            type="button"
                                                            className={
                                                                radius ===
                                                                    option.value
                                                                    ? "selected"
                                                                    : ""
                                                            }
                                                            onClick={() => {
                                                                setRadius(
                                                                    option.value
                                                                );

                                                                setShowRadius(
                                                                    false
                                                                );
                                                            }}
                                                        >
                                                            {
                                                                option.label
                                                            }

                                                            {radius ===
                                                                option.value && (
                                                                    <Check
                                                                        size={
                                                                            14
                                                                        }
                                                                    />
                                                                )}
                                                        </button>
                                                    )
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                    </section>

                    {/* LOCATION SUCCESS EXPERIENCE */}

                    {locationState ===
                        "success" &&
                        discoveryStarted && (
                            <>
                                {/* SEARCH TOOLS */}

                                <section className="nt-nearby-tools">
                                    <div className="nt-nearby-search">
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
                                            placeholder="Search nearby places..."
                                            aria-label="Search nearby places"
                                        />
                                    </div>

                                    <div className="nt-nearby-categories">
                                        {categories.map(
                                            (
                                                item
                                            ) => (
                                                <button
                                                    key={
                                                        item
                                                    }
                                                    type="button"
                                                    className={
                                                        selectedCategory.toLowerCase() ===
                                                            item.toLowerCase()
                                                            ? "active"
                                                            : ""
                                                    }
                                                    onClick={() => {
                                                        setSelectedCategory(
                                                            item
                                                        );

                                                        setSelectedSpotId(
                                                            null
                                                        );
                                                    }}
                                                >
                                                    {item ===
                                                        "all"
                                                        ? "All"
                                                        : formatCategory(
                                                            item
                                                        )}
                                                </button>
                                            )
                                        )}
                                    </div>
                                </section>

                                {/* MAP */}

                                <section className="nt-nearby-map-section">
                                    <div className="nt-nearby-map-heading">
                                        <div>
                                            <span>
                                                EXPLORE THE MAP
                                            </span>

                                            <h2>
                                                Discover around
                                                you
                                            </h2>
                                        </div>

                                        <p>
                                            Tap a place to
                                            explore it.
                                        </p>
                                    </div>

                                    <NearbyMap
                                        latitude={
                                            location.latitude
                                        }
                                        longitude={
                                            location.longitude
                                        }
                                        accuracy={
                                            location.accuracy
                                        }
                                        radiusKm={
                                            radius
                                        }
                                        spots={filteredSpots
                                            .filter(
                                                (
                                                    spot
                                                ) =>
                                                    typeof spot.latitude ===
                                                    "number" &&
                                                    typeof spot.longitude ===
                                                    "number"
                                            )
                                            .map(
                                                (
                                                    spot
                                                ) => ({
                                                    id:
                                                        spot.id,

                                                    name:
                                                        spot.name,

                                                    slug:
                                                        spot.slug,

                                                    latitude:
                                                        spot.latitude as number,

                                                    longitude:
                                                        spot.longitude as number,

                                                    category:
                                                        spot.category,

                                                    rating:
                                                        spot.rating,

                                                    review_count:
                                                        spot.review_count,

                                                    distanceKm:
                                                        spot.distanceKm,
                                                })
                                            )}
                                        selectedSpotId={
                                            selectedSpotId
                                        }
                                        onSelectSpot={(
                                            spot
                                        ) => {
                                            setSelectedSpotId(
                                                spot.id
                                            );
                                        }}
                                    />

                                    {/* SELECTED PLACE */}

                                    <AnimatePresence>
                                        {selectedSpot && (
                                            <motion.div
                                                className="nt-nearby-selected-place"
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
                                                transition={{
                                                    duration:
                                                        0.25,
                                                }}
                                            >
                                                <div>
                                                    <span>
                                                        {formatCategory(
                                                            selectedSpot.category
                                                        )}
                                                    </span>

                                                    <h3>
                                                        {
                                                            selectedSpot.name
                                                        }
                                                    </h3>

                                                    <p>
                                                        {formatDistance(
                                                            selectedSpot.distanceKm
                                                        )}{" "}
                                                        away
                                                    </p>
                                                </div>

                                                <div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setSelectedSpotId(
                                                                null
                                                            )
                                                        }
                                                    >
                                                        Close
                                                    </button>

                                                    <Link
                                                        href={`/spots/${encodeURIComponent(
                                                            selectedSpot.slug ??
                                                            selectedSpot.id
                                                        )}`}
                                                    >
                                                        View place

                                                        <ArrowRight
                                                            size={
                                                                14
                                                            }
                                                        />
                                                    </Link>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </section>

                                {/* RESULTS */}

                                <section className="nt-nearby-results">
                                    <div className="nt-nearby-results-head">
                                        <div>
                                            <span>
                                                NEARBY
                                            </span>

                                            <h2>
                                                Places around
                                                you
                                            </h2>
                                        </div>

                                        {!loadingSpots && (
                                            <p>
                                                {
                                                    filteredSpots.length
                                                }{" "}
                                                {filteredSpots.length ===
                                                    1
                                                    ? "place"
                                                    : "places"}
                                            </p>
                                        )}
                                    </div>

                                    {error ? (
                                        <div className="nt-nearby-error">
                                            <div>
                                                <RefreshCw
                                                    size={
                                                        20
                                                    }
                                                />
                                            </div>

                                            <h3>
                                                Couldn't load
                                                nearby places
                                            </h3>

                                            <p>
                                                {
                                                    error
                                                }
                                            </p>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    location &&
                                                    void loadNearbySpots(
                                                        location
                                                    )
                                                }
                                            >
                                                Try again
                                            </button>
                                        </div>
                                    ) : loadingSpots ? (
                                        <NearbySkeleton />
                                    ) : filteredSpots.length ===
                                        0 ? (
                                        <NearbyEmpty
                                            radius={
                                                radius
                                            }
                                            reset={() => {
                                                setSearch(
                                                    ""
                                                );

                                                setSelectedCategory(
                                                    "all"
                                                );

                                                setSelectedSpotId(
                                                    null
                                                );

                                                setRadius(
                                                    25
                                                );
                                            }}
                                        />
                                    ) : (
                                        <div className="nt-nearby-grid">
                                            <AnimatePresence
                                                mode="popLayout"
                                            >
                                                {filteredSpots.map(
                                                    (
                                                        spot,
                                                        index
                                                    ) => (
                                                        <NearbyCard
                                                            key={
                                                                spot.id
                                                            }
                                                            spot={
                                                                spot
                                                            }
                                                            saved={savedIds.has(
                                                                spot.id
                                                            )}
                                                            selected={
                                                                selectedSpotId ===
                                                                spot.id
                                                            }
                                                            index={
                                                                index
                                                            }
                                                            toggleSaved={
                                                                toggleSaved
                                                            }
                                                            directions={
                                                                openDirections
                                                            }
                                                            onSelect={() =>
                                                                setSelectedSpotId(
                                                                    spot.id
                                                                )
                                                            }
                                                        />
                                                    )
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </section>
                            </>
                        )}

                    {/* LOCATION / DISCOVERY GATE */}

                    {locationState !== "success" && (
                        <motion.section
                            className="nt-nearby-location-gate"
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="nt-nearby-gate-orbit" aria-hidden="true">
                                <span />
                                <span />
                                <span />
                                <div>
                                    <Navigation size={25} />
                                </div>
                            </div>

                            <div className="nt-nearby-gate-copy">
                                <span className="nt-nearby-gate-eyebrow">
                                    {locationState === "error" ? "LOCATION NEEDED" : "START HERE"}
                                </span>

                                <h2>
                                    Find something nice
                                    <br />
                                    <em>near you.</em>
                                </h2>

                                <p>
                                    Let NiceThings use your current location.
                                    We&apos;ll then help you choose what you&apos;re looking for before showing the map.
                                </p>

                                {locationState === "error" && (
                                    <div className="nt-nearby-gate-error">
                                        <MapPin size={14} />
                                        <span>{locationMessage}</span>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    className="nt-nearby-gate-button"
                                    onClick={() => void requestLocation()}
                                    disabled={locationState === "loading"}
                                >
                                    {locationState === "loading" ? (
                                        <>
                                            <RefreshCw size={17} className="nt-spin" />
                                            Finding your location…
                                        </>
                                    ) : (
                                        <>
                                            <Navigation size={17} />
                                            Use my current location
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>

                                <Link
                                    href="/search"
                                    className="nt-nearby-gate-secondary"
                                >
                                    Explore an area instead
                                    <ArrowRight size={14} />
                                </Link>
                            </div>
                        </motion.section>
                    )}

                    {locationState === "success" && !discoveryStarted && (
                        <motion.section
                            className="nt-nearby-search-stage"
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="nt-nearby-search-stage-top">
                                <div>
                                    <span className="nt-nearby-gate-eyebrow">LOCATION FOUND</span>
                                    <h2>What are you in the mood for?</h2>
                                    <p>Search nearby, choose a category, and we&apos;ll open your discovery map.</p>
                                </div>

                                <div className="nt-nearby-location-confirmed">
                                    <span className="nt-nearby-live-dot" />
                                    Location ready
                                </div>
                            </div>

                            <form
                                className="nt-nearby-search-form"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    setDiscoveryStarted(true);
                                    setSelectedSpotId(null);
                                }}
                            >
                                <Search size={19} />
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Try restaurants, cafés, grills…"
                                    aria-label="Search nearby places"
                                />
                                <button type="submit">
                                    Discover
                                    <ArrowRight size={16} />
                                </button>
                            </form>

                            <div className="nt-nearby-search-suggestions">
                                <span>Popular nearby</span>
                                <div>
                                    {categories.filter((item) => item !== "all").slice(0, 6).map((item) => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => {
                                                setSelectedCategory(item);
                                                setSearch(item);
                                                setDiscoveryStarted(true);
                                                setSelectedSpotId(null);
                                            }}
                                        >
                                            {formatCategory(item)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="button"
                                className="nt-nearby-see-all"
                                onClick={() => {
                                    setSearch("");
                                    setSelectedCategory("all");
                                    setDiscoveryStarted(true);
                                }}
                            >
                                See everything nearby
                                <ArrowRight size={14} />
                            </button>
                        </motion.section>
                    )}

                    {locationState === "success" && discoveryStarted && (
                        <motion.button
                            type="button"
                            className="nt-nearby-back-to-search"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={() => setDiscoveryStarted(false)}
                        >
                            ← Change what you&apos;re looking for
                        </motion.button>
                    )}
                </div>
            </main>
        </>
    );
}

/*
 * ==================================================
 * NEARBY CARD
 * ==================================================
 */

function NearbyCard({
    spot,
    saved,
    selected,
    index,
    toggleSaved,
    directions,
    onSelect,
}: {
    spot: NearbySpot;
    saved: boolean;
    selected: boolean;
    index: number;
    toggleSaved: (
        id: string
    ) => void;
    directions: (
        spot: NearbySpot
    ) => void;
    onSelect: () => void;
}) {
    const href =
        `/spots/${encodeURIComponent(
            spot.slug ??
            spot.id
        )}`;

    return (
        <motion.article
            className={[
                "nt-nearby-card",
                selected
                    ? "selected"
                    : "",
            ].join(
                " "
            )}
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
                y: 18,
            }}
            transition={{
                duration: 0.3,
                delay: Math.min(
                    index *
                    0.04,
                    0.25
                ),
            }}
            onClick={onSelect}
        >
            <div className="nt-nearby-card-image">
                <Link
                    href={href}
                    onClick={(event) =>
                        event.stopPropagation()
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
                        />
                    ) : (
                        <div className="nt-nearby-image-placeholder">
                            <MapPin
                                size={
                                    25
                                }
                            />
                        </div>
                    )}

                    <div className="nt-nearby-image-overlay" />
                </Link>

                <button
                    type="button"
                    className={[
                        "nt-nearby-save",
                        saved
                            ? "saved"
                            : "",
                    ]
                        .filter(
                            Boolean
                        )
                        .join(
                            " "
                        )}
                    onClick={(event) => {
                        event.stopPropagation();

                        toggleSaved(
                            spot.id
                        );
                    }}
                    aria-label={
                        saved
                            ? "Remove from saved"
                            : "Save place"
                    }
                >
                    <Heart
                        size={
                            17
                        }
                        fill={
                            saved
                                ? "currentColor"
                                : "none"
                        }
                    />
                </button>

                <span className="nt-distance-badge">
                    <Navigation
                        size={
                            11
                        }
                    />

                    {formatDistance(
                        spot.distanceKm
                    )}
                </span>
            </div>

            <div className="nt-nearby-card-content">
                <div className="nt-nearby-card-label">
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

                <Link
                    href={href}
                    onClick={(event) =>
                        event.stopPropagation()
                    }
                >
                    <h3>
                        {
                            spot.name
                        }
                    </h3>
                </Link>

                <div className="nt-nearby-card-location">
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

                <div className="nt-nearby-card-bottom">
                    <span>
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

                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();

                            directions(
                                spot
                            );
                        }}
                    >
                        <Navigation
                            size={
                                12
                            }
                        />

                        Directions
                    </button>
                </div>
            </div>
        </motion.article>
    );
}

/*
 * ==================================================
 * SKELETON
 * ==================================================
 */

function NearbySkeleton() {
    return (
        <div className="nt-nearby-grid">
            {Array.from({
                length: 6,
            }).map(
                (
                    _,
                    index
                ) => (
                    <div
                        key={
                            index
                        }
                        className="nt-nearby-skeleton"
                    >
                        <div className="nt-nearby-skeleton-image" />

                        <div className="nt-nearby-skeleton-lines">
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

/*
 * ==================================================
 * EMPTY STATE
 * ==================================================
 */

function NearbyEmpty({
    radius,
    reset,
}: {
    radius: number;
    reset: () => void;
}) {
    return (
        <motion.div
            className="nt-nearby-empty"
            initial={{
                opacity: 0,
                y: 12,
            }}
            animate={{
                opacity: 1,
                y: 0,
            }}
        >
            <div>
                <Compass
                    size={
                        24
                    }
                />
            </div>

            <h3>
                Nothing nearby yet
            </h3>

            <p>
                We couldn't find approved
                places within{" "}
                {radius} km of your
                location.
            </p>

            <button
                type="button"
                onClick={
                    reset
                }
            >
                Expand my search

                <ArrowRight
                    size={
                        14
                    }
                />
            </button>
        </motion.div>
    );
}

/*
 * ==================================================
 * CATEGORY FORMATTER
 * ==================================================
 */

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
            (
                letter
            ) =>
                letter.toUpperCase()
        );
}