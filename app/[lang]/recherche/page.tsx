import type { Metadata } from "next";
import { Suspense } from "react";
import MapEntry from "@/components/explore/MapEntry";

// Search, in the visitor's city (and the old search URL, query kept).
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function SearchPage() {
    return (
        <Suspense>
            <MapEntry target="search" />
        </Suspense>
    );
}
