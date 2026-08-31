export type SpotLocationInput = {
    name?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
};

export type ResolvedSpotLocation = {
    latitude: number;
    longitude: number;
    source: "GPS" | "GEOCODED";
    confidence: "exact" | "high" | "medium" | "low";
    precision:
    | "gps"
    | "poi"
    | "address"
    | "street"
    | "neighborhood"
    | "city"
    | "area";
    displayName?: string | null;
    formattedAddress?: string | null;
    matchedFeatureType?: string | null;
    query?: string | null;
    matchScore?: number | null;
};

function validCoordinate(
    latitude: unknown,
    longitude: unknown
): boolean {
    return (
        typeof latitude === "number" &&
        typeof longitude === "number" &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );
}

/**
 * Resolve a NiceThings place to a destination coordinate.
 *
 * Priority:
 * 1. Coordinates stored on the place itself.
 * 2. Server-side Mapbox search using:
 *    - place name
 *    - address
 *    - neighborhood
 *    - city
 *    - visitor GPS only as proximity
 *
 * IMPORTANT:
 * The visitor's GPS is NEVER treated as the place's
 * destination unless those coordinates are already stored
 * on the place object.
 */
export async function resolveSpotLocation(
    spot: SpotLocationInput,
    userLocation?: {
        latitude: number;
        longitude: number;
    } | null
): Promise<ResolvedSpotLocation | null> {
    /*
     * Existing place GPS always wins.
     */
    if (
        validCoordinate(
            spot.latitude,
            spot.longitude
        )
    ) {
        return {
            latitude:
                spot.latitude as number,
            longitude:
                spot.longitude as number,
            source: "GPS",
            confidence: "exact",
            precision: "gps",
            displayName:
                spot.name ?? null,
            formattedAddress:
                [spot.address, spot.neighborhood, spot.city]
                    .filter(Boolean)
                    .join(", ") || null,
            matchedFeatureType: "stored-gps",
            query: null,
            matchScore: 100,
        };
    }

    /*
     * Build the server-side request.
     *
     * Note the explicit proximity field names.
     * These are ONLY a search hint for Mapbox.
     */
    const response = await fetch(
        "/api/geocode",
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/json",
            },
            body: JSON.stringify({
                name:
                    spot.name ?? null,
                neighborhood:
                    spot.neighborhood ?? null,
                city:
                    spot.city ?? null,
                address:
                    spot.address ?? null,
                proximityLatitude:
                    userLocation?.latitude ??
                    null,
                proximityLongitude:
                    userLocation?.longitude ??
                    null,
            }),
            cache: "no-store",
        }
    );

    if (!response.ok) {
        console.warn(
            "NiceThings geocode request failed:",
            response.status
        );
        return null;
    }

    const data =
        (await response.json()) as {
            found?: boolean;
            location?: {
                latitude: number;
                longitude: number;
                source?: "GEOCODED";
                confidence?:
                | "high"
                | "medium"
                | "low";
                precision?:
                | "poi"
                | "address"
                | "street"
                | "neighborhood"
                | "city"
                | "area";
                displayName?: string | null;
                formattedAddress?: string | null;
                matchedFeatureType?: string | null;
                query?: string | null;
                matchScore?: number | null;
            } | null;
        };

    if (
        data.found !== true ||
        !data.location
    ) {
        return null;
    }

    if (
        !validCoordinate(
            data.location.latitude,
            data.location.longitude
        )
    ) {
        return null;
    }

    return {
        latitude:
            data.location.latitude,
        longitude:
            data.location.longitude,
        source: "GEOCODED",
        confidence:
            data.location.confidence ??
            "medium",
        precision:
            data.location.precision ??
            "area",
        displayName:
            data.location.displayName ??
            null,
        formattedAddress:
            data.location.formattedAddress ??
            null,
        matchedFeatureType:
            data.location.matchedFeatureType ??
            null,
        query:
            data.location.query ??
            null,
        matchScore:
            data.location.matchScore ??
            null,
    };
}
