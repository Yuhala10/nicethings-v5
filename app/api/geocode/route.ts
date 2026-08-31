import { NextRequest, NextResponse } from "next/server";

type GeocodeRequest = {
    name?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    address?: string | null;

    proximityLatitude?: number | null;
    proximityLongitude?: number | null;
};

type MapboxFeature = {
    id?: string;
    relevance?: number;
    properties?: {
        name?: string;
        name_preferred?: string;
        full_address?: string;
        place_formatted?: string;
        feature_type?: string;

        context?: Record<
            string,
            {
                name?: string;
            }
        >;
    };

    geometry?: {
        coordinates?: [
            number,
            number
        ];
    };
};

type MapboxResponse = {
    features?: MapboxFeature[];
};

type Candidate = {
    feature: MapboxFeature;
    query: string;
    score: number;
    distanceKm: number | null;
};

function clean(value?: string | null) {
    return (
        value
            ?.trim()
            .replace(/\s+/g, " ") || ""
    );
}

function normalize(value?: string | null) {
    return clean(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /[^a-z0-9\s]/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function validCoordinate(
    value: unknown
): value is number {
    return (
        typeof value === "number" &&
        Number.isFinite(value)
    );
}

function validCoordinates(
    latitude: unknown,
    longitude: unknown
) {
    return (
        validCoordinate(latitude) &&
        validCoordinate(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );
}

function haversineDistanceKm(
    latitude1: number,
    longitude1: number,
    latitude2: number,
    longitude2: number
) {
    const earthRadiusKm =
        6371;

    const lat1 =
        (latitude1 * Math.PI) /
        180;

    const lat2 =
        (latitude2 * Math.PI) /
        180;

    const deltaLat =
        ((latitude2 -
            latitude1) *
            Math.PI) /
        180;

    const deltaLng =
        ((longitude2 -
            longitude1) *
            Math.PI) /
        180;

    const a =
        Math.sin(
            deltaLat / 2
        ) **
        2 +
        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(
            deltaLng / 2
        ) **
        2;

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return (
        earthRadiusKm * c
    );
}

function similarity(
    expected: string,
    actual: string
) {
    const a =
        normalize(expected);

    const b =
        normalize(actual);

    if (!a || !b) {
        return 0;
    }

    if (a === b) {
        return 1;
    }

    if (
        a.includes(b) ||
        b.includes(a)
    ) {
        return 0.9;
    }

    const expectedWords =
        new Set(
            a
                .split(" ")
                .filter(Boolean)
        );

    const actualWords =
        new Set(
            b
                .split(" ")
                .filter(Boolean)
        );

    if (
        !expectedWords.size
    ) {
        return 0;
    }

    let matches = 0;

    for (
        const word of expectedWords
    ) {
        if (
            actualWords.has(
                word
            )
        ) {
            matches += 1;
        }
    }

    return (
        matches /
        expectedWords.size
    );
}

function featureType(
    feature: MapboxFeature
) {
    return (
        feature.properties
            ?.feature_type ||
        ""
    ).toLowerCase();
}

function featureName(
    feature: MapboxFeature
) {
    const properties =
        feature.properties ??
        {};

    return (
        properties.name_preferred ||
        properties.name ||
        ""
    );
}

function featureText(
    feature: MapboxFeature
) {
    const properties =
        feature.properties ??
        {};

    const context =
        properties.context ??
        {};

    return [
        properties.name,
        properties.name_preferred,
        properties.full_address,
        properties.place_formatted,

        context.country?.name,
        context.region?.name,
        context.district?.name,
        context.place?.name,
        context.locality?.name,
        context.neighborhood?.name,
        context.street?.name,
    ]
        .filter(Boolean)
        .join(" ");
}

function contextNames(
    feature: MapboxFeature
) {
    const context =
        feature.properties
            ?.context ??
        {};

    return [
        context.country?.name,
        context.region?.name,
        context.district?.name,
        context.place?.name,
        context.locality?.name,
        context.neighborhood?.name,
        context.street?.name,
    ]
        .filter(Boolean)
        .map(
            (value) =>
                normalize(value)
        );
}

function buildQueries(
    input: GeocodeRequest
) {
    const name =
        clean(input.name);

    const address =
        clean(input.address);

    const neighborhood =
        clean(
            input.neighborhood
        );

    const city =
        clean(input.city);

    const queries: string[] =
        [];

    /*
     * NAME FIRST
     *
     * Important for restaurants,
     * hotels, schools, shops, etc.
     */
    if (
        name &&
        address &&
        neighborhood &&
        city
    ) {
        queries.push(
            `${name}, ${address}, ${neighborhood}, ${city}, Cameroon`
        );
    }

    if (
        name &&
        neighborhood &&
        city
    ) {
        queries.push(
            `${name}, ${neighborhood}, ${city}, Cameroon`
        );
    }

    if (
        name &&
        address &&
        city
    ) {
        queries.push(
            `${name}, ${address}, ${city}, Cameroon`
        );
    }

    if (
        name &&
        city
    ) {
        queries.push(
            `${name}, ${city}, Cameroon`
        );
    }

    if (name) {
        queries.push(
            `${name}, Cameroon`
        );
    }

    /*
     * ADDRESS
     */
    if (
        address &&
        neighborhood &&
        city
    ) {
        queries.push(
            `${address}, ${neighborhood}, ${city}, Cameroon`
        );
    }

    if (
        address &&
        city
    ) {
        queries.push(
            `${address}, ${city}, Cameroon`
        );
    }

    if (address) {
        queries.push(
            `${address}, Cameroon`
        );
    }

    /*
     * NEIGHBORHOOD
     */
    if (
        neighborhood &&
        city
    ) {
        queries.push(
            `${neighborhood}, ${city}, Cameroon`
        );
    }

    if (neighborhood) {
        queries.push(
            `${neighborhood}, Cameroon`
        );
    }

    /*
     * CITY LAST
     */
    if (city) {
        queries.push(
            `${city}, Cameroon`
        );
    }

    return Array.from(
        new Set(queries)
    );
}

function scoreCandidate(
    feature: MapboxFeature,
    input: GeocodeRequest,
    query: string
) {
    const type =
        featureType(feature);

    const name =
        featureName(feature);

    const text =
        normalize(
            featureText(feature)
        );

    const requestedName =
        normalize(input.name);

    const requestedArea =
        normalize(
            input.neighborhood
        );

    const requestedAddress =
        normalize(
            input.address
        );

    const requestedCity =
        normalize(input.city);

    let score = 0;

    /*
     * Mapbox relevance.
     */
    if (
        typeof feature.relevance ===
        "number"
    ) {
        score +=
            feature.relevance *
            45;
    }

    /*
     * NAME
     */
    if (
        requestedName &&
        name
    ) {
        score +=
            similarity(
                requestedName,
                name
            ) * 55;
    }

    /*
     * ADDRESS
     */
    if (
        requestedAddress
    ) {
        if (
            text.includes(
                requestedAddress
            )
        ) {
            score += 35;
        } else {
            const words =
                requestedAddress
                    .split(" ")
                    .filter(
                        (
                            word
                        ) =>
                            word.length >
                            2
                    );

            if (
                words.length
            ) {
                const matches =
                    words.filter(
                        (
                            word
                        ) =>
                            text.includes(
                                word
                            )
                    ).length;

                score +=
                    (
                        matches /
                        words.length
                    ) * 25;
            }
        }
    }

    /*
     * AREA
     */
    if (
        requestedArea
    ) {
        const contexts =
            contextNames(
                feature
            );

        const areaMatches =
            contexts.some(
                (
                    context
                ) =>
                    context ===
                    requestedArea ||
                    context.includes(
                        requestedArea
                    ) ||
                    requestedArea.includes(
                        context
                    )
            );

        if (
            areaMatches
        ) {
            score += 42;
        } else if (
            text.includes(
                requestedArea
            )
        ) {
            score += 25;
        }
    }

    /*
     * CITY
     */
    if (
        requestedCity &&
        text.includes(
            requestedCity
        )
    ) {
        score += 30;
    }

    /*
     * Precision
     */
    switch (type) {
        case "address":
            score += 32;
            break;

        case "street":
            score += 24;
            break;

        case "neighborhood":
            score += 22;
            break;

        case "locality":
            score += 20;
            break;

        case "place":
            score += 10;
            break;

        case "district":
            score += 8;
            break;
    }

    /*
     * Penalize only a generic city result
     * when we have strong location clues.
     */
    if (
        type === "place" &&
        (
            requestedName ||
            requestedAddress ||
            requestedArea
        )
    ) {
        score -= 30;
    }

    /*
     * Query alignment.
     */
    const q =
        normalize(query);

    if (
        requestedName &&
        q.includes(
            requestedName
        )
    ) {
        score += 5;
    }

    if (
        requestedArea &&
        q.includes(
            requestedArea
        )
    ) {
        score += 5;
    }

    if (
        requestedAddress &&
        q.includes(
            requestedAddress
        )
    ) {
        score += 5;
    }

    return score;
}

function confidenceFor(
    feature: MapboxFeature,
    score: number
):
    | "high"
    | "medium"
    | "low" {
    const type =
        featureType(feature);

    if (
        type === "address" &&
        score >= 85
    ) {
        return "high";
    }

    if (
        score >= 85
    ) {
        return "high";
    }

    if (
        score >= 55
    ) {
        return "medium";
    }

    return "low";
}

function precisionFor(
    feature: MapboxFeature
):
    | "poi"
    | "address"
    | "street"
    | "neighborhood"
    | "city"
    | "area" {
    const type =
        featureType(feature);

    if (
        type === "address"
    ) {
        return "address";
    }

    if (
        type === "street"
    ) {
        return "street";
    }

    if (
        type === "neighborhood" ||
        type === "locality"
    ) {
        return "neighborhood";
    }

    if (
        type === "place" ||
        type === "district"
    ) {
        return "city";
    }

    /*
     * Mapbox's current v6 feature list
     * doesn't require "poi" as a feature
     * type, so unknown specific features
     * are treated as area-level.
     */
    return "area";
}

export async function POST(
    request: NextRequest
) {
    try {
        const token =
            process.env
                .MAPBOX_ACCESS_TOKEN;

        if (!token) {
            return NextResponse.json(
                {
                    found: false,
                    location: null,
                    error:
                        "MAPBOX_ACCESS_TOKEN is not configured.",
                },
                {
                    status: 503,
                }
            );
        }

        const body =
            (await request.json()) as
            GeocodeRequest;

        const input: GeocodeRequest =
        {
            name:
                clean(body.name),

            neighborhood:
                clean(
                    body.neighborhood
                ),

            city:
                clean(body.city),

            address:
                clean(body.address),

            proximityLatitude:
                body.proximityLatitude,

            proximityLongitude:
                body.proximityLongitude,
        };

        const queries =
            buildQueries(input);

        if (!queries.length) {
            return NextResponse.json(
                {
                    found: false,
                    location: null,
                },
                {
                    status: 400,
                }
            );
        }

        const candidates: Candidate[] =
            [];

        const hasProximity =
            validCoordinates(
                input.proximityLatitude,
                input.proximityLongitude
            );

        /*
         * Query several combinations so
         * one weak query doesn't decide
         * everything.
         */
        for (
            const query of queries
        ) {
            const params =
                new URLSearchParams();

            params.set(
                "q",
                query
            );

            params.set(
                "access_token",
                token
            );

            params.set(
                "country",
                "cm"
            );

            params.set(
                "language",
                "en"
            );

            params.set(
                "limit",
                "10"
            );

            params.set(
                "autocomplete",
                "false"
            );

            /*
             * Visitor GPS is ONLY a proximity
             * bias.
             */
            if (
                hasProximity
            ) {
                params.set(
                    "proximity",
                    `${input.proximityLongitude},${input.proximityLatitude}`
                );
            }

            try {
                const response =
                    await fetch(
                        `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`,
                        {
                            method:
                                "GET",

                            cache:
                                "no-store",
                        }
                    );

                if (
                    !response.ok
                ) {
                    console.warn(
                        "Mapbox query failed:",
                        response.status,
                        query
                    );

                    continue;
                }

                const data =
                    (await response.json()) as
                    MapboxResponse;

                for (
                    const feature of
                    data.features ?? []
                ) {
                    const coordinates =
                        feature.geometry
                            ?.coordinates;

                    if (
                        !coordinates ||
                        coordinates.length <
                        2
                    ) {
                        continue;
                    }

                    const [
                        longitude,
                        latitude,
                    ] =
                        coordinates;

                    if (
                        !validCoordinates(
                            latitude,
                            longitude
                        )
                    ) {
                        continue;
                    }

                    const distanceKm =
                        hasProximity
                            ? haversineDistanceKm(
                                input.proximityLatitude as number,
                                input.proximityLongitude as number,
                                latitude,
                                longitude
                            )
                            : null;

                    let score =
                        scoreCandidate(
                            feature,
                            input,
                            query
                        );

                    /*
                     * A very distant result should
                     * lose priority when we know
                     * where the visitor is.
                     */
                    if (
                        distanceKm !== null
                    ) {
                        if (
                            distanceKm <=
                            2
                        ) {
                            score +=
                                22;
                        } else if (
                            distanceKm <=
                            5
                        ) {
                            score +=
                                15;
                        } else if (
                            distanceKm <=
                            15
                        ) {
                            score +=
                                8;
                        } else if (
                            distanceKm <=
                            40
                        ) {
                            score -=
                                5;
                        } else {
                            score -=
                                20;
                        }
                    }

                    candidates.push({
                        feature,
                        query,
                        score,
                        distanceKm,
                    });
                }
            } catch (
            error
            ) {
                console.warn(
                    "Mapbox request error:",
                    query,
                    error
                );
            }
        }

        /*
         * Deduplicate.
         */
        const unique =
            new Map<
                string,
                Candidate
            >();

        for (
            const candidate of
            candidates
        ) {
            const coordinates =
                candidate.feature
                    .geometry
                    ?.coordinates;

            const key =
                candidate.feature.id ??
                [
                    coordinates?.[0],
                    coordinates?.[1],
                    featureName(
                        candidate.feature
                    ),
                ].join("|");

            const existing =
                unique.get(key);

            if (
                !existing ||
                candidate.score >
                existing.score
            ) {
                unique.set(
                    key,
                    candidate
                );
            }
        }

        const ranked =
            [...unique.values()]
                .sort(
                    (a, b) =>
                        b.score -
                        a.score
                );

        if (
            !ranked.length
        ) {
            console.info(
                "Mapbox returned no usable candidates:",
                input
            );

            return NextResponse.json({
                found: false,
                location: null,
            });
        }

        /*
         * First choice: strongest result.
         */
        const best =
            ranked[0];

        const coordinates =
            best.feature
                .geometry
                ?.coordinates;

        if (
            !coordinates ||
            coordinates.length <
            2
        ) {
            return NextResponse.json({
                found: false,
                location: null,
            });
        }

        const [
            longitude,
            latitude,
        ] = coordinates;

        /*
         * We deliberately do NOT require a
         * high score here.
         *
         * NiceThings is designed for local
         * places that may only have an area,
         * street or locality available.
         *
         * We still reject an absurdly generic
         * country-level result.
         */
        const type =
            featureType(
                best.feature
            );

        if (
            type === "country"
        ) {
            return NextResponse.json({
                found: false,
                location: null,
            });
        }

        const properties =
            best.feature
                .properties ??
            {};

        const confidence =
            confidenceFor(
                best.feature,
                best.score
            );

        return NextResponse.json({
            found: true,

            location: {
                latitude,
                longitude,

                source:
                    "GEOCODED",

                confidence,

                precision:
                    precisionFor(
                        best.feature
                    ),

                displayName:
                    properties
                        .name_preferred ||
                    properties.name ||
                    null,

                formattedAddress:
                    properties
                        .full_address ||
                    properties
                        .place_formatted ||
                    null,

                matchedFeatureType:
                    type || null,

                query:
                    best.query,

                matchScore:
                    Math.round(
                        best.score
                    ),

                distanceFromUserKm:
                    best.distanceKm,
            },
        });
    } catch (
    error
    ) {
        console.error(
            "NiceThings geocoding error:",
            error
        );

        return NextResponse.json(
            {
                found: false,
                location: null,
                error:
                    "Unable to resolve this location right now.",
            },
            {
                status: 500,
            }
        );
    }
}
