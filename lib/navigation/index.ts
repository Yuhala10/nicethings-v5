export function buildDirectionsUrl(
    latitude: number,
    longitude: number
) {
    return (
        "https://www.google.com/maps/dir/?api=1&destination=" +
        encodeURIComponent(
            `${latitude},${longitude}`
        )
    );
}

export function buildMapsSearchUrl(
    latitude: number,
    longitude: number
) {
    return (
        "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(
            `${latitude},${longitude}`
        )
    );
}

export function openDirections(
    latitude: number,
    longitude: number
) {
    if (
        typeof window === "undefined"
    ) {
        return;
    }

    window.open(
        buildDirectionsUrl(
            latitude,
            longitude
        ),
        "_blank",
        "noopener,noreferrer"
    );
}