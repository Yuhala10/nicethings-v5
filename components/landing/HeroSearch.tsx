"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LocateFixed, Search } from "lucide-react";
import { startGeo } from "@/lib/hooks/useGeo";
import { paths } from "@/lib/places/paths";
import { INTENT_ICONS, INTENT_ORDER } from "../explore/intents";
import { useLocale } from "../site/LocaleProvider";

// The home search: one field whose placeholder types out real requests the
// search understands, then the moods people reach for most. Everything
// leads to the search page; the map comes after a place is chosen.
export default function HeroSearch() {
    const { locale, t } = useLocale();
    const router = useRouter();
    const [value, setValue] = useState("");
    const [hint, setHint] = useState("");

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setHint(t.landing.searchExamples[0]);
            return;
        }
        let example = 0;
        let length = 0;
        let deleting = false;
        let timer: number;
        const tick = () => {
            const text = t.landing.searchExamples[example];
            length += deleting ? -1 : 1;
            setHint(text.slice(0, length));
            let delay = deleting ? 22 : 55;
            if (!deleting && length === text.length) {
                deleting = true;
                delay = 1800;
            } else if (deleting && length === 0) {
                deleting = false;
                example = (example + 1) % t.landing.searchExamples.length;
                delay = 350;
            }
            timer = window.setTimeout(tick, delay);
        };
        timer = window.setTimeout(tick, 600);
        return () => window.clearTimeout(timer);
    }, [t]);

    const searchHref = (params: string) => `${paths.searchEntry(locale)}${params ? `?${params}` : ""}`;

    return (
        <div className="w-full">
            <form
                role="search"
                onSubmit={(event) => {
                    event.preventDefault();
                    const query = value.trim();
                    router.push(searchHref(query ? `q=${encodeURIComponent(query)}` : ""));
                }}
                className="max-w-xl"
            >
                <div className="flex items-center rounded-[1.15rem] border border-line-strong bg-surface p-1.5 pl-4 shadow-card transition-[border-color,box-shadow] duration-200 focus-within:border-text-2 focus-within:shadow-float">
                    <Search size={19} className="shrink-0 text-muted" />
                    <input
                        type="search"
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        placeholder={hint || t.search.shortPlaceholder}
                        aria-label={t.search.shortPlaceholder}
                        enterKeyHint="search"
                        autoComplete="off"
                        className="h-12 min-w-0 flex-1 bg-transparent px-3 text-base text-text outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
                    />
                    <button type="submit" className="nt-btn nt-btn-primary h-12 shrink-0 rounded-[0.85rem] px-4" aria-label={t.search.submit}>
                        <span className="hidden sm:inline">{t.search.submit}</span>
                        <ArrowRight size={18} />
                    </button>
                </div>
            </form>

            <ul className="nt-scroll-x -mx-4 mt-4 gap-2 px-4 md:mx-0 md:flex-wrap md:px-0">
                <li className="shrink-0">
                    <button
                        type="button"
                        onClick={() => {
                            startGeo();
                            router.push(searchHref(""));
                        }}
                        className="nt-chip"
                    >
                        <LocateFixed size={15} className="text-brand-600" />
                        {t.landing.aroundMe}
                    </button>
                </li>
                {INTENT_ORDER.map((key) => {
                    const Icon = INTENT_ICONS[key];
                    return (
                        <li key={key} className="shrink-0">
                            <Link href={searchHref(`i=${key}`)} prefetch={false} className="nt-chip">
                                <Icon size={15} strokeWidth={1.9} />
                                {t.intents[key]}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
