"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { handleProblem, normalizeHandle, type HandleProblem } from "@/lib/people/rules";
import type { PeopleWords } from "@/lib/i18n/people";

export type HandleState = "empty" | "checking" | "free" | HandleProblem | "closed" | "failed";

// The @name, checked while it is typed: free, taken (with free names close
// to it to tap), or not allowed.
export default function HandleField({
    value,
    onChange,
    onState,
    words,
    area,
    autoFocus = false,
}: {
    value: string;
    onChange: (value: string) => void;
    onState: (state: HandleState) => void;
    words: PeopleWords;
    area?: string | null;
    autoFocus?: boolean;
}) {
    const [state, setState] = useState<HandleState>("empty");
    const [suggestions, setSuggestions] = useState<string[]>([]);

    useEffect(() => {
        const report = (next: HandleState) => {
            setState(next);
            onState(next);
        };
        if (!value) return report("empty");
        const local = handleProblem(value);
        if (local) {
            setSuggestions([]);
            return report(local);
        }
        report("checking");
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                const response = await fetch(`/api/handles?h=${encodeURIComponent(value)}${area ? `&area=${encodeURIComponent(area)}` : ""}`, { signal: controller.signal });
                const answer = (await response.json()) as { ok?: boolean; why?: string; problem?: HandleProblem | null; suggestions?: string[] };
                if (!answer.ok) return report(answer.why === "closed" ? "closed" : "failed");
                setSuggestions(answer.suggestions ?? []);
                report(answer.problem ?? "free");
            } catch (error) {
                if ((error as Error).name !== "AbortError") report("failed");
            }
        }, 380);
        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
        // onState is the parent's setter; the check depends on the name only.
    }, [value, area]);

    const t = words.handle;
    const message =
        state === "checking" ? t.checking : state === "free" ? t.free : state === "taken" ? t.taken : state === "reserved" ? t.reserved : state === "short" ? t.short : state === "format" ? t.format : state === "closed" ? words.common.closed : state === "failed" ? words.common.failed : t.hint;
    const good = state === "free";
    const bad = state === "taken" || state === "reserved" || state === "format" || state === "closed" || state === "failed";

    return (
        <div>
            <label htmlFor="nt-handle" className="mb-2 block text-[0.875rem] font-semibold">
                {t.label}
            </label>
            <div className={`flex h-[3.25rem] items-center rounded-[0.9rem] border-[1.5px] bg-surface px-3.5 transition-colors ${good ? "border-open" : bad ? "border-closed" : "border-line-strong focus-within:border-text-2"}`}>
                <span className="text-[1.125rem] font-semibold text-muted">@</span>
                <input
                    id="nt-handle"
                    value={value}
                    autoFocus={autoFocus}
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="username"
                    spellCheck={false}
                    maxLength={20}
                    onChange={(event) => onChange(normalizeHandle(event.target.value))}
                    className="min-w-0 flex-1 bg-transparent pl-0.5 text-[1.125rem] font-semibold text-text outline-none"
                />
                {state === "checking" && <Loader2 size={18} className="animate-spin text-muted" />}
                {good && <Check size={19} className="text-open" />}
            </div>
            <p role="status" className={`mt-2 text-[0.75rem] leading-relaxed ${good ? "font-semibold text-open" : bad ? "font-semibold text-closed" : "text-muted"}`}>
                {message}
            </p>
            {(state === "taken" || state === "reserved") && suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {suggestions.map((idea) => (
                        <button key={idea} type="button" onClick={() => onChange(idea)} className="nt-chip h-9 text-[0.875rem]">
                            @{idea}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
