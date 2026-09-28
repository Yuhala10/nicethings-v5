"use client";

import { use } from "react";
import PlaceEditor from "@/components/admin/PlaceEditor";

export default function EditPlacePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <PlaceEditor id={id} />;
}
