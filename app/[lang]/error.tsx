"use client";

import { useEffect } from "react";
import { CloudOff } from "lucide-react";
import { useLocale } from "@/components/site/LocaleProvider";
import StatusScreen from "@/components/site/StatusScreen";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
    const { t } = useLocale();

    useEffect(() => {
        console.error(error);
    }, [error]);

    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    return (
        <StatusScreen icon={CloudOff} title={t.errors.title} body={offline ? t.errors.network : t.errors.body} onRetry={retry} />
    );
}
