"use client";

import { useEffect, useState } from "react";

// Current time, only on the client (null during server render) and
// refreshed every minute, so time-based labels never come from a cached
// page and never cause hydration mismatches.
export function useNow(intervalMs = 60_000) {
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- time only exists on the client
        setNow(new Date());
        const id = window.setInterval(() => setNow(new Date()), intervalMs);
        return () => window.clearInterval(id);
    }, [intervalMs]);

    return now;
}
