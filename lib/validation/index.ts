export function cleanText(
    value: unknown,
    maximum = 5000
) {
    if (
        typeof value !== "string"
    ) {
        return "";
    }

    return value
        .trim()
        .slice(0, maximum);
}

export function isRequired(
    value: unknown
) {
    return (
        typeof value === "string" &&
        value.trim().length > 0
    );
}

export function isValidPhone(
    value: string
) {
    const normalized =
        value.replace(
            /[\s().-]/g,
            ""
        );

    return /^\+?[0-9]{7,15}$/.test(
        normalized
    );
}

export function isValidLatitude(
    value: number
) {
    return (
        Number.isFinite(value) &&
        value >= -90 &&
        value <= 90
    );
}

export function isValidLongitude(
    value: number
) {
    return (
        Number.isFinite(value) &&
        value >= -180 &&
        value <= 180
    );
}

export function isValidCoordinates(
    latitude: number,
    longitude: number
) {
    return (
        isValidLatitude(latitude) &&
        isValidLongitude(longitude)
    );
}