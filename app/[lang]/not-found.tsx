"use client";

import { MapPinOff } from "lucide-react";
import { useLocale } from "@/components/site/LocaleProvider";
import StatusScreen from "@/components/site/StatusScreen";

export default function NotFound() {
    const { t } = useLocale();
    return <StatusScreen icon={MapPinOff} title={t.errors.notFoundTitle} body={t.errors.notFoundBody} />;
}
