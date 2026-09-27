"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LocateFixed, Search } from "lucide-react";
import { startGeo } from "@/lib/hooks/useGeo";
import { paths } from "@/lib/places/paths";
import { useLocale } from "../site/LocaleProvider";

// The big search on the landing page. Its placeholder types out real
// requests the Concierge understands, so people see what they can ask.
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

    return (
        <div className="w-full max-w-xl">
            <form
                role="search"
                onSubmit={(event) => {
                    event.preventDefault();
                    router.push(paths.map(locale, value.trim() || undefined));
                }}
                className="group relative"
            >
                <div className="nt-sunset pointer-events-none absolute -inset-[1.5px] rounded-[1.4rem] opacity-60 blur-[2px] transition group-focus-within:opacity-100" />
                <div className="relative flex items-center rounded-[1.35rem] bg-white p-1.5 pl-4 shadow-[0_20px_60px_-15px_rgba(255,91,54,0.5)]">
                    <Search size={20} className="shrink-0 text-brand-500" />
                    <input
                        type="search"
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        placeholder={hint || t.search.shortPlaceholder}
                        aria-label={t.search.shortPlaceholder}
                        enterKeyHint="search"
                        autoComplete="off"
                        className="h-12 min-w-0 flex-1 bg-transparent px-3 text-base text-[#17120e] outline-none placeholder:text-[#8a7b6e] [&::-webkit-search-cancel-button]:hidden"
                    />
                    <button type="submit" className="nt-btn nt-btn-primary h-12 shrink-0 rounded-[1.05rem] px-4" aria-label={t.search.submit}>
                        <span className="hidden sm:inline">{t.search.submit}</span>
                        <ArrowRight size={19} />
                    </button>
                </div>
            </form>
            <button
                type="button"
                onClick={() => {
                    startGeo();
                    router.push(paths.map(locale));
                }}
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-white/85 transition hover:text-white"
            >
                <LocateFixed size={16} className="text-brand-400" />
                {t.landing.aroundMe}
            </button>
        </div>
    );
}
