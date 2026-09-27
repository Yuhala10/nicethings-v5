import type { Metadata } from "next";
import { Suspense } from "react";
import MapEntry from "@/components/explore/MapEntry";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function MapEntryPage() {
    return (
        <Suspense>
            <MapEntry />
        </Suspense>
    );
}
