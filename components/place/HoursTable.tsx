"use client";

import { formatTime } from "@/lib/i18n/format";
import { cityNow } from "@/lib/places/hours";
import { DAY_KEYS, type PlaceHours } from "@/lib/places/types";
import { useNow } from "@/lib/hooks/useNow";
import { useLocale } from "../site/LocaleProvider";
// Weekly hours with today highlighted (in Yaoundé time). Whether the place
// is open right now is said once, at the top of the page.
export default function HoursTable({ hours }: { hours: PlaceHours }) {
    const { locale, t } = useLocale();
    const now = useNow();
    const today = now ? cityNow(now).day : null;

    if (!hours.opens || !hours.closes) return null;
    const range = `${formatTime(hours.opens, locale)} – ${formatTime(hours.closes, locale)}`;

    if (hours.days.length === 7) {
        return (
            <p className="text-sm font-semibold text-text">
                {t.spot.everyDay} · {range}
            </p>
        );
    }

    return (
        <div>
            <ul className="divide-y divide-line text-sm">
                {DAY_KEYS.map((day) => {
                    const open = hours.days.includes(day);
                    const isToday = day === today;
                    return (
                        <li
                            key={day}
                            className={`flex justify-between py-1.5 ${isToday ? "font-bold text-text" : "text-text-2"}`}
                            aria-current={isToday ? "date" : undefined}
                        >
                            <span className="capitalize">
                                {t.days[day]}
                                {isToday && <span className="ml-1.5 text-xs font-bold text-brand-600">· {t.spot.today}</span>}
                            </span>
                            <span className={open ? "" : "text-muted"}>{open ? range : t.spot.closedDay}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
