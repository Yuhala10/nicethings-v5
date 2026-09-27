"use client";

import type {
    SpotSummary,
} from "../../lib/supabase/types";

import SpotCard from "./SpotCard";

type SpotGridProps = {
    spots: SpotSummary[];

    savedIds?: Set<string>;

    imageMap?: Record<
        string,
        string
    >;

    onSave?: (
        spot: SpotSummary
    ) => void;
};

export default function SpotGrid({
    spots,
    savedIds,
    imageMap = {},
    onSave,
}: SpotGridProps) {
    if (!spots.length) {
        return null;
    }

    return (
        <div className="nt-spot-grid">
            {spots.map((spot) => (
                <SpotCard
                    key={spot.id}
                    spot={spot}
                    imageUrl={
                        imageMap[spot.id] ??
                        null
                    }
                    saved={
                        savedIds?.has(
                            spot.id
                        ) ?? false
                    }
                    onSave={onSave}
                />
            ))}
        </div>
    );
}