"use client";

import { formatTime } from "@/lib/i18n/format";
import { cityNow } from "@/lib/places/hours";
import { DAY_KEYS, type PlaceHours } from "@/lib/places/types";
import { useNow } from "@/lib/hooks/useNow";
import { useLocale } from "../site/LocaleProvider";
import { OpenBadge } from "./bits";

// Weekly hours with today highlighted (in Yaoundé time).
export default function HoursTable({ hours }: { hours: PlaceHours }) {
    const { locale, t } = useLocale();
    const now = useNow();
    const today = now ? cityNow(now).day : null;

    if (!hours.opens || !hours.closes) return null;
    const range = `${formatTime(hours.opens, locale)} – ${formatTime(hours.closes, locale)}`;

    if (hours.days.length === 7) {
        return (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-text">
                    {t.spot.everyDay} · {range}
                </span>
                <OpenBadge hours={hours} />
            </div>
        );
    }

    return (
        <div>
            <div className="mb-2">
                <OpenBadge hours={hours} />
            </div>
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
