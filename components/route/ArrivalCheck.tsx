"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { visitorId } from "../site/Analytics";

type Labels = { ask: string; yes: string; no: string; thanks: string; noted: string; notFound: string };

// On the arrival screen of the guidance. The phone has just measured that
// the visitor stands at the door: one tap from them tells everyone after
// them that the place is really there, or tells the team that it is not.
export default function ArrivalCheck({ slug, position, labels }: { slug: string; position: { lat: number; lng: number }; labels: Labels }) {
    const [answer, setAnswer] = useState<"yes" | "no" | null>(null);

    const send = (url: string, body: Record<string, unknown>) => {
        // Nothing the visitor could do about a failure: the thanks show either way.
        fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(() => {});
    };

    if (answer) {
        return (
            <p className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-sm font-semibold">
                <Check size={16} className="shrink-0 text-open" />
                {answer === "yes" ? labels.thanks : labels.noted}
            </p>
        );
    }

    return (
        <div className="mt-5 rounded-2xl bg-surface-2 p-4">
            <p className="text-sm font-bold">{labels.ask}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                    type="button"
                    className="nt-btn nt-btn-outline h-11 bg-bg px-2 text-sm"
                    onClick={() => {
                        setAnswer("yes");
                        send("/api/arrivals", { slug, v: visitorId(), lat: position.lat, lng: position.lng });
                    }}
                >
                    {labels.yes}
                </button>
                <button
                    type="button"
                    className="nt-btn nt-btn-outline h-11 bg-bg px-2 text-sm"
                    onClick={() => {
                        setAnswer("no");
                        send("/api/reports", { slug, reason: "location", details: labels.notFound });
                    }}
                >
                    {labels.no}
                </button>
            </div>
        </div>
    );
}
