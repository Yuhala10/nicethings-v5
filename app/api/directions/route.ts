import { NextRequest, NextResponse } from "next/server";

function validCoordinate(
    value: unknown
): value is number {
    return (
        typeof value === "number" &&
        Number.isFinite(value)
    );
}

export async function POST(
    request: NextRequest
) {
    try {
        const token =
            process.env.MAPBOX_ACCESS_TOKEN;

        if (!token) {
            return NextResponse.json(
                {
                    found: false,
                    error:
                        "MAPBOX_ACCESS_TOKEN is not configured.",
                },
                {
                    status: 503,
                }
            );
        }

        const body = (await request.json()) as {
            from?: {
                latitude?: number;
                longitude?: number;
            };
            to?: {
                latitude?: number;
                longitude?: number;
            };
        };

        const fromLatitude =
            body.from?.latitude;

        const fromLongitude =
            body.from?.longitude;

        const toLatitude =
            body.to?.latitude;

        const toLongitude =
            body.to?.longitude;

        if (
            !validCoordinate(fromLatitude) ||
            !validCoordinate(fromLongitude) ||
            !validCoordinate(toLatitude) ||
            !validCoordinate(toLongitude)
        ) {
            return NextResponse.json(
                {
                    found: false,
                    error:
                        "Invalid route coordinates.",
                },
                {
                    status: 400,
                }
            );
        }

        const coordinates =
            `${fromLongitude},${fromLatitude};${toLongitude},${toLatitude}`;

        const params =
            new URLSearchParams({
                access_token:
                    token,

                geometries:
                    "geojson",

                overview:
                    "full",

                steps:
                    "false",
            });

        const response =
            await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?${params.toString()}`,
                {
                    method: "GET",
                    cache: "no-store",
                }
            );

        if (!response.ok) {
            const errorText =
                await response.text();

            console.error(
                "Mapbox Directions failed:",
                response.status,
                errorText
            );

            return NextResponse.json(
                {
                    found: false,
                    error:
                        "Unable to calculate the route.",
                },
                {
                    status: response.status,
                }
            );
        }

        const data =
            (await response.json()) as {
                routes?: Array<{
                    distance?: number;
                    duration?: number;

                    geometry?: {
                        type?: string;
                        coordinates?: Array<
                            [
                                number,
                                number
                            ]
                        >;
                    };
                }>;
            };

        const route =
            data.routes?.[0];

        const routeCoordinates =
            route?.geometry
                ?.coordinates;

        if (
            !route ||
            !Array.isArray(
                routeCoordinates
            ) ||
            routeCoordinates.length < 2
        ) {
            return NextResponse.json({
                found: false,
                error:
                    "No drivable route was found.",
            });
        }

        return NextResponse.json({
            found: true,

            route: {
                coordinates:
                    routeCoordinates,

                distanceMeters:
                    route.distance ??
                    null,

                durationSeconds:
                    route.duration ??
                    null,
            },
        });
    } catch (error) {
        console.error(
            "NiceThings directions error:",
            error
        );

        return NextResponse.json(
            {
                found: false,
                error:
                    "Unable to calculate directions right now.",
            },
            {
                status: 500,
            }
        );
    }
}