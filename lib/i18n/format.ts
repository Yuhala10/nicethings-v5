import { CITY_TIME_ZONE, type Locale } from "./config";

// Cameroonian usage in both languages: "10 000 FCFA" (space-grouped),
// 24-hour clock ("14h30" in French, "14:30" in English).

export function formatNumber(value: number, locale: Locale) {
    return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", {
        maximumFractionDigits: 0,
        useGrouping: true,
    })
        .format(value)
        .replace(/[  ,]/g, locale === "fr" ? " " : ",");
}

export function formatPrice(value: number, locale: Locale) {
    return `${formatNumber(value, locale)} FCFA`;
}

// Short form for map pins and chips: 3500 → "3,5k", 12000 → "12k".
export function formatPriceShort(value: number, locale: Locale) {
    if (value < 1000) return String(value);
    const thousands = value / 1000;
    const text = Number.isInteger(thousands) ? String(thousands) : thousands.toFixed(1);
    return `${locale === "fr" ? text.replace(".", ",") : text}k`;
}

export function formatPriceRange(
    min: number | null | undefined,
    max: number | null | undefined,
    locale: Locale
) {
    if (min && max && min !== max) {
        return `${formatNumber(min, locale)}–${formatNumber(max, locale)} FCFA`;
    }
    const single = min || max;
    return single ? formatPrice(single, locale) : null;
}

// "14:30:00" → "14h30" (fr) / "14:30" (en)
export function formatTime(time: string, locale: Locale) {
    const [hours, minutes] = time.split(":");
    const h = String(Number(hours));
    if (locale === "fr") return minutes === "00" ? `${h}h` : `${h}h${minutes}`;
    return `${h}:${minutes}`;
}

export function formatClock(date: Date, locale: Locale) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: CITY_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);
    return formatTime(parts, locale);
}

export function formatDistance(meters: number, locale: Locale) {
    if (meters < 950) return `${Math.max(50, Math.round(meters / 50) * 50)} m`;
    const km = meters / 1000;
    const text = km < 10 ? km.toFixed(1) : String(Math.round(km));
    return `${locale === "fr" ? text.replace(".", ",") : text} km`;
}

export function formatDuration(seconds: number, locale: Locale) {
    const minutes = Math.max(1, Math.round(seconds / 60));
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = String(minutes % 60).padStart(2, "0");
    return locale === "fr" ? `${h} h ${m}` : `${h} h ${m}`;
}

export function formatRelativeDays(dateIso: string, locale: Locale, now = new Date()) {
    const days = Math.floor((now.getTime() - new Date(dateIso).getTime()) / 86_400_000);
    const rtf = new Intl.RelativeTimeFormat(locale === "fr" ? "fr" : "en", { numeric: "auto" });
    if (days < 1) return rtf.format(0, "day");
    if (days < 30) return rtf.format(-days, "day");
    if (days < 365) return rtf.format(-Math.round(days / 30), "month");
    return rtf.format(-Math.round(days / 365), "year");
}
