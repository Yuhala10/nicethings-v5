/* =========================================================
   SEARCH PAGE — COMPLETE REPLACEMENT
   NiceThings premium discovery experience
========================================================= */

"use client";

import {
    Suspense,
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
    ArrowDownUp,
    Check,
    ChevronDown,
    Crosshair,
    Heart,
    MapPin,
    Navigation,
    Search,
    SlidersHorizontal,
    Star,
    X,
} from "lucide-react";

import Link from "next/link";
import dynamic from "next/dynamic";

import {
    usePathname,
    useRouter,
    useSearchParams,
} from "next/navigation";

import {
    getSupabaseBrowserClient,
} from "../../lib/supabase/client";

import {
    getCurrentLocation,
    isUsableLocation,
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
    hasLocationConsent,
} from "../../lib/consent";

import {
    resolveSpotLocation,
    type ResolvedSpotLocation,
} from "../../lib/location/resolver";

const NearbyMap = dynamic(
    () => import("../../components/maps/NearbyMap"),
    {
        ssr: false,
        loading: () => (
            <div className="nt-map-loading" aria-label="Loading map">
                <span className="nt-map-loading-dot" />
                <span>Loading map…</span>
            </div>
        ),
    }
);

const SpotMap = dynamic(
    () => import("../../components/maps/SpotMap"),
    {
        ssr: false,
        loading: () => (
            <div className="nt-map-loading" aria-label="Loading place map">
                <span className="nt-map-loading-dot" />
                <span>Preparing place map…</span>
            </div>
        ),
    }
);

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
    phone?: string | null;
    whatsapp?: string | null;
    website?: string | null;
    rating?: number | null;
    review_count?: number | null;
    verified?: boolean | null;
    featured?: boolean | null;
    minimum_price?: number | null;
    maximum_price?: number | null;
    average_price?: number | null;
    currency?: string | null;
    opening_time?: string | null;
    closing_time?: string | null;
    status?: string | null;
};

type Photo = {
    id: string;
    spot_id: string;
    image_url: string;
    alt_text?: string | null;
    sort_order?: number | null;
};

type SpotWithPhoto = Spot & {
    coverImage: string | null;
    distanceKm?: number;
};

type SortOption =
    | "recommended"
    | "rating"
    | "reviews"
    | "price_low"
    | "price_high";

type DiscoveryMode =
    | "search"
    | "nearby"
    | "area";

const CATEGORIES = [
    "Restaurant",
    "Cafe",
    "Bar",
    "Hotel",
    "Bakery",
    "Shopping",
    "Beauty",
    "Entertainment",
    "Wellness",
    "Other",
];

const CITIES = [
    "Douala",
    "Yaoundé",
    "Buea",
    "Limbe",
    "Bamenda",
    "Bafoussam",
    "Kribi",
];

const PRICE_OPTIONS = [
    { label: "Any price", value: "any" },
    { label: "Budget", value: "budget" },
    { label: "Mid-range", value: "mid" },
    { label: "Premium", value: "premium" },
];

function SearchPageContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const supabase = useMemo(
        () => getSupabaseBrowserClient() as any,
        []
    );

    const [discoveryMode, setDiscoveryMode] =
        useState<DiscoveryMode>("search");

    const [userLocation, setUserLocation] =
        useState<UserLocation | null>(null);

    const [locationLoading, setLocationLoading] =
        useState(false);

    const [locationError, setLocationError] =
        useState<string | null>(null);

    const [nearbyRadius, setNearbyRadius] =
        useState(10);

    const [showMap, setShowMap] =
        useState(false);

    const [selectedSpotId, setSelectedSpotId] =
        useState<string | null>(null);

    const [mapSpot, setMapSpot] =
        useState<{
            spot: SpotWithPhoto;
            location: ResolvedSpotLocation;
            userLocation: UserLocation | null;
        } | null>(null);

    const [mapSpotLoading, setMapSpotLoading] =
        useState(false);

    const [mapSpotError, setMapSpotError] =
        useState<string | null>(null);

    const initialQuery =
        searchParams.get("q") ?? "";

    const initialCategory =
        searchParams.get("category") ?? "all";

    const initialCity =
        searchParams.get("city") ?? "all";

    const initialPrice =
        searchParams.get("price") ?? "any";

    const initialVerified =
        searchParams.get("verified") === "true";

    const initialSortParam =
        searchParams.get("sort");

    const initialSort: SortOption =
        initialSortParam === "rating" ||
            initialSortParam === "reviews" ||
            initialSortParam === "price_low" ||
            initialSortParam === "price_high"
            ? initialSortParam
            : "recommended";

    const [searchInput, setSearchInput] =
        useState(initialQuery);

    const [query, setQuery] =
        useState(initialQuery);

    const [category, setCategory] =
        useState(initialCategory);

    const [city, setCity] =
        useState(initialCity);

    const [price, setPrice] =
        useState(initialPrice);

    const [verifiedOnly, setVerifiedOnly] =
        useState(initialVerified);

    const [sort, setSort] =
        useState<SortOption>(initialSort);

    const [spots, setSpots] =
        useState<SpotWithPhoto[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [loadingMore, setLoadingMore] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const [savedIds, setSavedIds] =
        useState<Set<string>>(new Set());

    const [showFilters, setShowFilters] =
        useState(false);

    const [showSort, setShowSort] =
        useState(false);

    const [visibleCount, setVisibleCount] =
        useState(12);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setQuery(searchInput.trim());
        }, 300);

        return () => window.clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        const params = new URLSearchParams();

        if (query) params.set("q", query);
        if (category !== "all") {
            params.set("category", category);
        }
        if (city !== "all") {
            params.set("city", city);
        }
        if (price !== "any") {
            params.set("price", price);
        }
        if (verifiedOnly) {
            params.set("verified", "true");
        }
        if (sort !== "recommended") {
            params.set("sort", sort);
        }

        const next = params.toString();

        router.replace(
            next ? `${pathname}?${next}` : pathname,
            { scroll: false }
        );
    }, [
        query,
        category,
        city,
        price,
        verifiedOnly,
        sort,
        pathname,
        router,
    ]);

    const loadSavedSpots = useCallback(
        async () => {
            try {
                const visitorId =
                    window.localStorage.getItem(
                        "nt_visitor_id"
                    );

                if (!visitorId) return;

                const { data, error } =
                    await supabase
                        .from("nt_saved_spots")
                        .select("spot_id")
                        .eq(
                            "visitor_id",
                            visitorId
                        );

                if (error) {
                    console.warn(
                        "Saved spots:",
                        error
                    );
                    return;
                }

                setSavedIds(
                    new Set(
                        (data ?? []).map(
                            (item: {
                                spot_id: string;
                            }) => item.spot_id
                        )
                    )
                );
            } catch (savedError) {
                console.warn(
                    "Could not load saved spots:",
                    savedError
                );
            }
        },
        [supabase]
    );

    useEffect(() => {
        void loadSavedSpots();
    }, [loadSavedSpots]);

    async function requestUserLocation() {
        setLocationError(null);
        setLocationLoading(true);

        try {
            if (!hasLocationConsent()) {
                grantLocationConsent();
            }

            const location =
                await getCurrentLocation({
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 20_000,
                });

            if (
                !isUsableLocation(
                    location,
                    250
                )
            ) {
                throw new LocationError(
                    "Your location is not accurate enough yet. Please try again from an open area.",
                    "POSITION_UNAVAILABLE"
                );
            }

            setUserLocation(location);
            setDiscoveryMode("nearby");
            setShowMap(false);
            setSelectedSpotId(null);
        } catch (locationFailure) {
            console.error(
                "NiceThings location error:",
                locationFailure
            );

            if (
                locationFailure instanceof
                LocationError
            ) {
                switch (
                locationFailure.code
                ) {
                    case "PERMISSION_DENIED":
                        setLocationError(
                            "Location access was denied. Allow location access in your browser settings to discover places around you."
                        );
                        break;
                    case "TIMEOUT":
                        setLocationError(
                            "We couldn't get a precise location in time. Please try again."
                        );
                        break;
                    default:
                        setLocationError(
                            locationFailure.message
                        );
                }
            } else {
                setLocationError(
                    "We couldn't determine your location. Please try again."
                );
            }
        } finally {
            setLocationLoading(false);
        }
    }

    const loadSpots = useCallback(
        async () => {
            setLoading(true);
            setError(null);

            try {
                let request =
                    supabase
                        .from("nt_spots")
                        .select("*")
                        .eq("status", "APPROVED");

                if (query) {
                    const safeQuery =
                        query
                            .replace(
                                /[%_]/g,
                                ""
                            )
                            .trim();

                    if (safeQuery) {
                        request =
                            request.or(
                                [
                                    `name.ilike.%${safeQuery}%`,
                                    `description.ilike.%${safeQuery}%`,
                                    `city.ilike.%${safeQuery}%`,
                                    `neighborhood.ilike.%${safeQuery}%`,
                                    `category.ilike.%${safeQuery}%`,
                                    `cuisine.ilike.%${safeQuery}%`,
                                ].join(",")
                            );
                    }
                }

                if (category !== "all") {
                    request =
                        request.ilike(
                            "category",
                            category
                        );
                }

                if (city !== "all") {
                    request =
                        request.ilike(
                            "city",
                            city
                        );
                }

                const {
                    data,
                    error: spotsError,
                } = await request;

                if (spotsError) {
                    throw spotsError;
                }

                let rows =
                    (data ?? []) as Spot[];

                rows = rows.filter(
                    (spot) =>
                        matchesPrice(
                            spot,
                            price
                        )
                );

                if (verifiedOnly) {
                    rows = rows.filter(
                        (spot) =>
                            spot.verified ===
                            true
                    );
                }

                const ids = rows.map(
                    (spot) => spot.id
                );

                const photoMap =
                    new Map<string, string>();

                if (ids.length) {
                    const {
                        data: photoData,
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
                                ascending: true,
                            }
                        );

                    for (
                        const photo of
                        (photoData ??
                            []) as Photo[]
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
                }

                let combined =
                    rows.map((spot) => ({
                        ...spot,
                        coverImage:
                            photoMap.get(
                                spot.id
                            ) ?? null,
                    }));

                if (
                    discoveryMode ===
                    "nearby" &&
                    userLocation
                ) {
                    combined =
                        findNearbySpots(
                            combined,
                            userLocation.latitude,
                            userLocation.longitude,
                            nearbyRadius
                        );
                }

                combined =
                    sortSpots(
                        combined,
                        sort
                    );

                setSpots(combined);
                setVisibleCount(12);
            } catch (loadError) {
                console.error(
                    "NiceThings search error:",
                    loadError
                );

                setError(
                    "We couldn't load places right now. Please try again."
                );

                setSpots([]);
            } finally {
                setLoading(false);
            }
        },
        [
            supabase,
            query,
            category,
            city,
            price,
            verifiedOnly,
            discoveryMode,
            userLocation,
            nearbyRadius,
            sort,
        ]
    );

    useEffect(() => {
        void loadSpots();
    }, [loadSpots]);

    async function toggleSaved(
        spotId: string
    ) {
        const visitorId =
            window.localStorage.getItem(
                "nt_visitor_id"
            );

        if (!visitorId) return;

        const wasSaved =
            savedIds.has(spotId);

        setSavedIds((current) => {
            const next =
                new Set(current);

            if (wasSaved) {
                next.delete(spotId);
            } else {
                next.add(spotId);
            }

            return next;
        });

        try {
            if (wasSaved) {
                const { error } =
                    await supabase
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

                if (error) throw error;
            } else {
                const { error } =
                    await supabase
                        .from(
                            "nt_saved_spots"
                        )
                        .insert({
                            visitor_id:
                                visitorId,
                            spot_id:
                                spotId,
                        });

                if (error) throw error;
            }
        } catch (saveError) {
            console.error(
                "NiceThings save error:",
                saveError
            );

            setSavedIds((current) => {
                const next =
                    new Set(current);

                if (wasSaved) {
                    next.add(spotId);
                } else {
                    next.delete(spotId);
                }

                return next;
            });
        }
    }

    function clearFilters() {
        setCategory("all");
        setCity("all");
        setPrice("any");
        setVerifiedOnly(false);
    }

    function clearSearch() {
        setSearchInput("");
        setQuery("");
    }

    function activateSearchMode() {
        setDiscoveryMode("search");
        setSelectedSpotId(null);
    }

    function activateAreaMode() {
        setDiscoveryMode("area");
        setSelectedSpotId(null);
    }

    async function activateNearbyMode() {
        if (!userLocation) {
            await requestUserLocation();
            return;
        }

        setDiscoveryMode("nearby");
        setSelectedSpotId(null);
    }

    async function viewSpotOnMap(
        spot: SpotWithPhoto
    ) {
        if (mapSpotLoading) {
            return;
        }

        setMapSpotLoading(true);
        setMapSpotError(null);
        setSelectedSpotId(spot.id);

        try {
            let locationForMap =
                userLocation;

            if (!locationForMap) {
                try {
                    if (!hasLocationConsent()) {
                        grantLocationConsent();
                    }

                    const current =
                        await getCurrentLocation({
                            enableHighAccuracy: true,
                            maximumAge: 30_000,
                            timeout: 12_000,
                        });

                    if (
                        isUsableLocation(
                            current,
                            500
                        )
                    ) {
                        locationForMap =
                            current;

                        setUserLocation(
                            current
                        );
                    }
                } catch (locationFailure) {
                    console.info(
                        "NiceThings map visitor location unavailable:",
                        locationFailure
                    );
                }
            }

            const resolved =
                await resolveSpotLocation(
                    spot,
                    locationForMap
                        ? {
                            latitude:
                                locationForMap.latitude,
                            longitude:
                                locationForMap.longitude,
                        }
                        : null
                );

            if (!resolved) {
                setMapSpot(null);
                setMapSpotError(
                    "We couldn't locate this place yet. Try again, or check the place details for more location information."
                );
                return;
            }

            setMapSpot({
                spot,
                location: resolved,
                userLocation:
                    locationForMap,
            });

            setShowMap(true);
        } catch (mapError) {
            console.error(
                "NiceThings place map error:",
                mapError
            );

            setMapSpot(null);
            setMapSpotError(
                "We couldn't prepare the map for this place right now. Please try again."
            );
        } finally {
            setMapSpotLoading(false);
        }
    }

    function closeSpotMap() {
        setShowMap(false);
        setMapSpot(null);
        setMapSpotError(null);
        setSelectedSpotId(null);
    }

    function handleSelectSpot(
        spotId: string
    ) {
        setSelectedSpotId(spotId);

        if (showMap) return;

        window.requestAnimationFrame(
            () => {
                const element =
                    document.querySelector(
                        `[data-spot-id="${spotId}"]`
                    );

                element?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }
        );
    }

    function handleRadiusChange(
        value: number
    ) {
        setNearbyRadius(value);
        setSelectedSpotId(null);

        if (
            discoveryMode !==
            "nearby"
        ) {
            setDiscoveryMode("nearby");
        }
    }

    const visibleSpots =
        useMemo(
            () =>
                spots.slice(
                    0,
                    visibleCount
                ),
            [spots, visibleCount]
        );

    const hasActiveFilters =
        category !== "all" ||
        city !== "all" ||
        price !== "any" ||
        verifiedOnly;

    const activeFilterCount =
        Number(category !== "all") +
        Number(city !== "all") +
        Number(price !== "any") +
        Number(verifiedOnly);

    function loadMore() {
        if (
            loadingMore ||
            visibleCount >=
            spots.length
        ) {
            return;
        }

        setLoadingMore(true);

        window.setTimeout(() => {
            setVisibleCount(
                (current) =>
                    Math.min(
                        current + 12,
                        spots.length
                    )
            );

            setLoadingMore(false);
        }, 250);
    }

    return (
        <main className="nt-search-page">
            <section className="nt-search-hero">
                <div className="nt-page-container">
                    <div className="nt-search-back">
                        <Link href="/">
                            ← Back home
                        </Link>
                    </div>

                    <div className="nt-search-heading">
                        <span className="nt-search-eyebrow">
                            <Search size={13} />
                            Discover
                        </span>

                        <h1>
                            Find somewhere
                            <span>
                                worth going.
                            </span>
                        </h1>

                        <p>
                            Search beautiful
                            places, discover
                            what's nearby, or
                            explore somewhere
                            completely new.
                        </p>
                    </div>

                    <form
                        className="nt-search-mainbar"
                        onSubmit={(event) => {
                            event.preventDefault();
                            setQuery(
                                searchInput.trim()
                            );
                            setDiscoveryMode(
                                "search"
                            );
                            setSelectedSpotId(
                                null
                            );
                        }}
                    >
                        <div className="nt-search-bar">
                            <div className="nt-search-icon">
                                <Search size={20} />
                            </div>

                            <input
                                value={
                                    searchInput
                                }
                                onChange={(
                                    event
                                ) =>
                                    setSearchInput(
                                        event.target
                                            .value
                                    )
                                }
                                placeholder="Restaurants, cafés, places, towns..."
                                className="nt-search-input"
                                aria-label="Search places"
                            />

                            {searchInput && (
                                <button
                                    type="button"
                                    className="nt-search-clear"
                                    onClick={
                                        clearSearch
                                    }
                                    aria-label="Clear search"
                                >
                                    <X size={16} />
                                </button>
                            )}

                            <button
                                type="submit"
                                className="nt-search-submit"
                                aria-label="Search"
                            >
                                <Search size={18} />
                            </button>
                        </div>
                    </form>

                    <div className="nt-discovery-modes">
                        <button
                            type="button"
                            className={
                                discoveryMode ===
                                    "search"
                                    ? "active"
                                    : ""
                            }
                            onClick={
                                activateSearchMode
                            }
                        >
                            <Search size={15} />
                            <span>Search</span>
                        </button>

                        <button
                            type="button"
                            className={
                                discoveryMode ===
                                    "nearby"
                                    ? "active"
                                    : ""
                            }
                            onClick={
                                activateNearbyMode
                            }
                            disabled={
                                locationLoading
                            }
                        >
                            <Crosshair size={15} />
                            <span>
                                {locationLoading
                                    ? "Finding..."
                                    : "Around me"}
                            </span>
                        </button>

                        <button
                            type="button"
                            className={
                                discoveryMode ===
                                    "area"
                                    ? "active"
                                    : ""
                            }
                            onClick={
                                activateAreaMode
                            }
                        >
                            <MapPin size={15} />
                            <span>
                                Explore an area
                            </span>
                        </button>
                    </div>

                    <AnimatePresence>
                        {locationError && (
                            <motion.div
                                initial={{
                                    opacity: 0,
                                    y: -6,
                                }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                }}
                                exit={{
                                    opacity: 0,
                                    y: -6,
                                }}
                                className="nt-location-message"
                            >
                                <MapPin size={15} />

                                <span>
                                    {
                                        locationError
                                    }
                                </span>

                                <button
                                    type="button"
                                    onClick={
                                        requestUserLocation
                                    }
                                >
                                    Try again
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </section>

            <section className="nt-search-content">
                <div className="nt-page-container">
                    <AnimatePresence>
                        {discoveryMode ===
                            "nearby" &&
                            userLocation && (
                                <motion.div
                                    initial={{
                                        opacity: 0,
                                        y: -10,
                                    }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                    }}
                                    className="nt-nearby-context"
                                >
                                    <div className="nt-nearby-context-main">
                                        <div className="nt-nearby-context-icon">
                                            <Crosshair
                                                size={
                                                    17
                                                }
                                            />
                                        </div>

                                        <div>
                                            <span>
                                                Around your
                                                current location
                                            </span>

                                            <strong>
                                                {
                                                    spots.length
                                                }{" "}
                                                {spots.length ===
                                                    1
                                                    ? "place"
                                                    : "places"}{" "}
                                                within{" "}
                                                {
                                                    nearbyRadius
                                                }
                                                km
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="nt-radius-selector">
                                        {[2, 5, 10, 25].map(
                                            (radius) => (
                                                <button
                                                    key={
                                                        radius
                                                    }
                                                    type="button"
                                                    className={
                                                        nearbyRadius ===
                                                            radius
                                                            ? "active"
                                                            : ""
                                                    }
                                                    onClick={() =>
                                                        handleRadiusChange(
                                                            radius
                                                        )
                                                    }
                                                >
                                                    {
                                                        radius
                                                    }
                                                    km
                                                </button>
                                            )
                                        )}
                                    </div>
                                </motion.div>
                            )}
                    </AnimatePresence>

                    {discoveryMode === "area" && (
                        <div className="nt-area-context">
                            <div>
                                <span>
                                    Exploring an area
                                </span>
                                <strong>
                                    Choose a town or
                                    city below
                                </strong>
                            </div>

                            <div className="nt-area-cities">
                                {CITIES.map(
                                    (item) => (
                                        <button
                                            key={
                                                item
                                            }
                                            type="button"
                                            className={
                                                city.toLowerCase() ===
                                                    item.toLowerCase()
                                                    ? "active"
                                                    : ""
                                            }
                                            onClick={() =>
                                                setCity(
                                                    item
                                                )
                                            }
                                        >
                                            <MapPin
                                                size={
                                                    13
                                                }
                                            />
                                            {item}
                                            {city.toLowerCase() ===
                                                item.toLowerCase() && (
                                                    <Check
                                                        size={
                                                            13
                                                        }
                                                    />
                                                )}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    )}

                    <div className="nt-search-toolbar">
                        <div className="nt-results-header">
                            <span>
                                {discoveryMode ===
                                    "nearby"
                                    ? "Nearby discovery"
                                    : discoveryMode ===
                                        "area"
                                        ? "Area discovery"
                                        : query
                                            ? `Results for “${query}”`
                                            : "Discover places"}
                            </span>

                            <strong>
                                {loading
                                    ? "Finding..."
                                    : `${spots.length} ${spots.length ===
                                        1
                                        ? "place"
                                        : "places"
                                    }`}
                            </strong>
                        </div>

                        <div className="nt-toolbar-actions">
                            <button
                                type="button"
                                className="nt-mobile-filter-trigger"
                                onClick={() =>
                                    setShowFilters(
                                        true
                                    )
                                }
                            >
                                <SlidersHorizontal
                                    size={15}
                                />
                                Filters
                                {activeFilterCount >
                                    0 && (
                                        <span>
                                            {
                                                activeFilterCount
                                            }
                                        </span>
                                    )}
                            </button>

                            <button
                                type="button"
                                className="nt-map-toggle"
                                onClick={() =>
                                    setShowMap(
                                        (current) =>
                                            !current
                                    )
                                }
                            >
                                {showMap
                                    ? "List"
                                    : "Map"}
                            </button>

                            <button
                                type="button"
                                className="nt-sort-trigger"
                                onClick={() =>
                                    setShowSort(
                                        (current) =>
                                            !current
                                    )
                                }
                            >
                                <ArrowDownUp size={14} />
                                {getSortLabel(sort)}
                                <ChevronDown size={14} />
                            </button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {showSort && (
                            <motion.div
                                initial={{
                                    opacity: 0,
                                    y: -6,
                                }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                }}
                                exit={{
                                    opacity: 0,
                                    y: -6,
                                }}
                                className="nt-sort-menu"
                            >
                                {(
                                    [
                                        [
                                            "recommended",
                                            "Recommended",
                                        ],
                                        [
                                            "rating",
                                            "Highest rated",
                                        ],
                                        [
                                            "reviews",
                                            "Most reviewed",
                                        ],
                                        [
                                            "price_low",
                                            "Lowest price",
                                        ],
                                        [
                                            "price_high",
                                            "Highest price",
                                        ],
                                    ] as [
                                        SortOption,
                                        string
                                    ][]
                                ).map(
                                    ([
                                        value,
                                        label,
                                    ]) => (
                                        <button
                                            key={
                                                value
                                            }
                                            type="button"
                                            className={
                                                sort ===
                                                    value
                                                    ? "active"
                                                    : ""
                                            }
                                            onClick={() => {
                                                setSort(
                                                    value
                                                );
                                                setShowSort(
                                                    false
                                                );
                                            }}
                                        >
                                            <span>
                                                {
                                                    label
                                                }
                                            </span>
                                            {sort ===
                                                value && (
                                                    <Check
                                                        size={
                                                            15
                                                        }
                                                    />
                                                )}
                                        </button>
                                    )
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {hasActiveFilters && (
                        <div className="nt-active-filters">
                            <span>Filters</span>

                            {category !== "all" && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCategory(
                                            "all"
                                        )
                                    }
                                >
                                    {category}
                                    <X size={12} />
                                </button>
                            )}

                            {city !== "all" && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCity(
                                            "all"
                                        )
                                    }
                                >
                                    {city}
                                    <X size={12} />
                                </button>
                            )}

                            {price !== "any" && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPrice(
                                            "any"
                                        )
                                    }
                                >
                                    {
                                        PRICE_OPTIONS.find(
                                            (
                                                option
                                            ) =>
                                                option.value ===
                                                price
                                        )?.label
                                    }
                                    <X size={12} />
                                </button>
                            )}

                            {verifiedOnly && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setVerifiedOnly(
                                            false
                                        )
                                    }
                                >
                                    Verified
                                    <X size={12} />
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={
                                    clearFilters
                                }
                                className="nt-clear-filters"
                            >
                                Clear all
                            </button>
                        </div>
                    )}

                    <div className="nt-search-layout">
                        <aside className="nt-search-filters">
                            <div className="nt-filter-header">
                                <div>
                                    <span>
                                        Refine
                                    </span>
                                    <strong>
                                        Find your fit
                                    </strong>
                                </div>

                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={
                                            clearFilters
                                        }
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>

                            <div className="nt-filter-group">
                                <label>
                                    Category
                                </label>

                                <select
                                    value={
                                        category
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setCategory(
                                            event.target
                                                .value
                                        )
                                    }
                                >
                                    <option value="all">
                                        All categories
                                    </option>

                                    {CATEGORIES.map(
                                        (item) => (
                                            <option
                                                key={
                                                    item
                                                }
                                                value={
                                                    item
                                                }
                                            >
                                                {
                                                    item
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div className="nt-filter-group">
                                <label>
                                    City
                                </label>

                                <select
                                    value={city}
                                    onChange={(
                                        event
                                    ) =>
                                        setCity(
                                            event.target
                                                .value
                                        )
                                    }
                                >
                                    <option value="all">
                                        All cities
                                    </option>

                                    {CITIES.map(
                                        (item) => (
                                            <option
                                                key={
                                                    item
                                                }
                                                value={
                                                    item
                                                }
                                            >
                                                {
                                                    item
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div className="nt-filter-group">
                                <label>
                                    Price
                                </label>

                                <div className="nt-price-options">
                                    {PRICE_OPTIONS.map(
                                        (
                                            option
                                        ) => (
                                            <button
                                                key={
                                                    option.value
                                                }
                                                type="button"
                                                className={
                                                    price ===
                                                        option.value
                                                        ? "active"
                                                        : ""
                                                }
                                                onClick={() =>
                                                    setPrice(
                                                        option.value
                                                    )
                                                }
                                            >
                                                {
                                                    option.label
                                                }
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>

                            <div className="nt-filter-group">
                                <button
                                    type="button"
                                    className={
                                        verifiedOnly
                                            ? "nt-verified-toggle active"
                                            : "nt-verified-toggle"
                                    }
                                    onClick={() =>
                                        setVerifiedOnly(
                                            (
                                                current
                                            ) =>
                                                !current
                                        )
                                    }
                                >
                                    <span>
                                        <Check size={14} />
                                    </span>

                                    <div>
                                        <strong>
                                            Verified places
                                        </strong>
                                        <small>
                                            Show trusted
                                            listings only
                                        </small>
                                    </div>
                                </button>
                            </div>

                            <div className="nt-filter-note">
                                <MapPin size={13} />
                                <span>
                                    Place information
                                    comes from the
                                    NiceThings place
                                    directory.
                                </span>
                            </div>
                        </aside>

                        <div className="nt-search-results">
                            {showMap && mapSpot ? (
                                <div className="nt-search-map-wrap nt-search-spot-map-wrap">
                                    <div className="nt-search-map-toolbar">
                                        <button
                                            type="button"
                                            className="nt-search-map-back"
                                            onClick={
                                                closeSpotMap
                                            }
                                        >
                                            ← Back to places
                                        </button>

                                        <div className="nt-search-map-place">
                                            <span>
                                                {mapSpot.location.confidence ===
                                                    "exact"
                                                    ? "Exact location"
                                                    : "Approximate location"}
                                            </span>

                                            <strong>
                                                {
                                                    mapSpot
                                                        .spot
                                                        .name
                                                }
                                            </strong>

                                            <small>
                                                {[
                                                    mapSpot
                                                        .spot
                                                        .neighborhood,
                                                    mapSpot
                                                        .spot
                                                        .city,
                                                ]
                                                    .filter(
                                                        Boolean
                                                    )
                                                    .join(
                                                        ", "
                                                    )}
                                            </small>
                                        </div>
                                    </div>

                                    <SpotMap
                                        latitude={
                                            mapSpot
                                                .location
                                                .latitude
                                        }
                                        longitude={
                                            mapSpot
                                                .location
                                                .longitude
                                        }
                                        spotName={
                                            mapSpot.spot
                                                .name
                                        }
                                        userLatitude={
                                            mapSpot
                                                .userLocation
                                                ?.latitude ??
                                            null
                                        }
                                        userLongitude={
                                            mapSpot
                                                .userLocation
                                                ?.longitude ??
                                            null
                                        }
                                    />
                                </div>
                            ) : showMap &&
                                userLocation ? (
                                <div className="nt-search-map-wrap">
                                    <NearbyMap
                                        latitude={
                                            userLocation.latitude
                                        }
                                        longitude={
                                            userLocation.longitude
                                        }
                                        spots={spots
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
                                                    distanceKm:
                                                        spot.distanceKm,
                                                })
                                            )}
                                        selectedSpotId={
                                            selectedSpotId
                                        }
                                        onSelectSpot={(
                                            spot
                                        ) =>
                                            handleSelectSpot(
                                                spot.id
                                            )
                                        }
                                    />
                                </div>
                            ) : null}

                            {mapSpotError && (
                                <motion.div
                                    className="nt-search-map-error"
                                    initial={{
                                        opacity: 0,
                                        y: 8,
                                    }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                    }}
                                >
                                    <div>
                                        <MapPin size={17} />
                                    </div>

                                    <span>
                                        {mapSpotError}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setMapSpotError(
                                                null
                                            )
                                        }
                                    >
                                        Dismiss
                                    </button>
                                </motion.div>
                            )}

                            {loading ? (
                                <SearchLoadingState />
                            ) : error ? (
                                <SearchErrorState
                                    message={error}
                                    onRetry={() =>
                                        void loadSpots()
                                    }
                                />
                            ) : spots.length === 0 ? (
                                <SearchEmptyState
                                    discoveryMode={
                                        discoveryMode
                                    }
                                    query={query}
                                    onClear={() => {
                                        clearSearch();
                                        clearFilters();
                                        setDiscoveryMode(
                                            "search"
                                        );
                                    }}
                                />
                            ) : (
                                <>
                                    <div
                                        className={
                                            showMap
                                                ? "nt-search-grid nt-search-grid-hidden"
                                                : "nt-search-grid"
                                        }
                                    >
                                        {visibleSpots.map(
                                            (
                                                spot
                                            ) => (
                                                <SearchSpotCard
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
                                                    onSave={() =>
                                                        void toggleSaved(
                                                            spot.id
                                                        )
                                                    }
                                                    onSelect={() =>
                                                        handleSelectSpot(
                                                            spot.id
                                                        )
                                                    }
                                                    onViewMap={() =>
                                                        void viewSpotOnMap(
                                                            spot
                                                        )
                                                    }
                                                    mapLoading={
                                                        mapSpotLoading &&
                                                        selectedSpotId ===
                                                        spot.id
                                                    }
                                                />
                                            )
                                        )}
                                    </div>

                                    {visibleCount <
                                        spots.length && (
                                            <div className="nt-load-more">
                                                <button
                                                    type="button"
                                                    onClick={
                                                        loadMore
                                                    }
                                                    disabled={
                                                        loadingMore
                                                    }
                                                >
                                                    {loadingMore
                                                        ? "Loading..."
                                                        : "Show more places"}

                                                    <ChevronDown
                                                        size={
                                                            16
                                                        }
                                                    />
                                                </button>
                                            </div>
                                        )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        className="nt-filter-sheet"
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
                            className="nt-filter-sheet-backdrop"
                            onClick={() =>
                                setShowFilters(
                                    false
                                )
                            }
                            aria-label="Close filters"
                        />

                        <motion.div
                            className="nt-filter-sheet-panel"
                            initial={{
                                y: "100%",
                            }}
                            animate={{
                                y: 0,
                            }}
                            exit={{
                                y: "100%",
                            }}
                        >
                            <div className="nt-filter-sheet-header">
                                <div>
                                    <span>
                                        Refine discovery
                                    </span>
                                    <strong>
                                        Filters
                                    </strong>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowFilters(
                                            false
                                        )
                                    }
                                    aria-label="Close"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="nt-mobile-filter-content">
                                <label>
                                    Category
                                </label>

                                <select
                                    value={
                                        category
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setCategory(
                                            event.target
                                                .value
                                        )
                                    }
                                >
                                    <option value="all">
                                        All categories
                                    </option>

                                    {CATEGORIES.map(
                                        (item) => (
                                            <option
                                                key={
                                                    item
                                                }
                                                value={
                                                    item
                                                }
                                            >
                                                {
                                                    item
                                                }
                                            </option>
                                        )
                                    )}
                                </select>

                                <label>
                                    Area
                                </label>

                                <select
                                    value={city}
                                    onChange={(
                                        event
                                    ) =>
                                        setCity(
                                            event.target
                                                .value
                                        )
                                    }
                                >
                                    <option value="all">
                                        All cities
                                    </option>

                                    {CITIES.map(
                                        (item) => (
                                            <option
                                                key={
                                                    item
                                                }
                                                value={
                                                    item
                                                }
                                            >
                                                {
                                                    item
                                                }
                                            </option>
                                        )
                                    )}
                                </select>

                                <label>
                                    Price
                                </label>

                                <div className="nt-price-options">
                                    {PRICE_OPTIONS.map(
                                        (
                                            option
                                        ) => (
                                            <button
                                                key={
                                                    option.value
                                                }
                                                type="button"
                                                className={
                                                    price ===
                                                        option.value
                                                        ? "active"
                                                        : ""
                                                }
                                                onClick={() =>
                                                    setPrice(
                                                        option.value
                                                    )
                                                }
                                            >
                                                {
                                                    option.label
                                                }
                                            </button>
                                        )
                                    )}
                                </div>

                                <button
                                    type="button"
                                    className={
                                        verifiedOnly
                                            ? "nt-verified-toggle active"
                                            : "nt-verified-toggle"
                                    }
                                    onClick={() =>
                                        setVerifiedOnly(
                                            (
                                                current
                                            ) =>
                                                !current
                                        )
                                    }
                                >
                                    <span>
                                        <Check size={14} />
                                    </span>

                                    <div>
                                        <strong>
                                            Verified places
                                        </strong>
                                        <small>
                                            Trusted listings
                                            only
                                        </small>
                                    </div>
                                </button>

                                <div className="nt-filter-sheet-actions">
                                    <button
                                        type="button"
                                        onClick={
                                            clearFilters
                                        }
                                        className="nt-filter-sheet-reset"
                                    >
                                        Reset
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowFilters(
                                                false
                                            )
                                        }
                                        className="nt-filter-sheet-apply"
                                    >
                                        Show{" "}
                                        {
                                            spots.length
                                        }{" "}
                                        places
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}

function SearchSpotCard({
    spot,
    saved,
    selected,
    onSave,
    onSelect,
    onViewMap,
    mapLoading,
}: {
    spot: SpotWithPhoto;
    saved: boolean;
    selected: boolean;
    onSave: () => void;
    onSelect: () => void;
    onViewMap: () => void;
    mapLoading: boolean;
}) {
    const href =
        `/spots/${encodeURIComponent(
            spot.slug ?? spot.id
        )}`;

    return (
        <motion.article
            layout
            data-spot-id={spot.id}
            className={[
                "nt-search-spot-card",
                selected ? "selected" : "",
            ]
                .filter(Boolean)
                .join(" ")}
            whileHover={{
                y: -4,
            }}
            transition={{
                duration: 0.2,
            }}
        >
            <div className="nt-search-card-media">
                <Link
                    href={href}
                    className="nt-search-card-image-link"
                    onClick={onSelect}
                >
                    {spot.coverImage ? (
                        <img
                            src={spot.coverImage}
                            alt={spot.name}
                            loading="lazy"
                            className="nt-search-card-image"
                        />
                    ) : (
                        <div className="nt-search-card-image-placeholder">
                            <MapPin size={25} />
                        </div>
                    )}
                </Link>

                <div className="nt-search-card-badges">
                    {spot.featured && (
                        <span className="nt-search-card-featured">
                            Featured
                        </span>
                    )}

                    {spot.verified && (
                        <span className="nt-search-card-verified">
                            <Check size={11} />
                            Verified
                        </span>
                    )}
                </div>

                <button
                    type="button"
                    className={
                        saved
                            ? "nt-search-card-save active"
                            : "nt-search-card-save"
                    }
                    onClick={onSave}
                    aria-label={
                        saved
                            ? `Remove ${spot.name} from saved places`
                            : `Save ${spot.name}`
                    }
                >
                    <Heart
                        size={17}
                        fill={
                            saved
                                ? "currentColor"
                                : "none"
                        }
                    />
                </button>
            </div>

            <div className="nt-search-card-content">
                <div className="nt-search-card-topline">
                    <span className="nt-search-card-category">
                        {spot.category ?? "Place"}
                    </span>

                    {typeof spot.rating ===
                        "number" &&
                        spot.rating > 0 && (
                            <span className="nt-search-card-rating">
                                <Star
                                    size={12}
                                    fill="currentColor"
                                />
                                {spot.rating.toFixed(
                                    1
                                )}
                            </span>
                        )}
                </div>

                <Link
                    href={href}
                    className="nt-search-card-title"
                    onClick={onSelect}
                >
                    {spot.name}
                </Link>

                {(spot.neighborhood ||
                    spot.city) && (
                        <div className="nt-search-card-location">
                            <MapPin size={13} />
                            <span>
                                {[
                                    spot.neighborhood,
                                    spot.city,
                                ]
                                    .filter(Boolean)
                                    .join(
                                        ", "
                                    )}
                            </span>
                        </div>
                    )}

                {spot.description && (
                    <p className="nt-search-card-description">
                        {truncateText(
                            spot.description,
                            105
                        )}
                    </p>
                )}

                <div className="nt-search-card-footer">
                    <div className="nt-search-card-meta">
                        {typeof spot.distanceKm ===
                            "number" && (
                                <span>
                                    <Navigation size={12} />
                                    {formatDistance(
                                        spot.distanceKm
                                    )}
                                </span>
                            )}

                        {getPriceSummary(spot) && (
                            <span>
                                {getPriceSummary(
                                    spot
                                )}
                            </span>
                        )}

                        {typeof spot.review_count ===
                            "number" &&
                            spot.review_count > 0 && (
                                <span>
                                    {
                                        spot.review_count
                                    }{" "}
                                    reviews
                                </span>
                            )}
                    </div>

                    <button
                        type="button"
                        className="nt-search-card-map-button"
                        onClick={onViewMap}
                        disabled={mapLoading}
                        aria-label={`View ${spot.name} on map`}
                    >
                        <MapPin size={13} />
                        <span>
                            {mapLoading
                                ? "Locating…"
                                : "View on map"}
                        </span>
                    </button>

                    <Link
                        href={href}
                        className="nt-search-card-arrow"
                        onClick={onSelect}
                        aria-label={`View ${spot.name}`}
                    >
                        →
                    </Link>
                </div>
            </div>
        </motion.article>
    );
}

function SearchLoadingState() {
    return (
        <div className="nt-search-grid">
            {Array.from({
                length: 6,
            }).map((_, index) => (
                <motion.div
                    key={index}
                    className="nt-search-skeleton-card"
                    initial={{
                        opacity: 0,
                    }}
                    animate={{
                        opacity: 1,
                    }}
                    transition={{
                        delay:
                            index * 0.04,
                    }}
                >
                    <div className="nt-search-skeleton-media" />

                    <div className="nt-search-skeleton-content">
                        <div className="nt-search-skeleton-line small" />
                        <div className="nt-search-skeleton-line title" />
                        <div className="nt-search-skeleton-line" />
                        <div className="nt-search-skeleton-line short" />
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

function SearchErrorState({
    message,
    onRetry,
}: {
    message: string;
    onRetry: () => void;
}) {
    return (
        <motion.div
            className="nt-search-state nt-search-error-state"
            initial={{
                opacity: 0,
                y: 10,
            }}
            animate={{
                opacity: 1,
                y: 0,
            }}
        >
            <div className="nt-search-state-icon">
                <Search size={22} />
            </div>

            <span className="nt-search-state-eyebrow">
                Something went wrong
            </span>

            <h2>
                We couldn't load
                the places.
            </h2>

            <p>{message}</p>

            <button
                type="button"
                onClick={onRetry}
                className="nt-search-state-button"
            >
                Try again
            </button>
        </motion.div>
    );
}

function SearchEmptyState({
    discoveryMode,
    query,
    onClear,
}: {
    discoveryMode: DiscoveryMode;
    query: string;
    onClear: () => void;
}) {
    const title =
        discoveryMode === "nearby"
            ? "Nothing nearby yet."
            : discoveryMode === "area"
                ? "Nothing found in this area."
                : query
                    ? "No places matched."
                    : "Nothing to show yet.";

    const description =
        discoveryMode === "nearby"
            ? "Try expanding your discovery radius or explore another area."
            : discoveryMode === "area"
                ? "Try another town, category, or search term."
                : query
                    ? `We couldn't find a place matching “${query}”. Try a broader search.`
                    : "Try searching for a place, food, experience, or town.";

    return (
        <motion.div
            className="nt-search-state nt-search-empty-state"
            initial={{
                opacity: 0,
                y: 10,
            }}
            animate={{
                opacity: 1,
                y: 0,
            }}
        >
            <div className="nt-search-state-icon">
                <Search size={22} />
            </div>

            <span className="nt-search-state-eyebrow">
                Keep exploring
            </span>

            <h2>{title}</h2>

            <p>{description}</p>

            <button
                type="button"
                onClick={onClear}
                className="nt-search-state-button"
            >
                Start again
            </button>
        </motion.div>
    );
}

function matchesPrice(
    spot: Spot,
    selectedPrice: string
): boolean {
    if (selectedPrice === "any") {
        return true;
    }

    const value =
        spot.average_price ??
        spot.minimum_price ??
        spot.maximum_price;

    if (
        typeof value !== "number" ||
        !Number.isFinite(value)
    ) {
        return true;
    }

    switch (selectedPrice) {
        case "budget":
            return value <= 5000;
        case "mid":
            return (
                value > 5000 &&
                value <= 15000
            );
        case "premium":
            return value > 15000;
        default:
            return true;
    }
}

function sortSpots(
    spots: SpotWithPhoto[],
    sort: SortOption
): SpotWithPhoto[] {
    const result = [...spots];

    switch (sort) {
        case "rating":
            return result.sort(
                (a, b) =>
                    (b.rating ?? 0) -
                    (a.rating ?? 0)
            );

        case "reviews":
            return result.sort(
                (a, b) =>
                    (b.review_count ?? 0) -
                    (a.review_count ?? 0)
            );

        case "price_low":
            return result.sort(
                (a, b) =>
                    getComparablePrice(a) -
                    getComparablePrice(b)
            );

        case "price_high":
            return result.sort(
                (a, b) =>
                    getComparablePrice(b) -
                    getComparablePrice(a)
            );

        case "recommended":
        default:
            return result.sort(
                (a, b) =>
                    recommendationScore(b) -
                    recommendationScore(a)
            );
    }
}

function recommendationScore(
    spot: SpotWithPhoto
): number {
    let score = 0;

    if (spot.featured) score += 30;
    if (spot.verified) score += 20;

    if (
        typeof spot.rating ===
        "number"
    ) {
        score += spot.rating * 8;
    }

    if (
        typeof spot.review_count ===
        "number"
    ) {
        score += Math.min(
            spot.review_count / 10,
            10
        );
    }

    if (
        typeof spot.distanceKm ===
        "number"
    ) {
        score += Math.max(
            0,
            10 - spot.distanceKm
        );
    }

    return score;
}

function getComparablePrice(
    spot: Spot
): number {
    const value =
        spot.average_price ??
        spot.minimum_price ??
        spot.maximum_price;

    if (
        typeof value !== "number" ||
        !Number.isFinite(value)
    ) {
        return Number.MAX_SAFE_INTEGER;
    }

    return value;
}

function getPriceSummary(
    spot: Spot
): string | null {
    const currency =
        spot.currency ?? "FCFA";

    if (
        typeof spot.minimum_price ===
        "number" &&
        typeof spot.maximum_price ===
        "number"
    ) {
        return `${formatMoney(
            spot.minimum_price
        )}–${formatMoney(
            spot.maximum_price
        )} ${currency}`;
    }

    if (
        typeof spot.average_price ===
        "number"
    ) {
        return `≈ ${formatMoney(
            spot.average_price
        )} ${currency}`;
    }

    if (
        typeof spot.minimum_price ===
        "number"
    ) {
        return `From ${formatMoney(
            spot.minimum_price
        )} ${currency}`;
    }

    return null;
}

function formatMoney(
    value: number
): string {
    return new Intl.NumberFormat(
        "en-US",
        {
            maximumFractionDigits: 0,
        }
    ).format(value);
}

function truncateText(
    text: string,
    maximumLength: number
): string {
    const clean =
        text
            .replace(/\s+/g, " ")
            .trim();

    if (
        clean.length <=
        maximumLength
    ) {
        return clean;
    }

    return (
        clean
            .slice(
                0,
                maximumLength
            )
            .trimEnd() + "…"
    );
}

function getSortLabel(
    sort: SortOption
): string {
    switch (sort) {
        case "rating":
            return "Highest rated";
        case "reviews":
            return "Most reviewed";
        case "price_low":
            return "Lowest price";
        case "price_high":
            return "Highest price";
        case "recommended":
        default:
            return "Recommended";
    }
}

export default function SearchPage() {
    return (
        <Suspense
            fallback={
                <main className="nt-search-page">
                    <section className="nt-search-content">
                        <div className="nt-page-container">
                            <SearchLoadingState />
                        </div>
                    </section>
                </main>
            }
        >
            <SearchPageContent />
        </Suspense>
    );
}