export type UserLocation = {
    latitude: number;
    longitude: number;
    accuracy: number;
    capturedAt: number;
};

export type LocationErrorCode =
    | "UNSUPPORTED"
    | "PERMISSION_DENIED"
    | "POSITION_UNAVAILABLE"
    | "TIMEOUT"
    | "UNKNOWN";

export class LocationError extends Error {
    code: LocationErrorCode;

    constructor(
        message: string,
        code: LocationErrorCode
    ) {
        super(message);
        this.name = "LocationError";
        this.code = code;
    }
}

const DEFAULT_OPTIONS: PositionOptions = {
    enableHighAccuracy: true,
    maximumAge: 30_000,
    timeout: 15_000,
};

export function isLocationSupported(): boolean {
    return (
        typeof window !== "undefined" &&
        "geolocation" in navigator
    );
}

export async function getCurrentLocation(
    options: PositionOptions = {}
): Promise<UserLocation> {
    if (!isLocationSupported()) {
        throw new LocationError(
            "Location is not supported on this device.",
            "UNSUPPORTED"
        );
    }

    return new Promise(
        (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude:
                            position.coords.latitude,

                        longitude:
                            position.coords.longitude,

                        accuracy:
                            position.coords.accuracy,

                        capturedAt:
                            Date.now(),
                    });
                },

                (error) => {
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            reject(
                                new LocationError(
                                    "Location permission was denied.",
                                    "PERMISSION_DENIED"
                                )
                            );
                            break;

                        case error.POSITION_UNAVAILABLE:
                            reject(
                                new LocationError(
                                    "Your location is currently unavailable.",
                                    "POSITION_UNAVAILABLE"
                                )
                            );
                            break;

                        case error.TIMEOUT:
                            reject(
                                new LocationError(
                                    "Location request timed out.",
                                    "TIMEOUT"
                                )
                            );
                            break;

                        default:
                            reject(
                                new LocationError(
                                    "Unable to determine your location.",
                                    "UNKNOWN"
                                )
                            );
                    }
                },

                {
                    ...DEFAULT_OPTIONS,
                    ...options,
                }
            );
        }
    );
}

export function isUsableLocation(
    location: UserLocation,
    maximumAccuracy = 500
): boolean {
    return (
        Number.isFinite(
            location.latitude
        ) &&
        Number.isFinite(
            location.longitude
        ) &&
        Number.isFinite(
            location.accuracy
        ) &&
        location.latitude >= -90 &&
        location.latitude <= 90 &&
        location.longitude >= -180 &&
        location.longitude <= 180 &&
        location.accuracy >= 0 &&
        location.accuracy <= maximumAccuracy
    );
}

export function formatAccuracy(
    accuracy: number
): string {
    if (accuracy < 10) {
        return "Very accurate";
    }

    if (accuracy < 50) {
        return "Accurate";
    }

    if (accuracy < 150) {
        return "Approximate";
    }

    return "Low accuracy";
}