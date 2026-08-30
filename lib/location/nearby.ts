import {
    calculateDistanceKm,
} from "./distance";

export type LocatedSpot = {
    id: string;
    latitude?: number | null;
    longitude?: number | null;
    [key: string]: unknown;
};

export type NearbySpot<
    T extends LocatedSpot
> = T & {
    distanceKm: number;
};

export function findNearbySpots<
    T extends LocatedSpot
>(
    spots: T[],
    userLatitude: number,
    userLongitude: number,
    radiusKm: number
): NearbySpot<T>[] {
    if (
        !Number.isFinite(
            userLatitude
        ) ||
        !Number.isFinite(
            userLongitude
        ) ||
        !Number.isFinite(
            radiusKm
        ) ||
        radiusKm < 0 ||
        userLatitude < -90 ||
        userLatitude > 90 ||
        userLongitude < -180 ||
        userLongitude > 180
    ) {
        return [];
    }

    return spots
        .filter(
            (
                spot
            ): spot is T & {
                latitude: number;
                longitude: number;
            } =>
                typeof spot.latitude ===
                "number" &&
                typeof spot.longitude ===
                "number" &&
                Number.isFinite(
                    spot.latitude
                ) &&
                Number.isFinite(
                    spot.longitude
                ) &&
                spot.latitude >= -90 &&
                spot.latitude <= 90 &&
                spot.longitude >= -180 &&
                spot.longitude <= 180
        )
        .map(
            (
                spot
            ) => ({
                ...spot,

                distanceKm:
                    calculateDistanceKm(
                        {
                            latitude:
                                userLatitude,
                            longitude:
                                userLongitude,
                        },
                        {
                            latitude:
                                spot.latitude,
                            longitude:
                                spot.longitude,
                        }
                    ),
            })
        )
        .filter(
            (
                spot
            ) =>
                spot.distanceKm <=
                radiusKm
        )
        .sort(
            (
                a,
                b
            ) =>
                a.distanceKm -
                b.distanceKm
        );
}