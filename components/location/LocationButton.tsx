"use client";

import {
    LoaderCircle,
    LocateFixed,
} from "lucide-react";

import { useState } from "react";

import {
    getCurrentLocation,
} from "../../lib/location";

type LocationButtonProps = {
    onLocation: (
        latitude: number,
        longitude: number
    ) => void;

    compact?: boolean;
};

export default function LocationButton({
    onLocation,
    compact = false,
}: LocationButtonProps) {
    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    async function locate() {
        if (loading) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result =
                await getCurrentLocation();

            onLocation(
                result.latitude,
                result.longitude
            );
        } catch (err) {
            console.error(
                "Location request failed:",
                err
            );

            setError(
                "Unable to determine your location. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="nt-location-control">
            <button
                type="button"
                onClick={locate}
                disabled={loading}
                className={[
                    "nt-location-button",
                    compact
                        ? "compact"
                        : "",
                ]
                    .filter(Boolean)
                    .join(" ")}
            >
                {loading ? (
                    <LoaderCircle
                        size={16}
                        className="nt-spin"
                    />
                ) : (
                    <LocateFixed
                        size={16}
                    />
                )}

                <span>
                    {loading
                        ? "Finding you..."
                        : "Use my location"}
                </span>
            </button>

            {error && (
                <p className="nt-location-error">
                    {error}
                </p>
            )}
        </div>
    );
}