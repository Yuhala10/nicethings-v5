export type Coordinates = {
    latitude: number;
    longitude: number;
};

const EARTH_RADIUS_KM = 6371;

function toRadians(
    degrees: number
): number {
    return (
        degrees *
        (Math.PI / 180)
    );
}

export function calculateDistanceKm(
    from: Coordinates,
    to: Coordinates
): number {
    const latitudeDifference =
        toRadians(
            to.latitude -
            from.latitude
        );

    const longitudeDifference =
        toRadians(
            to.longitude -
            from.longitude
        );

    const latitude1 =
        toRadians(
            from.latitude
        );

    const latitude2 =
        toRadians(
            to.latitude
        );

    const a =
        Math.sin(
            latitudeDifference / 2
        ) ** 2 +
        Math.cos(latitude1) *
        Math.cos(latitude2) *
        Math.sin(
            longitudeDifference / 2
        ) ** 2;

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return (
        EARTH_RADIUS_KM * c
    );
}

export function formatDistance(
    distanceKm: number
): string {
    if (distanceKm < 1) {
        return `${Math.round(
            distanceKm * 1000
        )} m`;
    }

    if (distanceKm < 10) {
        return `${distanceKm.toFixed(
            1
        )} km`;
    }

    return `${Math.round(
        distanceKm
    )} km`;
}